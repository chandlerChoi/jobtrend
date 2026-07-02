import { apiFetch } from "./client";
import type {
  InterviewQuestion,
  InterviewSummary,
  RecruitmentNewsRow,
  CompanyInfoRow,
  JobFairRow,
  StoryCardRow
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

// Legacy stubs — kept for hooks that still import them
export type NewsFeedResponse = TrendResponse;
export const getNewsFeed = (companyName?: string) => getTrends({ limit: 50 });
export const listAlerts = () => apiFetch<{ alerts: never[] }>("/alerts");
export const createAlert = (_p: unknown) => Promise.resolve({ alert: null });
export const deleteAlert = (id: string) => apiFetch<void>(`/alerts?id=${id}`, { method: "DELETE" });
export const getDailyDigest = (_date?: string) => Promise.resolve(null);

export function listJobFairs() {
  return apiFetch<{ fairs: JobFairRow[] }>("/job-fairs");
}

export interface StartInterviewResponse {
  sessionId: string;
  questions: InterviewQuestion[];
  creditsRemaining: number;
}

export function startInterview(payload: { jdText: string; resumeText?: string; persona?: string }) {
  return apiFetch<StartInterviewResponse>("/interview/start", { method: "POST", body: JSON.stringify(payload) });
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

export function getCreditBalance() {
  return apiFetch<{ credits: number; planTier: string }>("/credits/balance");
}

export function chargeCredits(credits: number) {
  return apiFetch<{ creditsRemaining: number; charged: number }>("/credits/charge", {
    method: "POST",
    body: JSON.stringify({ credits })
  });
}

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
