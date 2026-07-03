# 잡트렌드 (JobTrend) 기술명세서 v9.3
> 최종 업데이트: 2026-07-04
> 본 문서는 실제 배포된 코드베이스를 기준으로 작성된 사실 기반 명세서이다.

---

## 1. 프로젝트 개요

**잡트렌드**는 취업준비생을 위한 AI 기반 취업 지원 플랫폼이다. 고용24 공공 데이터로 채용 트렌드를 모니터링하고, 사용자의 경험을 STAR 구조로 채굴해 스토리뱅크에 저장하며, 이를 AI 모의면접·자소서 분석·공고별 맞춤 자소서 생성에 재활용한다.

### 해결하는 문제
- **정보 비대칭**: 구직자가 실시간 공채 흐름을 한눈에 파악할 도구 부재
- **경험 자산화 부재**: 면접·자소서마다 같은 경험을 반복해서 새로 쓰는 비효율
- **면접 준비 도구 부재**: 기업용 AI 면접 도구는 상용화됐지만 구직자용은 공백

### 핵심 가치
1. **RAG 기반 개인화 코칭** — YouTube 취업 코칭 영상에서 추출한 원칙 카드 35개를 pgvector 코사인 검색으로 실시간 조회, AI 피드백·자소서 진단의 근거로 주입
2. **스토리뱅크 시스템** — 10개 슬롯 × 6개 모듈로 경험을 채굴·저장하고 면접 힌트·자소서 초안에 재사용
3. **공고별 맞춤 자소서** — 모집공고를 붙여넣으면 RAG + GPT가 개인 스토리 기반 자소서 초안 생성

---

## 2. 기술 스택

| 레이어 | 기술 | 비고 |
|--------|------|------|
| 프론트엔드 | React 18 + Vite 5 + TypeScript + TailwindCSS | SPA, Vercel 정적 배포 |
| 서버리스 함수 | Vercel Serverless Functions | Hobby 플랜 **12개 한도** (현재 12개 전부 사용) |
| 데이터베이스 | Neon (Serverless PostgreSQL) | `@neondatabase/serverless` tagged-template 쿼리 |
| 벡터 검색 | pgvector 0.8.1 | `vector(1536)`, 코사인 연산자 `<=>` |
| LLM | OpenAI API | gpt-4.1-mini / gpt-4.1-nano / text-embedding-3-small |
| 인증 | Supabase Auth | Google OAuth + Kakao OAuth |
| 외부 데이터 | 고용24 Open API | 공채속보(210L21) / 공채기업정보(210L31) / 채용행사(210L11) |
| 스케줄러 | Vercel Cron | 뉴스 수집 배치 (`api/cron/collect-news.ts`, CRON_SECRET 보호) |
| 개발 도구 | Claude Code | 구현·리팩토링·배포 자동화 |

> **주의**: MCP(Notion, Google Drive 등) 연동은 없다. 서비스 내 LLM은 OpenAI 단독이다 (초기 기획의 Claude API·사람인·잡코리아 API는 고용24 + OpenAI로 대체됨).

---

## 3. 아키텍처

```
[브라우저 — React SPA]
  ├─ Supabase Auth (Google/Kakao OAuth)
  ├─ apiFetch → /api/* (x-user-id 헤더 첨부)
  └─ 라우트:
       /            트렌드 대시보드 (= /news)
       /companies/:name  기업 정보
       /job-fairs   채용행사 캘린더
       /login, /auth/callback  인증
       /interview, /interview/:sessionId  AI 모의면접  [로그인 필수]
       /story-bank  스토리뱅크                        [로그인 필수]
       /mypage      마이페이지                        [로그인 필수]

[Vercel Functions — 12개]
   1. api/trends/index.ts               트렌드 데이터 + AI 인사이트
   2. api/news/[id]/summary.ts          공고 요약 (GPT)
   3. api/companies/[name].ts           기업 정보 + 공고 목록
   4. api/job-fairs/index.ts            채용행사 목록
   5. api/bookmarks/index.ts            즐겨찾기 GET/POST/DELETE
   6. api/interview/start.ts            면접 세션 시작 + 세션 목록 GET
   7. api/interview/answer.ts           답변 제출 + RAG 피드백
   8. api/interview/[sessionId]/summary.ts  세션 결과 요약
   9. api/story-bank/index.ts           채굴/편집/업그레이드/버전 CRUD (?mode= 분기)
  10. api/cover-letter/index.ts         RAG 자소서 분석
  11. api/credits/balance.ts            크레딧 잔액
  12. api/cron/collect-news.ts          고용24 수집 크론

[Neon DB — 13개 테이블]
  users, recruitment_news, company_info, job_fairs,
  company_alerts, daily_digests, interview_sessions,
  credit_transactions, story_mining_sessions, story_cards,
  bookmarks, knowledge_chunks(pgvector), story_bank_versions
```

