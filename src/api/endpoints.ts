import { apiFetch } from "./client";
import type {
  InterviewQuestion,
  InterviewSummary,
  CompanyAlertRow,
  DailyDigestContent,
  RecruitmentNewsRow,
  CompanyInfoRow,
  JobFairRow
} from "../../shared/types";

export interface NewsFeedResponse {
  news: RecruitmentNewsRow[];
  trend: { date: string; count: number }[];
  total: number;
  lastUpdated: string;
}

export function getNewsFeed(companyName?: string, limit = 50) {
  const q = new URLSearchParams({ limit: String(limit), ...(companyName ? { company: companyName } : {}) });
  return apiFetch<NewsFeedResponse>(`/news?${q}`);
}

export interface CompanyResponse {
  info: CompanyInfoRow | null;
  news: RecruitmentNewsRow[];
}

export function getCompany(companyName: string) {
  return apiFetch<CompanyResponse>(`/companies/${encodeURIComponent(companyName)}`);
}

export function listJobFairs() {
  return apiFetch<{ fairs: JobFairRow[] }>("/job-fairs");
}

export function listAlerts() {
  return apiFetch<{ alerts: CompanyAlertRow[] }>("/alerts");
}

export function createAlert(payload: { companyName: string; channel: "email" | "push" }) {
  return apiFetch<{ alert: CompanyAlertRow }>("/alerts", { method: "POST", body: JSON.stringify(payload) });
}

export function deleteAlert(id: string) {
  return apiFetch<void>(`/alerts/${id}`, { method: "DELETE" });
}

export function getDailyDigest(date?: string) {
  const q = date ? `?date=${date}` : "";
  return apiFetch<DailyDigestContent>(`/digest/daily${q}`);
}

export interface StartInterviewResponse {
  sessionId: string;
  questions: InterviewQuestion[];
  creditsRemaining: number;
}

export function startInterview(payload: { jdText: string; resumeText?: string }) {
  return apiFetch<StartInterviewResponse>("/interview/start", { method: "POST", body: JSON.stringify(payload) });
}

export interface AnswerResponse {
  feedback: { strengths: string[]; improvements: string[] };
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
