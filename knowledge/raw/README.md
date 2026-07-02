# RAG Raw Data 저장 형식

유튜브 스크립트를 이 폴더에 `.txt` 파일로 저장하세요.
파일 하나 = 영상 하나. 파일명은 자유 (한글 OK).

## 파일 형식

첫 줄부터 헤더 3줄 + 빈 줄 + 스크립트 전문:

```
title: 면접에서 무조건 붙는 사람들의 공통점
url: https://youtube.com/watch?v=XXXX
category: 면접팁

(여기부터 스크립트 전문을 그대로 붙여넣기.
자동생성 자막 그대로여도 됨 — 어차피 GPT가 정제하면서 원칙을 추출함.
타임스탬프 있어도 무관.)
```

- `category`는 `면접팁` / `자소서팁` / `이력서팁` 중 하나
- url은 없으면 생략 가능
- 인코딩: UTF-8

## 저장 후 실행

```
npx tsx db/ingest-knowledge.ts
```

- 각 파일에서 GPT(gpt-4.1-mini)가 원칙 카드 5~15개를 추출하고
  text-embedding-3-small로 임베딩해서 Neon knowledge_chunks에 저장
- 같은 title은 재실행 시 기존 카드를 지우고 다시 추출 (수정 반영 가능)
- OPENAI_API_KEY가 .env에 있어야 함