**12개 함수 한도 대응 전략**: 새 기능은 새 엔드포인트 대신 기존 함수에 쿼리 파라미터로 분기한다. 예: `api/story-bank/index.ts` 하나가 `?mode=edit`(카드 수정), `?mode=upgrade`(AI 업그레이드), `?mode=version`(버전 CRUD), `?active=1`(세션 재개), `?versions=1`(버전 목록), skip(건너뛰기)을 모두 처리.

---

## 4. 인증 시스템

### 4.1 로그인 방식 (src/context/AuthContext.tsx, src/pages/LoginPage.tsx)
- **Supabase OAuth 2종**: `signInWithOAuth({ provider: "google" | "kakao" })` → `/auth/callback` 리다이렉트
- **게스트 모드**: 비로그인 사용자는 `crypto.randomUUID()`로 생성한 UUID를 `jobtrend_user_id` localStorage 키에 저장해 사용. 로그인하면 Supabase UUID로 교체됨
- **API 인증**: 모든 API 요청에 `x-user-id` 헤더 첨부 → `server/auth.ts`의 `requireUser()`가 users 행을 조회·자동 생성

### 4.2 인앱 브라우저 자동 탈출 (LoginPage)
Google OAuth는 WebView에서 `403 disallowed_useragent`로 차단되므로, 인앱 브라우저 감지 시 페이지 진입 즉시 시스템 브라우저로 자동 이동시킨다:

| 환경 | 탈출 방법 |
|------|----------|
| 카카오톡 | `kakaotalk://web/openExternal?url=` 공식 스킴 |
| 라인 | `?openExternalBrowser=1` 쿼리 파라미터 |
| Android 인앱 (인스타·페북·네이버 등) | `intent://...#Intent;scheme=https;package=com.android.chrome;end` |
| iOS 인앱 | `x-safari-https://` 스킴 (iOS 17+) |

WebView 감지: UA 패턴 (`KAKAOTALK|NAVER|Instagram|FBAN|FBAV|Line/|MicroMessenger|wv)`) + Android `wv` 플래그 + iOS Safari 부재 검사.

### 4.3 접근 제어
- `PrivateRoute` 컴포넌트: `/interview`, `/interview/:sessionId`, `/story-bank`, `/mypage` 보호
- 크레딧: 신규 사용자 기본 3개, `credit_transactions` 테이블에 증감 기록

---

## 5. RAG 시스템 (상세)

### 5.1 개요
YouTube 취업 코칭 영상 스크립트에서 GPT로 "원칙 카드"를 1회성 추출·임베딩해 저장하고, 런타임에는 사용자 입력을 임베딩해 코사인 유사도 검색으로 관련 원칙만 프롬프트에 주입한다. 전체 코퍼스를 매번 보내는 대신 원칙 몇 개(수백 토큰)만 보내는 것이 토큰 비용 절감의 핵심이다.

### 5.2 지식 베이스 현황
- **35개 원칙 카드** (면접팁 21개 + 자소서팁 14개)
- 원본: `knowledge/raw/*.txt` — YouTube 스크립트 3개 파일
  - 「면접 및 자기소개서 서류전형 팁」
  - 「면접관이 끄덕이는 1분 자기소개」
  - 샘플(키워드 전략)

