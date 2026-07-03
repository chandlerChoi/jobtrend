import { apiFetch } from "./client";
import type {
  InterviewQuestion,
  InterviewSummary,
  RecruitmentNewsRow,
  CompanyInfoRow,
  JobFairRow,
  StoryCardRow,
  StoryBankVersion,
  CoverLetterSection
} from "../../shared/types";

export interface TrendResponse {
  news: RecruitmentNewsRow[];
  trend: { date: string; count: number }[];
  total: number;
  insight: string | null;
  insightCachedAt: string | null;
  lastUpdated: string;
}

export function getTrends(params?: {
  industry?: string;
  size?: string;
  keyword?: string;
  employmentType?: string;
  limit?: number;
}) {
  const q = new URLSearchParams();
  if (params?.industry) q.set("industry", params.industry);
  if (params?.size) q.set("size", params.size);
  if (params?.keyword) q.set("keyword", params.keyword);
  if (params?.employmentType) q.set("employmentType", params.employmentType);
  if (params?.limit) q.set("limit", String(params.limit));
  return apiFetch<TrendResponse>(`/trends?${q}`);
}

export interface NewsSummaryResponse {
  summary: { requirements: string[]; preferred: string[]; interviewType: string[]; };
}

export function getNewsSummary(newsId: string) {
  return apiFetch<NewsSummaryResponse>(`/news/${newsId}/summary`);
}

export interface CompanyResponse {
  info: CompanyInfoRow | null;
  news: RecruitmentNewsRow[];
}

export function getCompany(companyName: string) {
  return apiFetch<CompanyResponse>(`/companies/${encodeURIComponent(companyName)}`);
}

// Legacy stubs
export type NewsFeedResponse = TrendResponse;
export const getNewsFeed = (_companyName?: string) => getTrends({ limit: 50 });
export const listAlerts = () => apiFetch<{ alerts: never[] }>("/alerts");
export const createAlert = (_p: unknown) => Promise.resolve({ alert: null });
export const deleteAlert = (id: string) => apiFetch<void>(`/alerts?id=${id}`, { method: "DELETE" });
export const getDailyDigest = (_date?: string) => Promise.resolve(null);

// chargeCredits is a UI stub — no server endpoint (removed to stay within 12-fn limit)
// Returns a sentinel so CreditContext can add the delta rather than set absolute
export function chargeCredits(credits: number) {
  return Promise.resolve({ creditsRemaining: credits, charged: credits, isDelta: true });
}

export function listJobFairs() {
  return apiFetch<{ fairs: JobFairRow[] }>("/job-fairs");
}

export interface StartInterviewResponse {
  sessionId: string;
  questions: InterviewQuestion[];
  creditsRemaining: number;
}

export function startInterview(payload: {
  jdText: string;
  resumeText?: string;
  persona?: string;
  industryPersona?: string;
  stylePersona?: string;
}) {
  return apiFetch<StartInterviewResponse>("/interview/start", { method: "POST", body: JSON.stringify(payload) });
}

export interface InterviewSessionSummary {
  id: string;
  persona_type: string;
  jd_text: string;
  status: string;
  created_at: string;
  averageScore: number | null;
  questionCount: number;
  answeredCount: number;
}

export function listInterviewSessions() {
  return apiFetch<{ sessions: InterviewSessionSummary[] }>("/interview/start");
}

export interface InterviewDetailResponse {
  averageScore: number;
  overallStrengths: string[];
  overallImprovements: string[];
  history: { question: string; answer: string; score: number; feedback: { strengths: string[]; improvements: string[]; quickTip?: string } }[];
  questions: InterviewQuestion[];
  personaType: string;
  jdText: string;
}

export interface AnswerResponse {
  feedback: { strengths: string[]; improvements: string[]; quickTip?: string };
  nextQuestionId: number | null;
}

export function submitAnswer(payload: { sessionId: string; questionId: number; answerText: string }) {
  return apiFetch<AnswerResponse>("/interview/answer", { method: "POST", body: JSON.stringify(payload) });
}

export function getInterviewSummary(sessionId: string) {
  return apiFetch<InterviewSummary>(`/interview/${sessionId}/summary`);
}

export function getInterviewDetail(sessionId: string) {
  return apiFetch<InterviewDetailResponse>(`/interview/${sessionId}/summary`);
}

export function getCreditBalance() {
  return apiFetch<{ credits: number; planTier: string }>("/credits/balance");
}

