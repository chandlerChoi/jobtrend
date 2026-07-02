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
  // F5 연동 — the user's most relevant story-bank card for this
  // question, keyword-matched at generation time. Absent when the
  // story bank is empty or nothing matches.
  storyHint?: { slotName: string; snippet: string };
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
  persona_type: string;
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

// F5 — Story Bank mining interview. Ports the 10-slot STAR mining design:
// each slot asks an opening question, then detects which of 6 answer
// modules (situation/friction/action/result_quant/result_qual/reflection)
// are still missing and asks a targeted follow-up (max 3) before moving on.
export const STORY_MODULES = [
  "situation",
  "friction",
  "action",
  "result_quant",
  "result_qual",
  "reflection"
] as const;
export type StoryModule = typeof STORY_MODULES[number];

export const SLOT_IDS = ["S01", "S02", "S03", "S04", "S05", "S06", "S07", "S08", "S09", "S10"] as const;
export type SlotId = typeof SLOT_IDS[number];

export interface SlotProgressState {
  modules_filled: Record<StoryModule, boolean>;
  raw_answers: string[];
  followup_count: number;
  // Per-module ask counter — after 2 targeted re-asks a module is
  // force-accepted (best-effort) so detection gaps can't loop forever.
  // Optional for rows created before v7.0.
  modules_asked_count?: Partial<Record<StoryModule, number>>;
}

export interface TranscriptEntry {
  slotId: SlotId;
  question: string;
  answer: string;
}

export interface StoryMiningSessionRow {
  id: string;
  user_id: string;
  slot_index: number; // 0..9, index into SLOT_IDS
  slot_state: SlotProgressState;
  transcript: TranscriptEntry[];
  status: "in_progress" | "completed";
  created_at: string;
  updated_at: string;
}

export interface BookmarkRow {
  id: string;
  user_id: string;
  news_id: string;
  created_at: string;
}

export interface StoryCardRow {
  id: string;
  user_id: string;
  slot_id: SlotId;
  slot_name: string;
  raw_answers: string[];
  modules_filled: Record<StoryModule, boolean>;
  status: "slot_complete" | "slot_incomplete";
  created_at: string;
}

// 공고별 스토리뱅크 버전 — 각 버전은 모집공고에 맞게 커스터마이즈된
// 자소서 섹션(자기소개/지원동기/직무역량/성장계획)과 면접 힌트를 저장한다.
export interface StoryBankVersion {
  id: string;
  user_id: string;
  version_name: string;
  job_posting_text: string | null;
  company_name: string | null;
  story_content: Record<string, string>; // section key → text
  created_at: string;
  updated_at: string;
}

// 자소서 분석 결과
export interface CoverLetterSection {
  key: string;       // e.g. "intro", "motivation", "competency", "growth"
  title: string;     // e.g. "자기소개"
  original: string;
  score: number;     // 0–100
  issues: string[];
  principles: string[];
  improved: string;
}

export interface CoverLetterAnalysis {
  sections: CoverLetterSection[];
  followUpQuestions: string[];
  overallScore: number;
}
