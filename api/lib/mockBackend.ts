import { randomUUID } from "crypto";
import { db as store, findOrCreateGuestUser, recordCreditTransaction as recordTx, persistStore } from "./mockDb.js";
import type { Db } from "./dbTypes.js";
import type { CompanyAlertRow, InterviewSessionRow } from "../../shared/types.js";

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

  async listRecruitmentNews({ companyName, limit = 50 }) {
    let rows = store.recruitmentNews;
    if (companyName) rows = rows.filter((n) => n.company_name === companyName);
    return [...rows].sort((a, b) => (b.posted_at ?? "").localeCompare(a.posted_at ?? "")).slice(0, limit);
  },

  async getRecruitmentNewsByDate(date) {
    return store.recruitmentNews.filter((n) => n.posted_at === date);
  },

  async insertNewsIfNew(news) {
    const exists = store.recruitmentNews.some((n) => n.external_id === news.external_id);
    if (exists) return false;
    store.recruitmentNews.push({ id: randomUUID(), collected_at: new Date().toISOString(), ...news });
    return true;
  },

  async countNews() {
    return store.recruitmentNews.length;
  },

  async recentNewsTrend(days) {
    const counts = new Map<string, number>();
    for (const n of store.recruitmentNews) {
      if (!n.posted_at) continue;
      counts.set(n.posted_at, (counts.get(n.posted_at) ?? 0) + 1);
    }
    return Array.from({ length: days }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (days - 1 - i));
      const key = date.toISOString().slice(0, 10);
      return { date: key, count: counts.get(key) ?? 0 };
    });
  },

  async getCompanyInfo(companyName) {
    return store.companyInfo.find((c) => c.company_name === companyName) ?? null;
  },

  async upsertCompanyInfo(info) {
    const existing = store.companyInfo.find((c) => c.external_id === info.external_id);
    if (existing) {
      Object.assign(existing, info);
    } else {
      store.companyInfo.push({ id: randomUUID(), collected_at: new Date().toISOString(), ...info });
    }
  },

  async listJobFairs() {
    return [...store.jobFairs].sort((a, b) => (a.start_date ?? "").localeCompare(b.start_date ?? ""));
  },

  async upsertJobFair(fair) {
    const existing = store.jobFairs.find((f) => f.external_id === fair.external_id);
    if (existing) {
      Object.assign(existing, fair);
    } else {
      store.jobFairs.push({ id: randomUUID(), collected_at: new Date().toISOString(), ...fair });
    }
  },

  async listActiveCompanyAlerts(userId) {
    return store.companyAlerts.filter((a) => a.user_id === userId && a.active);
  },

  async countActiveCompanyAlerts(userId) {
    return store.companyAlerts.filter((a) => a.user_id === userId && a.active).length;
  },

  async createCompanyAlert(row) {
    const alert: CompanyAlertRow = { id: randomUUID(), created_at: new Date().toISOString(), ...row };
    store.companyAlerts.push(alert);
    return alert;
  },

  async deactivateCompanyAlert(id, userId) {
    const alert = store.companyAlerts.find((a) => a.id === id && a.user_id === userId);
    if (!alert) return false;
    alert.active = false;
    return true;
  },

  async upsertDailyDigest(userId, date, content) {
    const existing = store.dailyDigests.find((d) => d.user_id === userId && d.digest_date === date);
    if (existing) {
      existing.content_json = content;
    } else {
      store.dailyDigests.push({ id: randomUUID(), user_id: userId, digest_date: date, content_json: content, sent_at: null });
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

export { persistStore };