### 5.3 인제스트 파이프라인 (db/ingest-knowledge.ts — `npx tsx`로 수동 실행)

```
knowledge/raw/*.txt
  ↓ ① parseRawFile() — 두 포맷 자동 인식
      · 헤더 방식: title: / url: / category: + 본문
      · YouTube 내보내기: "제목 - YouTube" / URL / "Transcript:" / (00:00) 타임스탬프
  ↓ ② extractCards() — gpt-4.1-mini로 원칙 카드 추출 (파일당 5~15개)
      추출 필드:
      · claim: 원칙 한 문장 (명령형, 50자 이내)
      · why: 근거/이유
      · example: 적용 예시
      · stage: 자소서작성 | 면접준비 | 면접당일
      · question_types: [자기소개, 지원동기, 갈등해결, ...]
      · category: 면접팁 | 자소서팁 | 이력서팁 (헤더 지정 시 고정, 아니면 GPT 판정)
  ↓ ③ text-embedding-3-small 임베딩 (1536차원)
      임베딩 원문 = claim + why + example 합본 (content 컬럼)
  ↓ ④ knowledge_chunks INSERT
```

### 5.4 스키마 (knowledge_chunks)

```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE TABLE knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_title VARCHAR(255) NOT NULL,
  source_url TEXT,
  category VARCHAR(20) NOT NULL,        -- 면접팁 | 자소서팁 | 이력서팁
  stage VARCHAR(20),                    -- 자소서작성 | 면접준비 | 면접당일
  question_types TEXT[] DEFAULT '{}',
  claim TEXT NOT NULL,                  -- 원칙 한 문장
  why TEXT,                             -- 근거
  example TEXT,                         -- 적용 예시
  content TEXT NOT NULL,                -- 임베딩 원문 (claim+why+example)
  embedding vector(1536),               -- text-embedding-3-small
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 5.5 런타임 검색 (server/knowledge.ts)

```typescript
searchKnowledge(query, { category?, limit? = 3 }): Promise<KnowledgeHit[]>
// ① 쿼리를 text-embedding-3-small로 임베딩 (1회 호출)
// ② Neon에서 코사인 거리 정렬 검색:
//    SELECT claim, why, example, ..., 1 - (embedding <=> $vec) AS similarity
//    FROM knowledge_chunks
//    WHERE ($category IS NULL OR category = $category)
//    ORDER BY embedding <=> $vec  LIMIT $limit
// ③ 실패/키 없음/DB 없음 → 빈 배열 (best-effort, 기능은 계속 동작)

