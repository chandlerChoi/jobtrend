# 잡트렌드 (JobTrend) 기술명세서 v8.0
> 최종 업데이트: 2026-07-03

---

## 1. 프로젝트 개요

**잡트렌드**는 취업준비생을 위한 AI 기반 취업 지원 플랫폼으로, 채용 트렌드 모니터링부터 스토리뱅크 채굴, AI 모의면접, 자기소개서 분석까지 취업 준비의 전 과정을 지원한다.

### 핵심 가치
- **RAG 기반 개인화**: YouTube 취업 코칭 영상에서 추출한 원칙 카드(35개)를 pgvector 코사인 검색으로 실시간 검색해 피드백/자소서 품질을 향상
- **스토리뱅크 시스템**: 사용자 경험을 STAR 구조로 채굴·저장하고 면접·자소서에 재활용
- **공고별 맞춤 자소서**: 모집공고를 붙여넣으면 RAG + GPT가 개인 스토리 기반 자소서 초안 생성

---

## 2. 기술 스택

| 레이어 | 기술 |
|--------|------|
| 프론트엔드 | React 18 + Vite + TypeScript + TailwindCSS |
| 서버리스 함수 | Vercel Serverless Functions (Hobby: **12개 한도**) |
| 데이터베이스 | Neon (Serverless PostgreSQL) + pgvector 0.8.1 |
| AI | OpenAI gpt-4.1-mini (질문 생성·피드백·원칙 추출·자소서 분석), gpt-4.1-nano (트렌드 인사이트), text-embedding-3-small (RAG 임베딩) |
| 인증 | Supabase Auth (Google OAuth만 지원) |
| 외부 API | 고용24 Open API (채용행사/공채속보/공채기업정보) |

---

## 3. 아키텍처

```
[브라우저]
  └─ React SPA (Vite, /src)
       ├─ Supabase Auth (Google OAuth)
       ├─ API fetch → /api/* (Vercel Functions)
       └─ 라우터: /, /news, /job-fairs, /interview, /interview/:id,
                  /story-bank, /mypage, /login, /auth/callback

[Vercel Functions — 12개]
  1. api/bookmarks/index.ts       — GET/POST/DELETE 즐겨찾기
  2. api/companies/[name].ts      — 기업 정보 + 공고 목록
  3. api/cover-letter/index.ts    — RAG 자소서 분석 (신규 v8)
  4. api/credits/balance.ts       — 크레딧 잔액 조회
  5. api/cron/collect-news.ts     — 고용24 뉴스 수집 크론
  6. api/interview/answer.ts      — 답변 제출 + RAG 피드백
  7. api/interview/start.ts       — 면접 세션 시작
  8. api/interview/[sessionId]/summary.ts — 세션 결과 요약
  9. api/job-fairs/index.ts       — 채용행사 목록
 10. api/news/[id]/summary.ts     — 공고 요약 (GPT)
 11. api/story-bank/index.ts      — 채굴 세션 + 공고별 버전 CRUD
 12. api/trends/index.ts          — 트렌드 데이터 + 인사이트

[Neon DB]
  users, recruitment_news, company_info, job_fairs,
  company_alerts, daily_digests, interview_sessions,
  credit_transactions, story_mining_sessions, story_cards,
  bookmarks, knowledge_chunks (pgvector), story_bank_versions (신규 v8)

[RAG 파이프라인]
  knowledge/raw/*.txt
    → db/ingest-knowledge.ts (npx tsx)
    → GPT 원칙 카드 추출 (5~15개/파일)
    → text-embedding-3-small 임베딩
    → knowledge_chunks INSERT
    → 현재 35개 카드 (면접팁 21 + 자소서팁 14)
```

---

## 4. 데이터베이스 스키마 (v8.0)

### 신규 테이블

