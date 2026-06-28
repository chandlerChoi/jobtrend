// File-backed stand-in for Neon DB, shaped exactly like db/schema.sql.
// TODO(api-integration-last): swap for a real @neondatabase/serverless client
// once 사람인/잡코리아 keys are approved. Until then every /api route
// reads/writes this store, so swapping the persistence layer later doesn't
// require touching route handlers.
//
// Plain in-memory state doesn't work here: `vercel dev` (and real Lambda
// cold starts) can run each request in a fresh process, so a module-level
// object would silently reset between calls. Persisting to a JSON file in
// the OS temp dir survives that without standing up a real database.
import { randomUUID } from "crypto";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { CATEGORIES, KEYWORD_DICTIONARY } from "../../shared/categories.js";
import type {
  UserRow,
  JobPostingRow,
  JobCategoryStatRow,
  JobSimilarityRow,
  KeywordAlertRow,
  DailyReportRow,
  InterviewSessionRow,
  CreditTransactionRow
} from "../../shared/types.js";

interface Store {
  users: UserRow[];
  jobPostings: JobPostingRow[];
  jobCategoryStats: JobCategoryStatRow[];
  jobSimilarity: JobSimilarityRow[];
  keywordAlerts: KeywordAlertRow[];
  dailyReports: DailyReportRow[];
  interviewSessions: InterviewSessionRow[];
  creditTransactions: CreditTransactionRow[];
  seeded: boolean;
}

const globalKey = "__jobtrend_mock_db__";
const g = globalThis as unknown as Record<string, Store | undefined>;

function emptyStore(): Store {
  return {
    users: [],
    jobPostings: [],
    jobCategoryStats: [],
    jobSimilarity: [],
    keywordAlerts: [],
    dailyReports: [],
    interviewSessions: [],
    creditTransactions: [],
    seeded: false
  };
}

function seededRandom(seed: number) {
  let value = seed;
  return () => {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
}

const COMPANIES = ["네오테크", "브리지소프트", "한빛데이터", "스카이랩스", "그린플랫폼", "오로라컴퍼니", "파인트리", "메타베이스", "스텔라랩", "코어나인"];
const EDUCATIONS = ["고졸", "학사", "석사", "무관"];

function seedJobPostings(store: Store) {
  for (const [catIdx, category] of CATEGORIES.entries()) {
    const rand = seededRandom(catIdx * 137 + 7);
    const count = 18 + Math.floor(rand() * 14);

    for (let i = 0; i < count; i++) {
      const daysAgo = Math.floor(rand() * 30);
      const postedAt = new Date();
      postedAt.setDate(postedAt.getDate() - daysAgo);

      const keywordCount = 3 + Math.floor(rand() * 4);
      const shuffled = [...category.keywords].sort(() => rand() - 0.5);
      const expMin = Math.floor(rand() * 6);
      const expMax = expMin + Math.floor(rand() * 3);

      store.jobPostings.push({
        id: randomUUID(),
        source: rand() > 0.5 ? "saramin" : "jobkorea",
        external_id: `${category.name}-${i}`,
        title: `${category.name} 채용`,
        company: COMPANIES[Math.floor(rand() * COMPANIES.length)],
        job_category: category.name,
        region: ["서울", "경기", "인천", "부산", "대구", "원격근무"][Math.floor(rand() * 6)],
        employment_type: "정규직",
        experience_min: expMin,
        experience_max: expMax,
        education_level: EDUCATIONS[Math.floor(rand() * EDUCATIONS.length)],
        salary_code: "6",
        keywords: shuffled.slice(0, keywordCount),
        raw_requirements: shuffled.slice(0, keywordCount).join(", "),
        posting_url: `https://example.com/postings/${category.name}-${i}`,
        posted_at: postedAt.toISOString().slice(0, 10),
        collected_at: postedAt.toISOString()
      });
    }
  }
}

function computeStatsForDate(store: Store, dateStr: string) {
  for (const category of CATEGORIES) {
    const postings = store.jobPostings.filter(
      (p) => p.job_category === category.name && p.posted_at <= dateStr
    );
    const freq = new Map<string, number>();
    for (const p of postings) {
      for (const k of p.keywords) freq.set(k, (freq.get(k) ?? 0) + 1);
    }
    for (const keyword of KEYWORD_DICTIONARY) {
      const frequency = freq.get(keyword) ?? 0;
      if (frequency === 0) continue;
      const existing = store.jobCategoryStats.find(
        (s) => s.job_category === category.name && s.keyword === keyword && s.period_date === dateStr
      );
      if (existing) {
        existing.frequency = frequency;
      } else {
        store.jobCategoryStats.push({
          id: randomUUID(),
          job_category: category.name,
          keyword,
          frequency,
          period_date: dateStr
        });
      }
    }
  }
}

function seedStats(store: Store) {
  for (let i = 0; i < 30; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    computeStatsForDate(store, date.toISOString().slice(0, 10));
  }
}

const FILE_PATH = join(tmpdir(), "jobtrend-mock-db.json");

function loadFromDisk(): Store | null {
  try {
    return JSON.parse(readFileSync(FILE_PATH, "utf-8")) as Store;
  } catch {
    return null;
  }
}

export function persistStore(): void {
  const store = g[globalKey];
  if (store) writeFileSync(FILE_PATH, JSON.stringify(store));
}

function getStore(): Store {
  if (!g[globalKey]) {
    g[globalKey] = loadFromDisk() ?? emptyStore();
  }
  const store = g[globalKey]!;
  if (!store.seeded) {
    seedJobPostings(store);
    seedStats(store);
    store.seeded = true;
    persistStore();
  }
  return store;
}

export const db = {
  get users() {
    return getStore().users;
  },
  get jobPostings() {
    return getStore().jobPostings;
  },
  get jobCategoryStats() {
    return getStore().jobCategoryStats;
  },
  get jobSimilarity() {
    return getStore().jobSimilarity;
  },
  get keywordAlerts() {
    return getStore().keywordAlerts;
  },
  get dailyReports() {
    return getStore().dailyReports;
  },
  get interviewSessions() {
    return getStore().interviewSessions;
  },
  get creditTransactions() {
    return getStore().creditTransactions;
  },
  recomputeStatsForToday() {
    computeStatsForDate(getStore(), new Date().toISOString().slice(0, 10));
  }
};

export function createUser(email: string, passwordHash: string | null): UserRow {
  const user: UserRow = {
    id: randomUUID(),
    email,
    password_hash: passwordHash,
    plan_tier: "free",
    interview_credits: 3,
    created_at: new Date().toISOString()
  };
  db.users.push(user);
  return user;
}

export function findOrCreateGuestUser(userId: string): UserRow {
  let user = db.users.find((u) => u.id === userId);
  if (!user) {
    user = {
      id: userId,
      email: `${userId}@guest.jobtrend.local`,
      password_hash: null,
      plan_tier: "free",
      interview_credits: 3,
      created_at: new Date().toISOString()
    };
    db.users.push(user);
  }
  return user;
}

export function recordCreditTransaction(
  userId: string,
  type: CreditTransactionRow["type"],
  amount: number,
  balanceAfter: number
) {
  db.creditTransactions.push({
    id: randomUUID(),
    user_id: userId,
    type,
    amount,
    balance_after: balanceAfter,
    created_at: new Date().toISOString()
  });
}
