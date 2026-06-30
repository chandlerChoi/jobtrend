// Real Neon/Postgres implementation of the Db interface, used once
// DATABASE_URL is set (see api/lib/db.ts). Mirrors db/schema.sql column
// names directly so row shapes need no mapping.
import { neon } from "@neondatabase/serverless";
import { CATEGORIES, KEYWORD_DICTIONARY } from "../../shared/categories.js";
import type { Db } from "./dbTypes.js";
import type { JobCategoryStatRow, DailyReportContent, InterviewSessionRow } from "../../shared/types.js";

function client() {
  return neon(process.env.DATABASE_URL!);
}

export const neonBackend: Db = {
  async getOrCreateUser(userId) {
    const sql = client();
    const existing = await sql`SELECT * FROM users WHERE id = ${userId}`;
    if (existing.length > 0) return existing[0] as any;
    const created = await sql`
      INSERT INTO users (id, email, password_hash, plan_tier, interview_credits)
      VALUES (${userId}, ${`${userId}@guest.jobtrend.local`}, NULL, 'free', 3)
      ON CONFLICT (id) DO UPDATE SET email = users.email
      RETURNING *
    `;
    return created[0] as any;
  },

  async decrementCredit(userId) {
    const sql = client();
    const rows = await sql`
      UPDATE users SET interview_credits = interview_credits - 1
      WHERE id = ${userId} AND interview_credits > 0
      RETURNING interview_credits
    `;
    if (rows.length === 0) return -1;
    return rows[0].interview_credits as number;
  },

  async addCredits(userId, amount) {
    const sql = client();
    const rows = await sql`
      UPDATE users SET interview_credits = interview_credits + ${amount}
      WHERE id = ${userId}
      RETURNING interview_credits
    `;
    return rows[0].interview_credits as number;
  },

  async recordCreditTransaction(userId, type, amount, balanceAfter) {
    const sql = client();
    await sql`
      INSERT INTO credit_transactions (user_id, type, amount, balance_after)
      VALUES (${userId}, ${type}, ${amount}, ${balanceAfter})
    `;
  },

  async getPostingsSince(category, sinceDate) {
    const sql = client();
    const rows = await sql`
      SELECT * FROM job_postings WHERE job_category = ${category} AND posted_at >= ${sinceDate}
    `;
    return rows as any;
  },

  async getPostingsByDate(date) {
    const sql = client();
    const rows = await sql`SELECT * FROM job_postings WHERE posted_at = ${date}`;
    return rows as any;
  },

  async insertPostingIfNew(posting) {
    const sql = client();
    const rows = await sql`
      INSERT INTO job_postings (
        source, external_id, title, company, job_category, region, employment_type,
        experience_min, experience_max, education_level, salary_code, keywords,
        raw_requirements, posting_url, posted_at
      ) VALUES (
        ${posting.source}, ${posting.external_id}, ${posting.title}, ${posting.company},
        ${posting.job_category}, ${posting.region}, ${posting.employment_type},
        ${posting.experience_min}, ${posting.experience_max}, ${posting.education_level},
        ${posting.salary_code}, ${posting.keywords}, ${posting.raw_requirements},
        ${posting.posting_url}, ${posting.posted_at}
      )
      ON CONFLICT (source, external_id) DO NOTHING
      RETURNING id
    `;
    return rows.length > 0;
  },

  async countPostings() {
    const sql = client();
    const rows = await sql`SELECT count(*)::int AS count FROM job_postings`;
    return rows[0].count as number;
  },

  async getStatFrequency(keyword, jobCategory, date) {
    const sql = client();
    const rows = jobCategory
      ? await sql`
          SELECT coalesce(sum(frequency), 0)::int AS total FROM job_category_stats
          WHERE keyword = ${keyword} AND period_date = ${date} AND job_category = ${jobCategory}
        `
      : await sql`
          SELECT coalesce(sum(frequency), 0)::int AS total FROM job_category_stats
          WHERE keyword = ${keyword} AND period_date = ${date}
        `;
    return rows[0].total as number;
  },

  async recomputeStatsForDate(date) {
    const sql = client();
    for (const category of CATEGORIES) {
      const postings = await sql`
        SELECT keywords FROM job_postings WHERE job_category = ${category.name} AND posted_at <= ${date}
      `;
      const freq = new Map<string, number>();
      for (const row of postings as any[]) {
        for (const k of row.keywords as string[]) freq.set(k, (freq.get(k) ?? 0) + 1);
      }
      for (const keyword of KEYWORD_DICTIONARY) {
        const frequency = freq.get(keyword) ?? 0;
        if (frequency === 0) continue;
        await sql`
          INSERT INTO job_category_stats (job_category, keyword, frequency, period_date)
          VALUES (${category.name}, ${keyword}, ${frequency}, ${date})
          ON CONFLICT (job_category, keyword, period_date) DO UPDATE SET frequency = ${frequency}
        `;
      }
    }
  },

  async getLatestStatDate() {
    const sql = client();
    const rows = await sql`SELECT max(period_date) AS latest FROM job_category_stats`;
    return (rows[0]?.latest as string) ?? null;
  },

  async getStatsForDate(date) {
    const sql = client();
    const rows = await sql`SELECT * FROM job_category_stats WHERE period_date = ${date}`;
    return rows as unknown as JobCategoryStatRow[];
  },

  async getSimilarities(categoryA) {
    const sql = client();
    const rows = await sql`
      SELECT * FROM job_similarity WHERE job_category_a = ${categoryA} ORDER BY similarity_score DESC
    `;
    return rows as any;
  },

  async hasAnySimilarity() {
    const sql = client();
    const rows = await sql`SELECT count(*)::int AS count FROM job_similarity`;
    return (rows[0].count as number) > 0;
  },

  async upsertSimilarity(a, b, score, shared) {
    const sql = client();
    await sql`
      INSERT INTO job_similarity (job_category_a, job_category_b, similarity_score, shared_keywords, computed_at)
      VALUES (${a}, ${b}, ${score}, ${shared}, now())
      ON CONFLICT (job_category_a, job_category_b)
      DO UPDATE SET similarity_score = ${score}, shared_keywords = ${shared}, computed_at = now()
    `;
  },

  async listActiveAlerts(userId) {
    const sql = client();
    const rows = await sql`SELECT * FROM keyword_alerts WHERE user_id = ${userId} AND active = true`;
    return rows as any;
  },

  async countActiveAlerts(userId) {
    const sql = client();
    const rows = await sql`
      SELECT count(*)::int AS count FROM keyword_alerts WHERE user_id = ${userId} AND active = true
    `;
    return rows[0].count as number;
  },

  async createAlert(row) {
    const sql = client();
    const rows = await sql`
      INSERT INTO keyword_alerts (user_id, keyword, job_category, region, channel, active)
      VALUES (${row.user_id}, ${row.keyword}, ${row.job_category}, ${row.region}, ${row.channel}, ${row.active})
      RETURNING *
    `;
    return rows[0] as any;
  },

  async deactivateAlert(id, userId) {
    const sql = client();
    const rows = await sql`
      UPDATE keyword_alerts SET active = false WHERE id = ${id} AND user_id = ${userId}
      RETURNING id
    `;
    return rows.length > 0;
  },

  async upsertDailyReport(userId, date, content: DailyReportContent) {
    const sql = client();
    await sql`
      INSERT INTO daily_reports (user_id, report_date, content_json)
      VALUES (${userId}, ${date}, ${JSON.stringify(content)})
      ON CONFLICT (user_id, report_date) DO UPDATE SET content_json = ${JSON.stringify(content)}
    `;
  },

  async createInterviewSession(row: InterviewSessionRow) {
    const sql = client();
    await sql`
      INSERT INTO interview_sessions (id, user_id, job_category, jd_text, resume_text, questions_json, answers_json, feedback_json, status)
      VALUES (
        ${row.id}, ${row.user_id}, ${row.job_category}, ${row.jd_text}, ${row.resume_text},
        ${JSON.stringify(row.questions_json)}, ${JSON.stringify(row.answers_json)},
        ${row.feedback_json ? JSON.stringify(row.feedback_json) : null}, ${row.status}
      )
    `;
  },

  async getInterviewSession(id, userId) {
    const sql = client();
    const rows = await sql`SELECT * FROM interview_sessions WHERE id = ${id} AND user_id = ${userId}`;
    return (rows[0] as any) ?? null;
  },

  async updateInterviewSession(session) {
    const sql = client();
    await sql`
      UPDATE interview_sessions SET
        answers_json = ${JSON.stringify(session.answers_json)},
        feedback_json = ${session.feedback_json ? JSON.stringify(session.feedback_json) : null},
        status = ${session.status}
      WHERE id = ${session.id}
    `;
  }
};