```sql
-- 공고별 스토리뱅크 버전
CREATE TABLE story_bank_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  version_name VARCHAR(100) NOT NULL,
  job_posting_text TEXT,
  company_name VARCHAR(255),
  story_content JSONB NOT NULL DEFAULT '{}',  -- {intro, motivation, competency, growth}
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 기존 핵심 테이블

| 테이블 | 용도 |
|--------|------|
| `users` | 계정, 크레딧, 플랜 |
| `recruitment_news` | 고용24 공채속보 |
| `story_mining_sessions` | 채굴 세션 (transcript JSONB) |
| `story_cards` | 완료된 슬롯 카드 (10개) |
| `bookmarks` | 즐겨찾기 (user↔news) |
| `knowledge_chunks` | RAG 원칙 카드 (embedding vector(1536)) |
| `interview_sessions` | 면접 세션 (질문·답변·피드백) |

---

## 5. RAG 시스템

### 5.1 인제스트 파이프라인

```
knowledge/raw/*.txt (YouTube 스크립트)
  ↓ parseRawFile() — 두 가지 포맷 지원
    1. 헤더 방식: title:/url:/category: + 본문
    2. YouTube 내보내기: "제목 - YouTube" / URL / "Transcript:" / (00:00) 타임스탬프
  ↓ GPT 원칙 카드 추출 (claim/why/example/stage/question_types/category)
  ↓ text-embedding-3-small 임베딩 (1536차원)
  ↓ knowledge_chunks INSERT
```

**현재 지식 베이스**: 35개 카드
- 면접팁 21개 (키워드 전략, 1분 자기소개법)
- 자소서팁 14개 (서류합격률 71% 자소서 특징)

### 5.2 런타임 검색 (server/knowledge.ts)

```typescript
searchKnowledge(query, { category?, limit? }) → KnowledgeHit[]
// 1. text-embedding-3-small로 쿼리 임베딩
// 2. ORDER BY embedding <=> vector (코사인 유사도)
// 3. KnowledgeHit[] 반환 (claim, why, example, similarity)
```

### 5.3 RAG 적용 지점

| 기능 | 적용 방식 |
|------|----------|
| AI 면접 피드백 (`evaluateAnswer`) | 질문+답변으로 검색 → 원칙 3개를 시스템 프롬프트에 주입 |
| 자소서 분석 (`analyzeCoverLetter`) | 자소서팁 카테고리 검색 → 섹션별 진단 기준으로 활용 |
| 공고별 버전 생성 (`generateVersionContent`) | 공고+직무 키워드로 검색 → 맞춤 자소서 섹션 생성 가이드 |
| F4 스토리 힌트 (`findStoryHint`) | 토큰 오버랩 Phase 1 (임베딩 없이) — 추후 RAG Phase 3으로 업그레이드 예정 |

---

## 6. 기능 명세

### F1 — 채용 트렌드 대시보드 (`/news`)
- 고용24 공채속보 실시간 필터링 (업종/규모/고용형태/키워드)
- gpt-4.1-nano 트렌드 인사이트 (하루 1회 캐시)
- **즐겨찾기**: ☆/★ 토글 → bookmarks 테이블 → "★ 저장한 공고(N)" 상단 버튼으로 필터

### F2 — 채용행사 캘린더 (`/job-fairs`)
- 고용24 채용행사 목록 (지역별)

### F3 — 기업 정보 (`/companies/:name`)
- 고용24 공채기업정보 + 해당 기업 공채속보

### F4 — AI 모의면접 (`/interview`)

**면접관 페르소나 6가지**:
| ID | 레이블 | 특징 |
|----|--------|------|
| startup | 스타트업 | 실행력·적응력·빠른 Q&A |
| enterprise | 대기업 임원 | 격식체·조직문화·리더십 |
| public | 공공기관 | 공직가치·성실성·구조화 |
| finance | 금융권 | 수치 분석력·리스크·윤리 |
| tech | 테크니컬 | 기술 깊이·설계 사고·꼬리질문 |
| newcomer | 신입 친화형 | 잠재력·성장가능성·부드러운 어투 |

**피드백 흐름**:
1. JD + 이력서 + 페르소나 입력
2. GPT 질문 5개 생성 (스토리뱅크 힌트 토큰매칭 첨부)
3. 답변 제출 → `searchKnowledge(질문+답변)` → 원칙 3개 주입 → GPT 평가
4. 강점/보완점/quickTip 반환

### F5 — 스토리뱅크 (`/story-bank`)

**탭 1: 스토리 채굴**
- 10슬롯 × 6모듈 (situation/friction/action/result_quant/result_qual/reflection)
- 채팅 UI, 자동 저장, 세션 재개
- 슬롯별 1회 이상 추가 질문 후 force-accept (무한루프 방지)
- 5번·8번 슬롯 완료 시 체크포인트 메시지

**탭 2: 자소서 분석**
- 자소서 원문 + 모집공고(선택) 입력
- `analyzeCoverLetter()`: RAG 원칙 검색 → GPT 섹션별 진단
  - 섹션 분리 (자기소개/지원동기/직무역량/성장계획)
  - 섹션별 점수(0~100) + 문제점 2~3개 + 적용 원칙
  - 꼬리질문 3~5개 생성
- 꼬리질문 답변 후 "개선본 생성하기" → **비포/애프터 좌우 비교**
- 저장한 공고 클릭으로 모집공고 자동 입력

**탭 3: 공고별 버전**
- 모집공고 붙여넣기 → `generateVersionContent()` → RAG + 스토리카드 기반 자소서 초안
- 섹션별 편집기 (자기소개 600자/지원동기 600자/직무역량 500자/성장계획 400자)
- **글자수 실시간 표시** (초과 시 빨간색 경고)
- 버전 목록·저장·삭제 CRUD
- 저장한 공고 원클릭 선택

**북마크 사이드바**:
- 우상단 "📌 저장한 공고" 토글
- 자소서 분석·버전 생성 시 공고 원클릭 선택 가능
- 원문 보기 링크 제공

### 인증 (`/login`, `/auth/callback`)
- Supabase Google OAuth
- PrivateRoute: /interview, /interview/:id, /mypage
- 로그인 시 Supabase UUID → `jobtrend_user_id` localStorage

---

## 7. API 명세 (12개)

### POST `/api/cover-letter`
```
Body: { coverLetterText, jobPostingText?, followUpAnswers? }
Response: {
  sections: [{ key, title, original, score, issues[], principles[], improved }],
  followUpQuestions: [{ key, question }],
  overallScore
}
```
- 첫 요청: improved는 빈 문자열, followUpQuestions 반환
- followUpAnswers 포함 재요청: improved 섹션 포함 반환

### POST `/api/story-bank`
```
Body {} → 채굴 세션 시작
Body { sessionId, answer } → 채굴 진행
Body ?mode=version, { action:"create", versionName, jobPostingText, companyName } → 버전 생성
Body ?mode=version, { action:"update", versionId, storyContent } → 버전 수정
Body ?mode=version, { action:"delete", versionId } → 버전 삭제
```

### GET `/api/story-bank`
```
?active=1 → 진행 중 세션 + transcript
?versions=1 → 공고별 버전 목록
(기본) → 완료된 스토리 카드 목록
```

---

## 8. 프론트엔드 구조

```
src/
  pages/
    TrendDashboardPage.tsx   — F1 (즐겨찾기 포함)
    JobFairCalendarPage.tsx  — F2
    CompanyPage.tsx          — F3
    InterviewPage.tsx        — F4 세션 시작 (6 페르소나)
    InterviewSessionPage.tsx — F4 세션 진행 (스토리 힌트 표시)
    StoryMiningPage.tsx      — F5 (3탭 + 북마크 사이드바)
    MyPage.tsx               — 스토리카드 목록, 크레딧
    LoginPage.tsx            — Google 로그인
    AuthCallbackPage.tsx     — OAuth 콜백
  components/
    common/NavBar.tsx        — 트렌드/채용행사/AI면접/스토리뱅크 + 로그인/아바타
    common/PrivateRoute.tsx
    feature/ChatBubble.tsx
  context/
    AuthContext.tsx           — Supabase 세션
    CreditContext.tsx
  api/
    client.ts                — apiFetch wrapper
    endpoints.ts             — 모든 API 함수 정의
```

---

## 9. 환경변수

```
DATABASE_URL=          # Neon 연결 문자열 (pooled)
WORK24_API_KEY=        # 고용24 Open API 키
OPENAI_API_KEY=        # GPT-4.1-mini/nano + embedding
CRON_SECRET=           # 크론 엔드포인트 보호
VITE_SUPABASE_URL=     # Supabase 프로젝트 URL
VITE_SUPABASE_ANON_KEY= # Supabase anon key (sb_publishable_...)
```

---

## 10. 운영 제약사항

| 항목 | 제약 |
|------|------|
| Vercel Hobby Functions | 12개 한도 (현재 12개 사용) |
| Neon DB | pgvector 0.8.1, vector(1536) |
| Supabase | Google OAuth만 지원 (Kakao는 KOE205 scope 오류로 제거) |
| 공고 원문 크롤링 | 불가 — 모든 공고 플랫폼이 SPA로 렌더링되어 서버사이드 fetch 불가 |
| OpenAI 모델 | gpt-4.1-mini (피드백/추출), gpt-4.1-nano (인사이트), text-embedding-3-small (RAG) |

---

## 11. 다음 개선 예정 (v9.0 후보)

1. **RAG Phase 3**: 스토리 힌트도 임베딩 기반 코사인 검색으로 교체 (현재는 토큰 오버랩)
2. **AI 모의면접 힌트 모드**: 스토리뱅크 버전 선택 후 면접 진행 시 관련 스토리 힌트 자동 연결
3. **스토리뱅크 → 면접 흐름**: 공고별 버전 페이지에서 바로 AI 면접 시작
4. **자소서 버전 글자수 제한**: 실제 기업별 제한 자동 파싱
5. **AI 모의면접 페르소나 5번** (커리어패스형): v5.0 스펙에 명시된 미구현 항목
