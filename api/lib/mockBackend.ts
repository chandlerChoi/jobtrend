import { randomUUID } from "crypto";
import { db as store, findOrCreateGuestUser, recordCreditTransaction as recordTx, recomputeStatsForDate, persistStore } from "./mockDb.js";
import { CATEGORIES } from "../../shared/categories.js";
import type { Db, NewPosting } from "./dbTypes.js";
import type { CreditTransactionRow, KeywordAlertRow, InterviewSessionRow } from "../../shared/types.js";

export const mockBackend: Db = {
  async getOrCreateUser(userId) {
    return findOrCreateGuestUser(userId);
  },

  async decrementCredit(userId) {
    const user = findOrCreateGuestUser(userId);
    if (user.interview_credits <= 0) return -1;
    user.interview_credits -= 1;
    return user.interview_credits;
  },

  async addCredits(userId, amount) {
    const user = findOrCreateGuestUser(userId);
    user.interview_credits += amount;
    return user.interview_credits;
  },

  async recordCreditTransaction(userId, type, amount, balanceAfter) {
    recordTx(userId, type, amount, balanceAfter);
  },

  async getPostingsSince(category, sinceDate) {
    return store.jobPostings.filter((p) => p.job_category === category && p.posted_at >= sinceDate);
  },

  async getPostingsByDate(date) {
    return store.jobPostings.filter((p) => p.posted_at === date);
  },

  async insertPostingIfNew(posting: NewPosting) {
    const exists = store.jobPostings.some((p) => p.source === posting.source && p.external_id === posting.external_id);
    if (exists) return false;
    store.jobPostings.push({ id: randomUUID(), collected_at: new Date().toISOString(), ...posting });
    return true;
  },

  async countPostings() {
    return store.jobPostings.length;
  },

  async getStatFrequency(keyword, jobCategory, date) {
    return store.jobCategoryStats
      .filter((s) => s.keyword === keyword && s.period_date === date && (!jobCategory || s.job_category === jobCategory))
      .reduce((sum, s) => sum + s.frequency, 0);
  },

  async recomputeStatsForDate(date) {
    recomputeStatsForDate(date);
  },

  async getLatestStatDate() {
    return store.jobCategoryStats.reduce((max, s) => (s.period_date > max ? s.period_date : max), "") || null;
  },

  async getStatsForDate(date) {
    return store.jobCategoryStats.filter((s) => s.period_date === date);
  },

  async getSimilarities(categoryA) {
    return store.jobSimilarity.filter((s) => s.job_category_a === categoryA).sort((a, b) => b.similarity_score - a.similarity_score);
  },

  async hasAnySimilarity() {
    return store.jobSimilarity.length > 0;
  },

  async upsertSimilarity(a, b, score, shared) {
    const existing = store.jobSimilarity.find((s) => s.job_category_a === a && s.job_category_b === b);
    if (existing) {
      existing.similarity_score = score;
      existing.shared_keywords = shared;
      existing.computed_at = new Date().toISOString();
    } else {
      store.jobSimilarity.push({
        id: randomUUID(),
        job_category_a: a,
        job_category_b: b,
        similarity_score: score,
        shared_keywords: shared,
        computed_at: new Date().toISOString()
      });
    }
  },

  async listActiveAlerts(userId) {
    return store.keywordAlerts.filter((a) => a.user_id === userId && a.active);
  },

  async countActiveAlerts(userId) {
    return store.keywordAlerts.filter((a) => a.user_id === userId && a.active).length;
  },

  async createAlert(row) {
    const alert: KeywordAlertRow = { id: randomUUID(), created_at: new Date().toISOString(), ...row };
    store.keywordAlerts.push(alert);
    return alert;
  },

  async deactivateAlert(id, userId) {
    const alert = store.keywordAlerts.find((a) => a.id === id && a.user_id === userId);
    if (!alert) return false;
    alert.active = false;
    return true;
  },

  async upsertDailyReport(userId, date, content) {
    const existing = store.dailyReports.find((r) => r.user_id === userId && r.report_date === date);
    if (existing) {
      existing.content_json = content;
    } else {
      store.dailyReports.push({ id: randomUUID(), user_id: userId, report_date: date, content_json: content, sent_at: null });
    }
  },

  async createInterviewSession(row: InterviewSessionRow) {
    store.interviewSessions.push(row);
  },

  async getInterviewSession(id, userId) {
    return store.interviewSessions.find((s) => s.id === id && s.user_id === userId) ?? null;
  },

  async updateInterviewSession(session) {
    const idx = store.interviewSessions.findIndex((s) => s.id === session.id);
    if (idx >= 0) store.interviewSessions[idx] = session;
  }
};

// Re-exported so api/lib/respond.ts can persist after every request without
// caring which backend is active (the Neon backend is a no-op here).
export { persistStore };
export const ALL_CATEGORY_NAMES = CATEGORIES.map((c) => c.name);