principlesToPrompt(hits): string
// "다음은 검증된 면접/자소서 코칭 원칙입니다..." 헤더 +
// "1. {claim} (이유: {why})" 목록으로 프롬프트 블록 생성
```

### 5.6 RAG 적용 지점 (4곳)

| 기능 | 검색 쿼리 | 주입 방식 |
|------|----------|----------|
| AI 면접 피드백 `evaluateAnswer()` | 질문+답변 텍스트, limit 3 | 시스템 프롬프트 상단에 원칙 주입 → 구체성·직무연관성·논리성 평가 |
| 자소서 분석 `analyzeCoverLetter()` | "자기소개서 …" (자소서팁 카테고리 우선 4개 + 일반 4개 → 상위 5개) | 섹션별 진단 기준·적용 원칙으로 활용 |
| 공고별 버전 생성 `generateVersionContent()` | 회사명+지원동기+직무역량, limit 5 | 자소서 4섹션 생성 가이드 |
| 스토리 답변 업그레이드 `upgradeStoryAnswers()` | "STAR 자기소개서 면접 스토리 {슬롯명}", limit 4 | STAR 개선 코칭 원칙으로 주입 |

> **참고**: F4 면접 중 스토리 힌트(`findStoryHint`)는 임베딩이 아닌 한국어 토큰 오버랩(2자 이상 토큰 + 부분 포함 0.5점) 방식이다. 임베딩 검색 전환은 향후 과제.

---

## 6. LLM 호출 명세 (전체 프롬프트 인벤토리)

모든 호출은 `server/claude.ts`의 `callOpenAI(system, user, model, maxTokens)`를 경유한다. OPENAI_API_KEY 부재 시 모든 함수는 목(mock) 응답으로 폴백한다.

| # | 함수 | 모델 | max_tokens | 프롬프트 요지 | 응답 형식 |
|---|------|------|-----------|--------------|----------|
| 1 | `generateInterviewQuestions` | gpt-4.1-mini | 1024 | 페르소나 시스템 프롬프트 + "JD/이력서 기반 면접 질문 N개 생성" | `["질문1", ...]` |
| 2 | `evaluateAnswer` | gpt-4.1-mini | 1024 | RAG 원칙 + "구체성·직무연관성·논리성 기준 평가" | `{strengths[], improvements[], quickTip}` |
| 3 | `analyzeCoverLetter` (초기) | gpt-4.1-mini | 2000 | RAG 원칙 + 섹션 분류·점수·문제점·꼬리질문 생성 | `{overallScore, sections[], followUpQuestions[]}` |
| 3′ | `analyzeCoverLetter` (개선본) | gpt-4.1-mini | 3500 | 위와 동일 + 꼬리질문 답변 → 섹션별 개선본(300~600자) | 동일 + `improved` 채움 |
| 4 | `generateVersionContent` | gpt-4.1-mini | 1024 | 모집공고 + 스토리카드 요약 + RAG 원칙 → 4섹션 자소서 | `{intro, motivation, competency, growth}` |
| 5 | `upgradeStoryAnswers` (단일) | gpt-4.1-mini | 800 | "STAR 구조로 구체화, **사실 창작 금지**" | `["개선된 답변"]` |
| 5′ | `upgradeStoryAnswers` (전체) | gpt-4.1-mini | 2000 | 슬롯 전체 Q&A 일괄 개선 | `["답1", "답2", ...]` |
| 6 | 트렌드 인사이트 (api/trends) | gpt-4.1-nano | 300 | 7일 공채 수치 → 사실/해석/액션 3문장 (각 50자 이내), 필터별 일 1회 캐시 | 텍스트 |
| 7 | 원칙 카드 추출 (db/ingest) | gpt-4.1-mini | — | 스크립트 → 원칙 카드 5~15개 추출 (인제스트 시 1회) | `{category, cards[]}` |
| 8 | 쿼리/문서 임베딩 | text-embedding-3-small | — | RAG 검색·인제스트 | `vector(1536)` |

**환각 방지 장치**: 업그레이드 프롬프트에 "지원자가 언급하지 않은 사실을 추가하거나 수치를 창작하지 마세요" 명시 + 프론트에서 실행 전 환각 경고 확인 다이얼로그(진행/진행 안함) + 예상 토큰량 표시(단일 1,000~1,500 / 전체 3,000~4,000).

---

## 7. 기능 명세

### F1 — 채용 트렌드 대시보드 (`/`, `/news`)
- 고용24 공채속보 실시간 필터: 업종(IT·SW/제조/금융/공공기관/유통·서비스) × 규모(대기업/중견/중소/공공) × 고용형태(정규직/기간제/계약직/인턴) × 키워드 검색
- 최근 7일 공채 등록 추이 라인 차트
- **AI 트렌드 인사이트**: gpt-4.1-nano 3문장 요약, 필터별 일 1회 캐시
- 공고 카드: 공고 요약 보기(GPT) / 원문 보기(외부 링크) / 모의면접 바로가기 / ☆ 즐겨찾기 토글
- 우상단 "★ 저장한 공고 (N)" 버튼으로 즐겨찾기 필터

### F2 — 채용행사 캘린더 (`/job-fairs`)
- 고용24 채용박람회·구인구직 만남의날 일정
- 지역 뱃지, 기간, 장소, 참여기업, 문의 전화 표시

### F3 — 기업 정보 (`/companies/:name`)
- 고용24 공채기업정보 + 해당 기업의 공채속보 목록

### F4 — AI 모의면접 (`/interview`)

**페르소나 12종 — 두 그룹에서 각 1개씩 선택 (최소 1개 필수, 그룹당 최대 1개)**:

| 기관/업종별 (6) | 면접 스타일별 (6) |
|----------------|------------------|
| startup 스타트업 | newcomer 신입친화형 |
| enterprise 대기업 임원 | stress 압박 면접 |
| public 공공기관 | competency 역량구조화 (STAR 강제) |
| finance 금융권 | culture 컬처핏 |
| tech 테크니컬 | case 케이스인터뷰 |
| global 외국계/글로벌 | career 커리어패스 |

- 두 그룹 모두 선택 시 `"startup|stress"` 형태로 결합 → `buildPersonaSystem()`이 두 시스템 프롬프트를 병합해 복합 면접관 생성
- UI: 기관/업종은 초록 테두리, 스타일은 보라 테두리로 구분

**세션 흐름**:
1. JD(필수) + 이력서(선택) + 페르소나 입력 → 크레딧 1개 차감 → GPT 질문 5개 생성
2. 질문마다 **스토리 힌트**: 스토리뱅크 카드와 토큰 오버랩 매칭 → 관련 경험 스니펫 표시
3. 답변 제출 → RAG 원칙 검색 → GPT 평가 → 강점/보완점/quickTip 즉시 반환
4. 완료 → 평균 점수 + 종합 강점/보완점 요약
- **우측 사이드바**: 과거 면접 세션 목록(스크롤) — 클릭 시 해당 JD 재사용해 바로 재응시. 접힘 상태는 localStorage(`jobtrend_interview_sidebar`) 유지
- 시작 실패 시 사용자에게 에러 메시지 표시 (무음 실패 방지)

### F5 — 스토리뱅크 (`/story-bank`) — 3탭

**탭 1: 자소서 분석** (기본 탭)
- 자소서 원문 + 모집공고(선택, 저장한 공고 원클릭 입력) → RAG 분석
- 종합 점수 + 섹션별(자기소개/지원동기/직무역량/성장계획) 점수·문제점·적용 원칙
- 꼬리질문 3~5개 → 답변 후 "개선본 생성" → **BEFORE/AFTER 좌우 비교 뷰**

**탭 2: 공고별 버전**
- 새 버전: 이름 + 회사명 + **직무 분야**(마케팅/인사·HR/IT·개발/영업/기획/재무·회계/디자인/기타) + 모집공고 → RAG + 스토리카드 기반 4섹션 초안 자동 생성
- 직무 분야는 `story_content._category` 키로 저장 (DB 스키마 변경 없이 JSONB 활용)
- 카테고리 필터 칩으로 버전 분류·조회
- 섹션별 편집기: 자기소개 600자 / 지원동기 600자 / 직무역량 500자 / 성장계획 400자 — 실시간 글자수, 초과 시 빨간 경고
- 버전 목록·저장·삭제 CRUD

**탭 3: 스토리 채굴**
- **개요 그리드**: 10개 슬롯(S01 입문·전환 ~ S10 미래연결) 2열 카드 + 진행률 바
  - 슬롯마다 6개 모듈 점(situation/friction/action/result_quant/result_qual/reflection) 시각화
  - 완성(초록)/부분 채굴 %(노랑)/미채굴(점선) 상태 구분
- **채굴 세션**: 채팅 UI. 규칙 기반 엔진(`server/storyMining.ts`)이 LLM 없이 답변에서 모듈 충족을 정규식으로 감지, 미충족 모듈만 팔로업 질문 (슬롯당 최대 3회, 모듈당 1회 재질문 후 강제 수용 — 무한루프 방지)
  - 추상 답변 감지 시 "구체적인 순간 하나만" 재질문
  - **건너뛰기** 버튼: 답 못하는 슬롯은 넘기고 나중에 편집 가능
  - transcript JSONB 자동 저장 → 새로고침/재방문 시 이어서 진행
- **편집 뷰** (슬롯 클릭):
  - 슬롯별 사전 정의 질문 6개(오프닝+모듈 팔로업)가 Q1~Q6로 미리 표시, 기존 답변 pre-fill
  - 항목별 "✨ AI" 버튼 + 하단 "✨ 전체 AI 업그레이드" 버튼
  - 실행 전 확인 다이얼로그: **환각 경고 + 예상 토큰량** 표시 → 진행/진행 안함
  - 업그레이드 결과는 텍스트에어리어에 반영 → 사용자가 검토·수정 후 저장

**북마크 사이드바**: 우상단 "📌 저장한 공고" 토글 — 자소서 분석·버전 생성에 공고 원클릭 입력

### 마이페이지 (`/mypage`) — 4섹션 대시보드
| 섹션 | 내용 |
|------|------|
| 📌 저장한 공고 | 즐겨찾기 목록 (마감일 표시) |
| 🎤 AI 면접 기록 | 페르소나 필터 칩 + 세션별 점수, 클릭 시 Q&A 전체 펼침 |
| 📖 스토리뱅크 | 진행률 바 + 카드 그리드 |
| 🎪 채용행사 | 저장한 행사 일정 |

---

## 8. 데이터베이스 스키마 (13개 테이블)

| 테이블 | 용도 | 핵심 컬럼 |
|--------|------|----------|
| `users` | 계정·크레딧·플랜 | interview_credits(기본3), plan_tier |
| `recruitment_news` | 고용24 공채속보 | external_id UNIQUE, employment_types TEXT[], closing_at |
| `company_info` | 고용24 기업정보 | intro_summary, homepage |
| `job_fairs` | 고용24 채용행사 | event_name, start_date, area, event_place |
| `company_alerts` | 기업 알림 설정 | (레거시, UI 미노출) |
| `daily_digests` | 데일리 요약 | (레거시, UI 미노출) |
| `interview_sessions` | 면접 세션 | persona_type, questions_json, answers_json, feedback_json |
| `credit_transactions` | 크레딧 증감 이력 | type, amount, balance_after |
| `story_mining_sessions` | 채굴 세션 | slot_index, slot_state JSONB, transcript JSONB |
| `story_cards` | 완료 슬롯 카드 | slot_id, raw_answers JSONB, modules_filled JSONB |
| `bookmarks` | 즐겨찾기 | UNIQUE(user_id, news_id) |
| `knowledge_chunks` | RAG 원칙 카드 | embedding vector(1536), category |
| `story_bank_versions` | 공고별 자소서 버전 | story_content JSONB (섹션 + _category) |

> v1 시절 테이블(job_postings, keyword_alerts 등)은 참조하는 코드가 없는 고아 상태로, 파괴적 마이그레이션을 피해 그대로 두었다.

---

## 9. API 명세 (주요 엔드포인트)

### POST `/api/interview/start`
```
Body: { jdText, resumeText?, industryPersona?, stylePersona?, persona? }
→ 두 페르소나를 "startup|stress"로 결합 (하위호환: persona 단독도 지원)
Response: { sessionId, questions[], creditsRemaining }
GET → 사용자의 과거 세션 목록
```

### POST `/api/story-bank` (단일 함수 다중 분기)
```
Body {}                          → 채굴 세션 시작
Body { sessionId, answer }       → 답변 진행
Body { sessionId, skip: true }   → 현재 슬롯 건너뛰기
?mode=edit    { cardId, rawAnswers }                          → 카드 답변 수정
?mode=upgrade { slotName, questions, answers, targetIndex? }  → AI 업그레이드
?mode=version { action: create|update|delete, ... }           → 버전 CRUD
GET ?active=1   → 진행 중 세션 + transcript (재개용)
GET ?versions=1 → 버전 목록
GET             → 스토리 카드 목록
```

### POST `/api/cover-letter`
```
Body: { coverLetterText, jobPostingText?, followUpAnswers? }
1차 요청 → sections(진단) + followUpQuestions, improved=""
2차 요청(followUpAnswers 포함) → improved 채워서 반환
```

---

## 10. 프론트엔드 구조

```
src/
  pages/
    TrendDashboardPage.tsx    F1 (즐겨찾기 포함)
    JobFairCalendarPage.tsx   F2
    CompanyPage.tsx           F3
    InterviewPage.tsx         F4 시작 (12 페르소나 2그룹 + 과거 세션 사이드바)
    InterviewSessionPage.tsx  F4 진행 (스토리 힌트)
    StoryMiningPage.tsx       F5 (3탭: 분석/버전/채굴 + 편집/업그레이드)
    MyPage.tsx                4섹션 대시보드
    LoginPage.tsx             Google/Kakao + 인앱 브라우저 자동 탈출
    AuthCallbackPage.tsx      OAuth 콜백
  components/
    common/NavBar.tsx         트렌드/채용행사/AI면접/스토리뱅크 + 아바타
    common/PrivateRoute.tsx
    feature/ChatBubble.tsx
  context/
    AuthContext.tsx           Supabase 세션 + 게스트 UUID
    CreditContext.tsx         크레딧 잔액 (델타 반영)
  api/
    client.ts                 apiFetch (x-user-id 헤더)
    endpoints.ts              전체 API 함수