// ── Story Bank ──────────────────────────────────────────────────────────────

export interface StoryBankTurnResponse {
  sessionId: string;
  slotIndex?: number;
  slotName?: string;
  question?: string | null;
  checkpointNote?: string | null;
  lastCard?: StoryCardRow;
  totalSlots?: number;
  done: boolean;
}

export function startStoryMining() {
  return apiFetch<StoryBankTurnResponse>("/story-bank", { method: "POST", body: JSON.stringify({}) });
}

export function continueStoryMining(sessionId: string, answer: string) {
  return apiFetch<StoryBankTurnResponse>("/story-bank", {
    method: "POST",
    body: JSON.stringify({ sessionId, answer })
  });
}

export function skipStoryMining(sessionId: string) {
  return apiFetch<StoryBankTurnResponse>("/story-bank", {
    method: "POST",
    body: JSON.stringify({ sessionId, skip: true })
  });
}

export function editStoryCard(cardId: string, rawAnswers: string[]) {
  return apiFetch<{ ok: boolean }>("/story-bank?mode=edit", {
    method: "POST",
    body: JSON.stringify({ cardId, rawAnswers })
  });
}

// 미채굴 슬롯에 직접 기입해 카드 생성 (채굴 순서와 무관)
export function createStoryCardDirect(slotId: string, rawAnswers: string[]) {
  return apiFetch<{ ok: boolean; card: StoryCardRow }>("/story-bank?mode=edit", {
    method: "POST",
    body: JSON.stringify({ slotId, rawAnswers })
  });
}

export interface UpgradeStoryCardResponse {
  upgradedAnswers: string[];
}

export function upgradeStoryCard(payload: {
  slotName: string;
  questions: string[];
  answers: string[];
  targetIndex?: number;
}) {
  return apiFetch<UpgradeStoryCardResponse>("/story-bank?mode=upgrade", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function listStoryCards() {
  return apiFetch<{ cards: StoryCardRow[] }>("/story-bank");
}

export interface ActiveMiningSession {
  sessionId: string;
  slotIndex: number;
  slotName: string | null;
  transcript: { slotId: string; question: string; answer: string }[];
}

export function getActiveStoryMiningSession() {
  return apiFetch<{ session: ActiveMiningSession | null }>("/story-bank?active=1");
}

// ── Story Bank Versions ─────────────────────────────────────────────────────

export function listStoryBankVersions() {
  return apiFetch<{ versions: StoryBankVersion[] }>("/story-bank?versions=1");
}

export function createStoryBankVersion(payload: {
  versionName: string;
  jobPostingText?: string;
  companyName?: string;
}) {
  return apiFetch<{ version: StoryBankVersion }>("/story-bank?mode=version", {
    method: "POST",
    body: JSON.stringify({ action: "create", ...payload })
  });
}

export function updateStoryBankVersion(versionId: string, storyContent: Record<string, string>) {
  return apiFetch<{ ok: boolean }>("/story-bank?mode=version", {
    method: "POST",
    body: JSON.stringify({ action: "update", versionId, storyContent })
  });
}

export function deleteStoryBankVersion(versionId: string) {
  return apiFetch<{ ok: boolean }>("/story-bank?mode=version", {
    method: "POST",
    body: JSON.stringify({ action: "delete", versionId })
  });
}

// ── Cover Letter Analysis ───────────────────────────────────────────────────

export interface CoverLetterAnalysisResponse {
  sections: CoverLetterSection[];
  followUpQuestions: { key: string; question: string }[];
  overallScore: number;
}

export function analyzeCoverLetter(payload: {
  coverLetterText: string;
  jobPostingText?: string;
  followUpAnswers?: Record<string, string>;
}) {
  return apiFetch<CoverLetterAnalysisResponse>("/cover-letter", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

// ── Bookmarks ───────────────────────────────────────────────────────────────

export function listBookmarks() {
  return apiFetch<{ news: RecruitmentNewsRow[]; ids: string[] }>("/bookmarks");
}

export function addBookmark(newsId: string) {
  return apiFetch<{ bookmark: unknown }>("/bookmarks", {
    method: "POST",
    body: JSON.stringify({ newsId })
  });
}

export function removeBookmark(newsId: string) {
  return apiFetch<{ removed: boolean }>(`/bookmarks?newsId=${newsId}`, { method: "DELETE" });
}
