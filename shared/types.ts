// Row shapes mirror db/schema.sql exactly so mockDb and the real Neon client
// (once wired) are interchangeable from the API layer's point of view.

export interface UserRow {
  id: string;
  email: string;
  password_hash: string | null;
  plan_tier: "free" | "premium";
  interview_credits: number;
  created_at: string;
}

export interface JobPostingRow {
  id: string;
  source: "saramin" | "jobkorea" | "work24";
  external_id: string;
  title: string;
  company: string | null;
  job_category: string;
  region: string | null;
  employment_type: string | null;
  experience_min: number | null;
  experience_max: number | null;
  education_level: string | null;
  salary_code: string | null;
  keywords: string[];
  raw_requirements: string | null;
  posting_url: string | null;
  posted_at: string;
  collected_at: string;
}

export interface JobCategoryStatRow {
  id: string;
  job_category: string;
  keyword: string;
  frequency: number;
  period_date: string;
}

export interface JobSimilarityRow {
  id: string;
  job_category_a: string;
  job_category_b: string;
  similarity_score: number;
  shared_keywords: string[];
  computed_at: string;
}

export interface KeywordAlertRow {
  id: string;
  user_id: string;
  keyword: string;
  job_category: string | null;
  region: string | null;
  channel: "email" | "push";
  active: boolean;
  created_at: string;
}

export interface DailyReportRow {
  id: string;
  user_id: string;
  report_date: string;
  content_json: DailyReportContent;
  sent_at: string | null;
}

export interface DailyReportContent {
  date: string;
  highlights: { keyword: string; changeType: "frequency_spike" | "frequency_drop" | "new_posting"; delta: string }[];
  newPostings: { title: string; company: string | null; postingUrl: string | null }[];
}

export interface InterviewSessionRow {
  id: string;
  user_id: string;
  job_category: string | null;
  jd_text: string;
  resume_text: string | null;
  questions_json: InterviewQuestion[];
  answers_json: InterviewAnswer[];
  feedback_json: InterviewSummary | null;
  status: "questions_generated" | "answering" | "completed";
  created_at: string;
}

export interface InterviewQuestion {
  id: number;
  text: string;
  order: number;
}

export interface InterviewAnswer {
  questionId: number;
  answerText: string;
  score: number;
  feedback: { strengths: string[]; improvements: string[] };
}

export interface InterviewSummary {
  averageScore: number;
  overallStrengths: string[];
  overallImprovements: string[];
}

export interface CreditTransactionRow {
  id: string;
  user_id: string;
  type: "charge" | "consume" | "monthly_grant";
  amount: number;
  balance_after: number;
  created_at: string;
}
