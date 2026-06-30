// Unified persistence interface. Two implementations satisfy this:
// - mockBackend.ts: wraps the file-persisted mock store (no DB needed)
// - neonBackend.ts: real Neon/Postgres queries against db/schema.sql
// api/lib/db.ts picks one based on whether DATABASE_URL is set, so route
// handlers never know which backend they're talking to.
import type {
  UserRow,
  JobPostingRow,
  JobCategoryStatRow,
  JobSimilarityRow,
  KeywordAlertRow,
  InterviewSessionRow,
  DailyReportContent,
  CreditTransactionRow
} from "../../shared/types.js";

export type NewPosting = Omit<JobPostingRow, "id" | "collected_at">;

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

  getPostingsSince(category: string, sinceDate: string): Promise<JobPostingRow[]>;
  getPostingsByDate(date: string): Promise<JobPostingRow[]>;
  insertPostingIfNew(posting: NewPosting): Promise<boolean>;
  countPostings(): Promise<number>;

  getStatFrequency(keyword: string, jobCategory: string | null, date: string): Promise<number>;
  recomputeStatsForDate(date: string): Promise<void>;
  getLatestStatDate(): Promise<string | null>;
  getStatsForDate(date: string): Promise<JobCategoryStatRow[]>;

  getSimilarities(categoryA: string): Promise<JobSimilarityRow[]>;
  hasAnySimilarity(): Promise<boolean>;
  upsertSimilarity(a: string, b: string, score: number, shared: string[]): Promise<void>;

  listActiveAlerts(userId: string): Promise<KeywordAlertRow[]>;
  countActiveAlerts(userId: string): Promise<number>;
  createAlert(row: Omit<KeywordAlertRow, "id" | "created_at">): Promise<KeywordAlertRow>;
  deactivateAlert(id: string, userId: string): Promise<boolean>;

  upsertDailyReport(userId: string, date: string, content: DailyReportContent): Promise<void>;

  createInterviewSession(row: InterviewSessionRow): Promise<void>;
  getInterviewSession(id: string, userId: string): Promise<InterviewSessionRow | null>;
  updateInterviewSession(session: InterviewSessionRow): Promise<void>;
}
