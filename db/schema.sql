-- JobTrend schema (Neon DB / PostgreSQL) — v3.0
-- Redesigned around the 3 고용24 Open API services an individual account
-- can call (채용행사/공채속보/공채기업정보). See api/lib/normalizers.ts for
-- the wantedRoot -> row mapping (all 3 field sets are now confirmed against
-- live API responses, not guessed).
--
-- Note: v1/v2 tables (job_postings, job_category_stats, job_similarity,
-- keyword_alerts, daily_reports) may still exist from earlier iterations.
-- They're orphaned, not referenced by any route, and safe to ignore/drop
-- manually later — left in place here to avoid a destructive migration.

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  plan_tier VARCHAR(20) NOT NULL DEFAULT 'free',
  interview_credits INT NOT NULL DEFAULT 3,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 공채속보 (210L21)
CREATE TABLE IF NOT EXISTS recruitment_news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id VARCHAR(100) NOT NULL UNIQUE,
  company_name VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  company_type VARCHAR(50),
  employment_types TEXT[],
  posted_at DATE,
  closing_at DATE,
  logo_url TEXT,
  posting_url TEXT,
  collected_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_news_company ON recruitment_news(company_name);
CREATE INDEX IF NOT EXISTS idx_news_collected ON recruitment_news(collected_at);

-- 공채기업정보 (210L31)
CREATE TABLE IF NOT EXISTS company_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id VARCHAR(100) NOT NULL UNIQUE,
  company_name VARCHAR(255) NOT NULL,
  company_type VARCHAR(50),
  business_no VARCHAR(50),
  intro_summary TEXT,
  intro_detail TEXT,
  homepage TEXT,
  logo_url TEXT,
  collected_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_company_info_name ON company_info(company_name);

-- 채용행사 (210L11/210D11)
CREATE TABLE IF NOT EXISTS job_fairs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id VARCHAR(100) NOT NULL UNIQUE,
  area_code VARCHAR(10),
  area VARCHAR(100),
  event_name VARCHAR(255) NOT NULL,
  event_term VARCHAR(100),
  start_date DATE,
  event_place VARCHAR(255),
  participating_companies TEXT,
  contact_phone VARCHAR(50),
  contact_email VARCHAR(100),
  collected_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fairs_date ON job_fairs(start_date);

CREATE TABLE IF NOT EXISTS company_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_name VARCHAR(255) NOT NULL,
  channel VARCHAR(20) NOT NULL DEFAULT 'email',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_company_alerts_user ON company_alerts(user_id);

CREATE TABLE IF NOT EXISTS daily_digests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  digest_date DATE NOT NULL,
  content_json JSONB NOT NULL,
  sent_at TIMESTAMPTZ,
  UNIQUE(user_id, digest_date)
);

-- F4 — unchanged in spirit, job_category dropped (user pastes JD directly,
-- no taxonomy needed without job_postings to derive one from).
CREATE TABLE IF NOT EXISTS interview_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  jd_text TEXT NOT NULL,
  resume_text TEXT,
  questions_json JSONB NOT NULL,
  answers_json JSONB DEFAULT '[]',
  feedback_json JSONB,
  status VARCHAR(20) NOT NULL DEFAULT 'in_progress',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL,
  amount INT NOT NULL,
  balance_after INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- F5 — Story Bank mining interview (server/storyMining.ts). One session
-- walks the user through 10 slots (S01-S10); slot_state tracks the current
-- slot's module-detection progress and resets each time a slot completes.
CREATE TABLE IF NOT EXISTS story_mining_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slot_index INT NOT NULL DEFAULT 0,
  slot_state JSONB NOT NULL,
  -- Full ordered question/answer log across all slots, so a refresh or
  -- later visit can rebuild the chat and resume mid-interview.
  transcript JSONB NOT NULL DEFAULT '[]',
  status VARCHAR(20) NOT NULL DEFAULT 'in_progress',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE story_mining_sessions ADD COLUMN IF NOT EXISTS transcript JSONB NOT NULL DEFAULT '[]';
CREATE INDEX IF NOT EXISTS idx_story_mining_user ON story_mining_sessions(user_id);

-- One row per completed (or abandoned) slot. modules_filled + raw_answers
-- are the MVP shape; splitting raw_answers into the 6 discrete module
-- fields from STAGE 2 of the design doc is a follow-up LLM extraction pass.
CREATE TABLE IF NOT EXISTS story_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slot_id VARCHAR(10) NOT NULL,
  slot_name VARCHAR(50) NOT NULL,
  raw_answers JSONB NOT NULL,
  modules_filled JSONB NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'slot_complete',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_story_cards_user ON story_cards(user_id);

-- 즐겨찾기 — a user pins a recruitment_news row to revisit later.
CREATE TABLE IF NOT EXISTS bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  news_id UUID NOT NULL REFERENCES recruitment_news(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, news_id)
);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks(user_id);

-- RAG knowledge base — principle cards distilled (one-time GPT batch,
-- db/ingest-knowledge.ts) from YouTube interview/cover-letter coaching
-- transcripts dropped in knowledge/raw/*.txt. Runtime feedback searches
-- these by cosine similarity instead of sending full context to OpenAI.
CREATE EXTENSION IF NOT EXISTS vector;
CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_title VARCHAR(255) NOT NULL,
  source_url TEXT,
  category VARCHAR(20) NOT NULL,        -- 면접팁 | 자소서팁 | 이력서팁
  stage VARCHAR(20),                    -- 자소서작성 | 면접준비 | 면접당일
  question_types TEXT[] DEFAULT '{}',   -- 자기소개, 지원동기, 갈등해결, ...
  claim TEXT NOT NULL,                  -- 원칙 한 문장
  why TEXT,                             -- 근거/이유
  example TEXT,                         -- 적용 예시
  content TEXT NOT NULL,                -- claim+why+example 합본 (임베딩 원문)
  embedding vector(1536),               -- text-embedding-3-small
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_knowledge_category ON knowledge_chunks(category);
