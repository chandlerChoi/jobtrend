// Unified persistence interface (v3.0). Two implementations satisfy this:
// - mockBackend.ts: in-memory + file-persisted store (no DB needed)
// - neonBackend.ts: real Neon/Postgres queries against db/schema.sql
// api/lib/db.ts picks one based on whether DATABASE_URL is set.
import type {
  UserRow,
  RecruitmentNewsRow,
  CompanyInfoRow,
  JobFairRow,
  CompanyAlertRow,
  DailyDigestContent,
  InterviewSessionRow,
  CreditTransactionRow
} from "../shared/types.js";

export type NewNews = Omit<RecruitmentNewsRow, "id" | "collected_at">;
export type NewCompanyInfo = Omit<CompanyInfoRow, "id" | "collected_at">;
export type NewJobFair = Omit<JobFairRow, "id" | "collected_at">;

export interface Db {
  getOrCreateUser(userId: string): Promise<UserRow>;
  decrementCredit(userId: string): Promise<number>;
  addCredits(userId: string, amount: number): Promise<number>;
  recordCreditTransaction(
    userId: string,
    type: CreditTransactionRow["type"],
    amount: number,
    balanceAfter: number
  ): Promise<void>;

  listRecruitmentNews(opts: { companyName?: string; limit?: number }): Promise<RecruitmentNewsRow[]>;
  getRecruitmentNewsByDate(date: string): Promise<RecruitmentNewsRow[]>;
  insertNewsIfNew(news: NewNews): Promise<boolean>;
  countNews(): Promise<number>;
  recentNewsTrend(days: number): Promise<{ date: string; count: number }[]>;

  getCompanyInfo(companyName: string): Promise<CompanyInfoRow | null>;
  upsertCompanyInfo(info: NewCompanyInfo): Promise<void>;

  listJobFairs(): Promise<JobFairRow[]>;
  upsertJobFair(fair: NewJobFair): Promise<void>;

  listActiveCompanyAlerts(userId: string): Promise<CompanyAlertRow[]>;
  countActiveCompanyAlerts(userId: string): Promise<number>;
  createCompanyAlert(row: Omit<CompanyAlertRow, "id" | "created_at">): Promise<CompanyAlertRow>;
  deactivateCompanyAlert(id: string, userId: string): Promise<boolean>;

  upsertDailyDigest(userId: string, date: string, content: DailyDigestContent): Promise<void>;

  createInterviewSession(row: InterviewSessionRow): Promise<void>;
  getInterviewSession(id: string, userId: string): Promise<InterviewSessionRow | null>;
  updateInterviewSession(session: InterviewSessionRow): Promise<void>;
}
