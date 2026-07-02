// Real Neon/Postgres implementation of the Db interface (v3.0), used once
// DATABASE_URL is set (see api/lib/db.ts). Mirrors db/schema.sql column
// names directly so row shapes need no mapping.
import { neon } from "@neondatabase/serverless";
import type { Db } from "./dbTypes.js";
import type { DailyDigestContent, InterviewSessionRow } from "../shared/types.js";

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

  async listRecruitmentNews({ companyName, limit = 50, keyword, size, industry, employmentType }) {
    const sql = client();

    // industry → title 키워드 매핑
    const INDUSTRY_KEYWORDS: Record<string, string[]> = {
      "IT·SW":   ["IT", "소프트웨어", "개발", "정보", "시스템", "클라우드", "데이터", "AI"],
      "제조":    ["제조", "생산", "공장", "엔지니어링", "기계", "전자"],
      "금융":    ["금융", "은행", "보험", "증권", "투자", "핀테크"],
      "공공기관":["공공", "기관", "공사", "청", "원"],
      "유통·서비스": ["유통", "서비스", "물류", "리테일", "판매"],
    };
    const industryKw = industry ? (INDUSTRY_KEYWORDS[industry] ?? [industry]) : [];

    // size → company_type 매핑
    const SIZE_MAP: Record<string, string[]> = {
      "대기업": ["대기업"],
      "중견":   ["중견기업"],
      "중소":   ["중소기업", "벤처기업"],
      "공공":   ["공공기관"],
    };
    const sizeTypes = size ? (SIZE_MAP[size] ?? [size]) : [];

    const rows = await sql`
      SELECT * FROM recruitment_news
      WHERE
        -- companyName 필터
        (${companyName ?? null}::text IS NULL OR company_name = ${companyName ?? null})
        -- keyword 검색 (제목 OR 기업명)
        AND (${keyword ?? null}::text IS NULL
             OR title ILIKE '%' || ${keyword ?? null} || '%'
             OR company_name ILIKE '%' || ${keyword ?? null} || '%')
        -- size 필터 (company_type)
        AND (${sizeTypes.length === 0}
             OR company_type = ANY(${sizeTypes}))
        -- industry 필터 (title 키워드 OR 매칭)
        AND (${industryKw.length === 0}
             OR EXISTS (
               SELECT 1 FROM unnest(${industryKw}::text[]) AS kw
               WHERE title ILIKE '%' || kw || '%'
                  OR company_name ILIKE '%' || kw || '%'
             ))
        -- employmentType 필터
        AND (${employmentType ?? null}::text IS NULL
             OR ${employmentType ?? null} = ANY(employment_types))
      ORDER BY posted_at DESC NULLS LAST
      LIMIT ${limit}
    `;
    return rows as any;
  },

  async getRecruitmentNewsByDate(date) {
    const sql = client();
    const rows = await sql`SELECT * FROM recruitment_news WHERE posted_at = ${date}`;
    return rows as any;
  },

  async insertNewsIfNew(news) {
    const sql = client();
    const rows = await sql`
      INSERT INTO recruitment_news (
        external_id, company_name, title, company_type, employment_types,
        posted_at, closing_at, logo_url, posting_url
      ) VALUES (
        ${news.external_id}, ${news.company_name}, ${news.title}, ${news.company_type},
        ${news.employment_types}, ${news.posted_at}, ${news.closing_at}, ${news.logo_url}, ${news.posting_url}
      )
      ON CONFLICT (external_id) DO NOTHING
      RETURNING id
    `;
    return rows.length > 0;
  },

  async countNews() {
    const sql = client();
    const rows = await sql`SELECT count(*)::int AS count FROM recruitment_news`;
    return rows[0].count as number;
  },

  async recentNewsTrend(days) {
    const sql = client();
    const rows = await sql`
      SELECT posted_at::text AS date, count(*)::int AS count FROM recruitment_news
      WHERE posted_at >= (CURRENT_DATE - ${days}::int)
      GROUP BY posted_at
    `;
    const byDate = new Map((rows as any[]).map((r) => [r.date, r.count]));
    return Array.from({ length: days }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (days - 1 - i));
      const key = date.toISOString().slice(0, 10);
      return { date: key, count: byDate.get(key) ?? 0 };
    });
  },

  async getCompanyInfo(companyName) {
    const sql = client();
    const rows = await sql`SELECT * FROM company_info WHERE company_name = ${companyName} LIMIT 1`;
    return (rows[0] as any) ?? null;
  },

  async upsertCompanyInfo(info) {
    const sql = client();
    await sql`
      INSERT INTO company_info (
        external_id, company_name, company_type, business_no, intro_summary,
        intro_detail, homepage, logo_url
      ) VALUES (
        ${info.external_id}, ${info.company_name}, ${info.company_type}, ${info.business_no},
        ${info.intro_summary}, ${info.intro_detail}, ${info.homepage}, ${info.logo_url}
      )
      ON CONFLICT (external_id) DO UPDATE SET
        company_type = ${info.company_type}, intro_summary = ${info.intro_summary},
        intro_detail = ${info.intro_detail}, homepage = ${info.homepage}, logo_url = ${info.logo_url}
    `;
  },

  async listJobFairs() {
    const sql = client();
    const rows = await sql`SELECT * FROM job_fairs ORDER BY start_date NULLS LAST`;
    return rows as any;
  },

  async upsertJobFair(fair) {
    const sql = client();
    await sql`
      INSERT INTO job_fairs (
        external_id, area_code, area, event_name, event_term, start_date,
        event_place, participating_companies, contact_phone, contact_email
      ) VALUES (
        ${fair.external_id}, ${fair.area_code}, ${fair.area}, ${fair.event_name}, ${fair.event_term},
        ${fair.start_date}, ${fair.event_place}, ${fair.participating_companies}, ${fair.contact_phone}, ${fair.contact_email}
      )
      ON CONFLICT (external_id) DO UPDATE SET
        event_place = ${fair.event_place}, participating_companies = ${fair.participating_companies},
        contact_phone = ${fair.contact_phone}, contact_email = ${fair.contact_email}
    `;
  },

  async listActiveCompanyAlerts(userId) {
    const sql = client();
    const rows = await sql`SELECT * FROM company_alerts WHERE user_id = ${userId} AND active = true`;
    return rows as any;
  },

  async countActiveCompanyAlerts(userId) {
    const sql = client();
    const rows = await sql`
      SELECT count(*)::int AS count FROM company_alerts WHERE user_id = ${userId} AND active = true
    `;
    return rows[0].count as number;
  },

  async createCompanyAlert(row) {
    const sql = client();
    const rows = await sql`
      INSERT INTO company_alerts (user_id, company_name, channel, active)
      VALUES (${row.user_id}, ${row.company_name}, ${row.channel}, ${row.active})
      RETURNING *
    `;
    return rows[0] as any;
  },

  async deactivateCompanyAlert(id, userId) {
    const sql = client();
    const rows = await sql`
      UPDATE company_alerts SET active = false WHERE id = ${id} AND user_id = ${userId}
      RETURNING id
    `;
    return rows.length > 0;
  },

  async upsertDailyDigest(userId, date, content: DailyDigestContent) {
    const sql = client();
    await sql`
      INSERT INTO daily_digests (user_id, digest_date, content_json)
      VALUES (${userId}, ${date}, ${JSON.stringify(content)})
      ON CONFLICT (user_id, digest_date) DO UPDATE SET content_json = ${JSON.stringify(content)}
    `;
  },

  async createInterviewSession(row: InterviewSessionRow) {
    const sql = client();
    await sql`
      INSERT INTO interview_sessions (id, user_id, persona_type, jd_text, resume_text, questions_json, answers_json, feedback_json, status)
      VALUES (
        ${row.id}, ${row.user_id}, ${row.persona_type ?? "startup"}, ${row.jd_text}, ${row.resume_text},
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

  async listInterviewSessions(userId, limit = 20) {
    const sql = client();
    const rows = await sql`
      SELECT * FROM interview_sessions
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;
    return rows as any;
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
  },

  async createMiningSession(row) {
    const sql = client();
    await sql`
      INSERT INTO story_mining_sessions (id, user_id, slot_index, slot_state, transcript, status)
      VALUES (${row.id}, ${row.user_id}, ${row.slot_index}, ${JSON.stringify(row.slot_state)}, ${JSON.stringify(row.transcript)}, ${row.status})
    `;
  },

  async getMiningSession(id, userId) {
    const sql = client();
    const rows = await sql`
      SELECT * FROM story_mining_sessions WHERE id = ${id} AND user_id = ${userId}
    `;
    return (rows[0] as any) ?? null;
  },

  async getActiveMiningSession(userId) {
    const sql = client();
    const rows = await sql`
      SELECT * FROM story_mining_sessions
      WHERE user_id = ${userId} AND status = 'in_progress'
      ORDER BY updated_at DESC
      LIMIT 1
    `;
    return (rows[0] as any) ?? null;
  },

  async updateMiningSession(session) {
    const sql = client();
    await sql`
      UPDATE story_mining_sessions SET
        slot_index = ${session.slot_index},
        slot_state = ${JSON.stringify(session.slot_state)},
        transcript = ${JSON.stringify(session.transcript)},
        status = ${session.status},
        updated_at = now()
      WHERE id = ${session.id}
    `;
  },

  async createStoryCard(row) {
    const sql = client();
    const rows = await sql`
      INSERT INTO story_cards (user_id, slot_id, slot_name, raw_answers, modules_filled, status)
      VALUES (
        ${row.user_id}, ${row.slot_id}, ${row.slot_name},
        ${JSON.stringify(row.raw_answers)}, ${JSON.stringify(row.modules_filled)}, ${row.status}
      )
      RETURNING *
    `;
    return rows[0] as any;
  },

  async listStoryCards(userId) {
    const sql = client();
    const rows = await sql`
      SELECT * FROM story_cards WHERE user_id = ${userId} ORDER BY created_at ASC
    `;
    return rows as any;
  },

  async updateStoryCard(id, userId, rawAnswers) {
    const sql = client();
    await sql`
      UPDATE story_cards
      SET raw_answers = ${JSON.stringify(rawAnswers)}::jsonb
      WHERE id = ${id} AND user_id = ${userId}
    `;
  },

  async addBookmark(userId, newsId) {
    const sql = client();
    const rows = await sql`
      INSERT INTO bookmarks (user_id, news_id)
      VALUES (${userId}, ${newsId})
      ON CONFLICT (user_id, news_id) DO UPDATE SET news_id = bookmarks.news_id
      RETURNING *
    `;
    return rows[0] as any;
  },

  async removeBookmark(userId, newsId) {
    const sql = client();
    const rows = await sql`
      DELETE FROM bookmarks WHERE user_id = ${userId} AND news_id = ${newsId} RETURNING id
    `;
    return rows.length > 0;
  },

  async listBookmarkedNews(userId) {
    const sql = client();
    const rows = await sql`
      SELECT n.* FROM recruitment_news n
      JOIN bookmarks b ON b.news_id = n.id
      WHERE b.user_id = ${userId}
      ORDER BY b.created_at DESC
    `;
    return rows as any;
  },

  async listBookmarkedNewsIds(userId) {
    const sql = client();
    const rows = await sql`SELECT news_id FROM bookmarks WHERE user_id = ${userId}`;
    return (rows as any[]).map((r) => r.news_id);
  },

  async createStoryBankVersion(row) {
    const sql = client();
    const rows = await sql`
      INSERT INTO story_bank_versions (user_id, version_name, job_posting_text, company_name, story_content)
      VALUES (${row.user_id}, ${row.version_name}, ${row.job_posting_text ?? null},
              ${row.company_name ?? null}, ${JSON.stringify(row.story_content)})
      RETURNING *
    `;
    return rows[0] as any;
  },

  async listStoryBankVersions(userId) {
    const sql = client();
    const rows = await sql`
      SELECT * FROM story_bank_versions WHERE user_id = ${userId} ORDER BY updated_at DESC
    `;
    return rows as any;
  },

  async updateStoryBankVersion(id, userId, storyContent) {
    const sql = client();
    await sql`
      UPDATE story_bank_versions
      SET story_content = ${JSON.stringify(storyContent)}, updated_at = NOW()
      WHERE id = ${id} AND user_id = ${userId}
    `;
  },

  async deleteStoryBankVersion(id, userId) {
    const sql = client();
    await sql`DELETE FROM story_bank_versions WHERE id = ${id} AND user_id = ${userId}`;
  }
};
