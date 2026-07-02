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
  CreditTransactionRow,
  StoryMiningSessionRow,
  StoryCardRow,
  BookmarkRow,
  StoryBankVersion
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

  listRecruitmentNews(opts: {
    companyName?: string;
    limit?: number;
    keyword?: string;       // title OR company_name ILIKE
    size?: string;          // company_type 매핑 (대기업/중견/중소/공공)
    industry?: string;      // title 키워드 매핑
    employmentType?: string; // employment_types ANY
  }): Promise<RecruitmentNewsRow[]>;
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
  listInterviewSessions(userId: string, limit?: number): Promise<InterviewSessionRow[]>;
  updateInterviewSession(session: InterviewSessionRow): Promise<void>;

  createMiningSession(row: StoryMiningSessionRow): Promise<void>;
  getMiningSession(id: string, userId: string): Promise<StoryMiningSessionRow | null>;
  getActiveMiningSession(userId: string): Promise<StoryMiningSessionRow | null>;
  updateMiningSession(session: StoryMiningSessionRow): Promise<void>;
  createStoryCard(row: Omit<StoryCardRow, "id" | "created_at">): Promise<StoryCardRow>;
  listStoryCards(userId: string): Promise<StoryCardRow[]>;
  updateStoryCard(id: string, userId: string, rawAnswers: string[]): Promise<void>;

  addBookmark(userId: string, newsId: string): Promise<BookmarkRow>;
  removeBookmark(userId: string, newsId: string): Promise<boolean>;
  listBookmarkedNews(userId: string): Promise<RecruitmentNewsRow[]>;
  listBookmarkedNewsIds(userId: string): Promise<string[]>;

  createStoryBankVersion(row: Omit<StoryBankVersion, "id" | "created_at" | "updated_at">): Promise<StoryBankVersion>;
  listStoryBankVersions(userId: string): Promise<StoryBankVersion[]>;
  updateStoryBankVersion(id: string, userId: string, storyContent: Record<string, string>): Promise<void>;
  deleteStoryBankVersion(id: string, userId: string): Promise<void>;
}
