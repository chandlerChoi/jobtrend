import { apiFetch } from "./client";
import type { InterviewQuestion, InterviewSummary, KeywordAlertRow, DailyReportContent } from "../../shared/types";

export interface TrendResponse {
  jobCategory: string;
  totalPostings: number;
  experienceDistribution: { range: string; count: number; pct: number }[];
  educationDistribution: { level: string; count: number; pct: number }[];
  topKeywords: { keyword: string; frequency: number; pct: number }[];
  postingTrend: { date: string; count: number }[];
  lastUpdated: string;
}

export function getTrends(jobCategory: string, period = "30d") {
  return apiFetch<TrendResponse>(`/trends/${encodeURIComponent(jobCategory)}?period=${period}`);
}

export function listAlerts() {
  return apiFetch<{ alerts: KeywordAlertRow[] }>("/alerts");
}

export function createAlert(payload: { keyword: string; jobCategory?: string; region?: string; channel: "email" | "push" }) {
  return apiFetch<{ alert: KeywordAlertRow }>("/alerts", { method: "POST", body: JSON.stringify(payload) });
}

export function deleteAlert(id: string) {
  return apiFetch<void>(`/alerts/${id}`, { method: "DELETE" });
}

export function getDailyReport(date?: string) {
  const q = date ? `?date=${date}` : "";
  return apiFetch<DailyReportContent>(`/reports/daily${q}`);
}

export interface AdjacentJobsResponse {
  sourceJob: string;
  recommendations: { jobCategory: string; similarityScore: number; sharedKeywords: string[] }[];
}

export function getAdjacentJobs(jobCategory: string) {
  return apiFetch<AdjacentJobsResponse>(`/adjacent-jobs/${encodeURIComponent(jobCategory)}`);
}

export interface StartInterviewResponse {
  sessionId: string;
  questions: InterviewQuestion[];
  creditsRemaining: number;
}

export function startInterview(payload: { jdText: string; resumeText?: string; jobCategory?: string }) {
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
