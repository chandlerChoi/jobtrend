-- JobTrend schema (Neon DB / PostgreSQL)
-- Mirrors the implementation-grade spec. External Open API field mapping
-- (사람인/잡코리아) happens last — see api/lib/normalizers.ts and
-- api/lib/categoryMap.ts, which are already written against this schema.

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  plan_tier VARCHAR(20) NOT NULL DEFAULT 'free',
  interview_credits INT NOT NULL DEFAULT 3,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE job_postings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source VARCHAR(20) NOT NULL,              -- 'work24' | 'saramin' | 'jobkorea'
  external_id VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  company VARCHAR(255),
  job_category VARCHAR(100) NOT NULL,
  region VARCHAR(100),
  employment_type VARCHAR(50),
  experience_min INT,
  experience_max INT,
  education_level VARCHAR(50),
  salary_code VARCHAR(50),
  keywords TEXT[],
  raw_requirements TEXT,
  posting_url TEXT,
  posted_at DATE,
  collected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(source, external_id)
);
CREATE INDEX idx_postings_category ON job_postings(job_category);
CREATE INDEX idx_postings_collected ON job_postings(collected_at);

CREATE TABLE job_category_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_category VARCHAR(100) NOT NULL,
  keyword VARCHAR(100) NOT NULL,
  frequency INT NOT NULL DEFAULT 0,
  period_date DATE NOT NULL,
  UNIQUE(job_category, keyword, period_date)
);
CREATE INDEX idx_stats_category_date ON job_category_stats(job_category, period_date);

CREATE TABLE job_similarity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_category_a VARCHAR(100) NOT NULL,
  job_category_b VARCHAR(100) NOT NULL,
  similarity_score NUMERIC(5,4) NOT NULL,
  shared_keywords TEXT[],
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(job_category_a, job_category_b)
);

CREATE TABLE keyword_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  keyword VARCHAR(100) NOT NULL,
  job_category VARCHAR(100),
  region VARCHAR(100),
  channel VARCHAR(20) NOT NULL DEFAULT 'email',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_alerts_user ON keyword_alerts(user_id);

CREATE TABLE daily_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  report_date DATE NOT NULL,
  content_json JSONB NOT NULL,
  sent_at TIMESTAMPTZ,
  UNIQUE(user_id, report_date)
);

CREATE TABLE interview_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_category VARCHAR(100),
  jd_text TEXT NOT NULL,
  resume_text TEXT,
  questions_json JSONB NOT NULL,
  answers_json JSONB DEFAULT '[]',
  feedback_json JSONB,
  status VARCHAR(20) NOT NULL DEFAULT 'in_progress',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL,                -- 'charge' | 'consume' | 'monthly_grant'
  amount INT NOT NULL,
  balance_after INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
