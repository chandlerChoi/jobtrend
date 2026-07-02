import { randomUUID } from "crypto";
import { db as store, findOrCreateGuestUser, recordCreditTransaction as recordTx, persistStore } from "./mockDb.js";
import type { Db } from "./dbTypes.js";
import type { CompanyAlertRow, InterviewSessionRow } from "../shared/types.js";

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

  async listRecruitmentNews({ companyName, limit = 50, keyword, size, industry, employmentType }) {
    const INDUSTRY_KEYWORDS: Record<string, string[]> = {
      "IT·SW":   ["IT", "소프트웨어", "개발", "정보", "시스템", "클라우드", "데이터", "AI"],
      "제조":    ["제조", "생산", "공장", "엔지니어링", "기계", "전자"],
      "금융":    ["금융", "은행", "보험", "증권", "투자", "핀테크"],
      "공공기관":["공공", "기관", "공사"],
      "유통·서비스": ["유통", "서비스", "물류", "리테일", "판매"],
    };
    const SIZE_MAP: Record<string, string[]> = {
      "대기업": ["대기업"],
      "중견":   ["중견기업"],
      "중소":   ["중소기업", "벤처기업"],
      "공공":   ["공공기관"],
    };

    let rows = store.recruitmentNews;
    if (companyName) rows = rows.filter((n) => n.company_name === companyName);
    if (keyword) {
      const kw = keyword.toLowerCase();
      rows = rows.filter((n) =>
        n.title.toLowerCase().includes(kw) || n.company_name.toLowerCase().includes(kw)
      );
    }
    if (size) {
      const types = SIZE_MAP[size] ?? [size];
      rows = rows.filter((n) => n.company_type && types.includes(n.company_type));
    }
    if (industry) {
      const kws = INDUSTRY_KEYWORDS[industry] ?? [industry];
      rows = rows.filter((n) =>
        kws.some((kw) =>
          n.title.toLowerCase().includes(kw.toLowerCase()) ||
          n.company_name.toLowerCase().includes(kw.toLowerCase())
        )
      );
    }
    if (employmentType) {
      rows = rows.filter((n) => n.employment_types.includes(employmentType));
    }
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

  async listInterviewSessions(userId, limit = 20) {
    return store.interviewSessions
      .filter((s) => s.user_id === userId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, limit);
  },

  async getInterviewSession(id, userId) {
    return store.interviewSessions.find((s) => s.id === id && s.user_id === userId) ?? null;
  },

  async updateInterviewSession(session) {
    const idx = store.interviewSessions.findIndex((s) => s.id === session.id);
    if (idx >= 0) store.interviewSessions[idx] = session;
  },

  async createMiningSession(row) {
    store.storyMiningSessions.push(row);
  },

  async getMiningSession(id, userId) {
    return store.storyMiningSessions.find((s) => s.id === id && s.user_id === userId) ?? null;
  },

  async getActiveMiningSession(userId) {
    const actives = store.storyMiningSessions
      .filter((s) => s.user_id === userId && s.status === "in_progress")
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    return actives[0] ?? null;
  },

  async updateMiningSession(session) {
    const idx = store.storyMiningSessions.findIndex((s) => s.id === session.id);
    if (idx >= 0) store.storyMiningSessions[idx] = session;
  },

  async createStoryCard(row) {
    const card = { id: randomUUID(), created_at: new Date().toISOString(), ...row };
    store.storyCards.push(card);
    return card;
  },

  async listStoryCards(userId) {
    return store.storyCards.filter((c) => c.user_id === userId);
  },

  async addBookmark(userId, newsId) {
    const existing = store.bookmarks.find((b) => b.user_id === userId && b.news_id === newsId);
    if (existing) return existing;
    const bookmark = { id: randomUUID(), user_id: userId, news_id: newsId, created_at: new Date().toISOString() };
    store.bookmarks.push(bookmark);
    return bookmark;
  },

  async removeBookmark(userId, newsId) {
    const idx = store.bookmarks.findIndex((b) => b.user_id === userId && b.news_id === newsId);
    if (idx < 0) return false;
    store.bookmarks.splice(idx, 1);
    return true;
  },

  async listBookmarkedNews(userId) {
    const ids = new Set(store.bookmarks.filter((b) => b.user_id === userId).map((b) => b.news_id));
    return store.recruitmentNews.filter((n) => ids.has(n.id));
  },

  async listBookmarkedNewsIds(userId) {
    return store.bookmarks.filter((b) => b.user_id === userId).map((b) => b.news_id);
  },

  async createStoryBankVersion(row) {
    const version = {
      id: randomUUID(),
      ...row,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    store.storyBankVersions.push(version);
    return version;
  },

  async listStoryBankVersions(userId) {
    return store.storyBankVersions.filter((v) => v.user_id === userId)
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  },

  async updateStoryBankVersion(id, userId, storyContent) {
    const v = store.storyBankVersions.find((v) => v.id === id && v.user_id === userId);
    if (v) { v.story_content = storyContent; v.updated_at = new Date().toISOString(); }
  },

  async deleteStoryBankVersion(id, userId) {
    const idx = store.storyBankVersions.findIndex((v) => v.id === id && v.user_id === userId);
    if (idx >= 0) store.storyBankVersions.splice(idx, 1);
  }
};

export { persistStore };
