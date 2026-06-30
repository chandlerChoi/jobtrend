// v3.0 — redesigned around the 3 work24 Open API services an individual
// account can actually call (채용행사/공채속보/공채기업정보). Row shapes
// mirror db/schema.sql exactly so mockBackend and neonBackend are
// interchangeable from the API layer's point of view.

export interface UserRow {
  id: string;
  email: string;
  password_hash: string | null;
  plan_tier: "free" | "premium";
  interview_credits: number;
  created_at: string;
}

// 공채속보 (210L21) — newly-registered recruitment postings, headline-only
// (no requirements/salary/experience — that's the gap this whole redesign
// works around).
export interface RecruitmentNewsRow {
  id: string;
  external_id: string;
  company_name: string;
  title: string;
  company_type: string | null;
  employment_types: string[];
  posted_at: string | null;
  closing_at: string | null;
  logo_url: string | null;
  posting_url: string | null;
  collected_at: string;
}

// 공채기업정보 (210L31) — company profile data, joined onto news by name
// since neither service shares a common id.
export interface CompanyInfoRow {
  id: string;
  external_id: string;
  company_name: string;
  company_type: string | null;
  business_no: string | null;
  intro_summary: string | null;
  intro_detail: string | null;
  homepage: string | null;
  logo_url: string | null;
  collected_at: string;
}

// 채용행사 (210L11/210D11) — job fair / hiring event calendar.
export interface JobFairRow {
  id: string;
  external_id: string;
  area_code: string | null;
  area: string | null;
  event_name: string;
  event_term: string | null;
  start_date: string | null;
  event_place: string | null;
  participating_companies: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  collected_at: string;
}

export interface CompanyAlertRow {
  id: string;
  user_id: string;
  company_name: string;
  channel: "email" | "push";
  active: boolean;
  created_at: string;
}

export interface DailyDigestContent {
  date: string;
  newPostingsByCompany: { companyName: string; title: string; postingUrl: string | null }[];
}

export interface DailyDigestRow {
  id: string;
  user_id: string;
  digest_date: string;
  content_json: DailyDigestContent;
  sent_at: string | null;
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

export interface InterviewSessionRow {
  id: string;
  user_id: string;
  jd_text: string;
  resume_text: string | null;
  questions_json: InterviewQuestion[];
  answers_json: InterviewAnswer[];
  feedback_json: InterviewSummary | null;
  status: "questions_generated" | "answering" | "completed";
  created_at: string;
}

export interface CreditTransactionRow {
  id: string;
  user_id: string;
  type: "charge" | "consume" | "monthly_grant";
  amount: number;
  balance_after: number;
  created_at: string;
}
