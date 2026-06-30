// File-backed stand-in for Neon DB (v3.0 shape). Persisting to a JSON file
// in the OS temp dir survives `vercel dev`/Lambda's per-request process
// forking, which plain module-level state doesn't.
import { randomUUID } from "crypto";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import type {
  UserRow,
  RecruitmentNewsRow,
  CompanyInfoRow,
  JobFairRow,
  CompanyAlertRow,
  DailyDigestRow,
  InterviewSessionRow,
  CreditTransactionRow
} from "../../shared/types.js";

interface Store {
  users: UserRow[];
  recruitmentNews: RecruitmentNewsRow[];
  companyInfo: CompanyInfoRow[];
  jobFairs: JobFairRow[];
  companyAlerts: CompanyAlertRow[];
  dailyDigests: DailyDigestRow[];
  interviewSessions: InterviewSessionRow[];
  creditTransactions: CreditTransactionRow[];
  seeded: boolean;
}

const globalKey = "__jobtrend_mock_db_v3__";
const g = globalThis as unknown as Record<string, Store | undefined>;

function emptyStore(): Store {
  return {
    users: [],
    recruitmentNews: [],
    companyInfo: [],
    jobFairs: [],
    companyAlerts: [],
    dailyDigests: [],
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
const COMPANY_TYPES = ["대기업", "중견기업", "공공기관", "외국계기업", "벤처기업"];
const TITLES = ["신입/경력 공개채용", "수시채용 공고", "하반기 정기채용", "경력직 채용", "인턴 채용"];
const EMPLOYMENT_TYPE_SETS = [["정규직"], ["계약직", "기간제"], ["정규직", "정규직전환형"]];
const AREAS = [
  { code: "51", name: "서울, 강원" },
  { code: "52", name: "부산, 경남" },
  { code: "54", name: "경기, 인천" }
];

function seedRecruitmentNews(store: Store) {
  const rand = seededRandom(42);
  for (let i = 0; i < 120; i++) {
    const daysAgo = Math.floor(rand() * 14);
    const postedAt = new Date();
    postedAt.setDate(postedAt.getDate() - daysAgo);
    const company = COMPANIES[Math.floor(rand() * COMPANIES.length)];

    store.recruitmentNews.push({
      id: randomUUID(),
      external_id: `mock-news-${i}`,
      company_name: company,
      title: `${company} ${TITLES[Math.floor(rand() * TITLES.length)]}`,
      company_type: COMPANY_TYPES[Math.floor(rand() * COMPANY_TYPES.length)],
      employment_types: EMPLOYMENT_TYPE_SETS[Math.floor(rand() * EMPLOYMENT_TYPE_SETS.length)],
      posted_at: postedAt.toISOString().slice(0, 10),
      closing_at: null,
      logo_url: null,
      posting_url: `https://example.com/news/${i}`,
      collected_at: postedAt.toISOString()
    });
  }
}

function seedCompanyInfo(store: Store) {
  const rand = seededRandom(7);
  for (const company of COMPANIES) {
    store.companyInfo.push({
      id: randomUUID(),
      external_id: `mock-co-${company}`,
      company_name: company,
      company_type: COMPANY_TYPES[Math.floor(rand() * COMPANY_TYPES.length)],
      business_no: null,
      intro_summary: `${company} 소개`,
      intro_detail: `${company}는 다양한 사업 영역에서 성장하고 있는 기업입니다.`,
      homepage: null,
      logo_url: null,
      collected_at: new Date().toISOString()
    });
  }
}

function seedJobFairs(store: Store) {
  const rand = seededRandom(99);
  for (let i = 0; i < 6; i++) {
    const daysOut = Math.floor(rand() * 30);
    const start = new Date();
    start.setDate(start.getDate() + daysOut);
    const area = AREAS[Math.floor(rand() * AREAS.length)];

    store.jobFairs.push({
      id: randomUUID(),
      external_id: `mock-fair-${i}`,
      area_code: area.code,
      area: area.name,
      event_name: `${area.name} 채용박람회`,
      event_term: `${start.toISOString().slice(0, 10)} ~ ${start.toISOString().slice(0, 10)}`,
      start_date: start.toISOString().slice(0, 10),
      event_place: `${area.name} 일자리센터`,
      participating_companies: COMPANIES.slice(0, 3).join(", "),
      contact_phone: "1350",
      contact_email: null,
      collected_at: new Date().toISOString()
    });
  }
}

const FILE_PATH = join(tmpdir(), "jobtrend-mock-db-v3.json");

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
    seedRecruitmentNews(store);
    seedCompanyInfo(store);
    seedJobFairs(store);
    store.seeded = true;
    persistStore();
  }
  return store;
}

export const db = {
  get users() {
    return getStore().users;
  },
  get recruitmentNews() {
    return getStore().recruitmentNews;
  },
  get companyInfo() {
    return getStore().companyInfo;
  },
  get jobFairs() {
    return getStore().jobFairs;
  },
  get companyAlerts() {
    return getStore().companyAlerts;
  },
  get dailyDigests() {
    return getStore().dailyDigests;
  },
  get interviewSessions() {
    return getStore().interviewSessions;
  },
  get creditTransactions() {
    return getStore().creditTransactions;
  }
};

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