server/  (Vercel Functions가 공유하는 서버 라이브러리)
  claude.ts        모든 OpenAI 호출 + 페르소나 + 프롬프트
  knowledge.ts     RAG 검색 (searchKnowledge/principlesToPrompt)
  storyMining.ts   채굴 엔진 (규칙 기반, 슬롯 템플릿·모듈 감지·스토리 힌트)
  auth.ts          x-user-id → users 행 해석
  db.ts / dbTypes.ts / neonBackend.ts / mockBackend.ts  DB 추상화 (Neon/목 전환)
  normalizers.ts   고용24 응답 → DB 행 매핑
  respond.ts       에러 핸들링 래퍼

db/
  schema.sql            전체 DDL
  ingest-knowledge.ts   RAG 인제스트 스크립트 (수동 실행)
  seed.ts               초기 데이터
```

---

## 11. 환경변수

```
DATABASE_URL=            # Neon 연결 문자열 (pooled)
WORK24_API_KEY=          # 고용24 Open API 키
OPENAI_API_KEY=          # gpt-4.1-mini/nano + text-embedding-3-small
CRON_SECRET=             # 크론 엔드포인트 보호
VITE_SUPABASE_URL=       # Supabase 프로젝트 URL
VITE_SUPABASE_ANON_KEY=  # Supabase publishable key
```

---

## 12. 운영 제약사항

| 항목 | 제약 | 대응 |
|------|------|------|
| Vercel Hobby Functions | 12개 한도 | `?mode=` 파라미터 분기로 함수 재사용 |
| Google OAuth in WebView | 403 disallowed_useragent | 인앱 브라우저 자동 탈출 (§4.2) |
| 공고 원문 크롤링 | 불가 (공고 플랫폼이 전부 SPA) | 원문은 외부 링크로 제공, 요약은 제목·메타 기반 |
| OpenAI 응답 잘림 | max_tokens 부족 시 JSON 파싱 실패 | 기능별 max_tokens 차등 (§6) + 코드펜스 제거 + 폴백 응답 |
| LLM 환각 | 스토리 업그레이드 시 사실 왜곡 위험 | 프롬프트 창작 금지 규칙 + 사용자 확인 다이얼로그 + 저장 전 검토 |
| RAG 폴백 | 임베딩/DB 실패 | 빈 원칙으로 계속 진행 (기능 중단 없음) |

---

## 13. 향후 개선 후보

1. **스토리 힌트 RAG 전환**: 토큰 오버랩 → 임베딩 코사인 검색
2. **지식 베이스 확장**: 원칙 카드 35개 → 카테고리별 확충 (이력서팁 0개)
3. **공고별 버전 ↔ 면접 연결**: 버전 선택 후 바로 해당 공고로 AI 면접 시작
4. **기업별 자소서 글자수 제한 자동 파싱**
5. **알림 기능 활성화**: company_alerts/daily_digests 테이블은 있으나 UI 미구현
