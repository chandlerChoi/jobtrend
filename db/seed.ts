// One-time setup script for a fresh Neon project: applies db/schema.sql,
// then seeds the same deterministic sample postings/stats the mock backend
// uses, so F1 (trends) and F3 (adjacent jobs) have data to show immediately
// — no need to wait on the 고용24 API key first.
//
// Usage: DATABASE_URL=postgresql://... npx tsx db/seed.ts
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { neon } from "@neondatabase/serverless";
import { CATEGORIES, KEYWORD_DICTIONARY } from "../shared/categories.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set. Copy .env.example to .env and fill it in, or export it inline.");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

function seededRandom(seed: number) {
  let value = seed;
  return () => {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
}

const COMPANIES = ["네오테크", "브리지소프트", "한빛데이터", "스카이랩스", "그린플랫폼", "오로라컴퍼니", "파인트리", "메타베이스", "스텔라랩", "코어나인"];
const EDUCATIONS = ["고졸", "학사", "석사", "무관"];
const REGIONS = ["서울", "경기", "인천", "부산", "대구", "원격근무"];

async function applySchema() {
  const schema = readFileSync(join(__dirname, "schema.sql"), "utf-8");
  const statements = schema.split(";").map((s) => s.trim()).filter(Boolean);
  for (const statement of statements) {
    await sql.query(statement);
  }
  console.log(`Applied ${statements.length} schema statements.`);
}

async function seedPostings() {
  let total = 0;
  for (const [catIdx, category] of CATEGORIES.entries()) {
    const rand = seededRandom(catIdx * 137 + 7);
    const count = 18 + Math.floor(rand() * 14);

    for (let i = 0; i < count; i++) {
      const daysAgo = Math.floor(rand() * 30);
      const postedAt = new Date();
      postedAt.setDate(postedAt.getDate() - daysAgo);

      const keywordCount = 3 + Math.floor(rand() * 4);
      const shuffled = [...category.keywords].sort(() => rand() - 0.5).slice(0, keywordCount);
      const expMin = Math.floor(rand() * 6);
      const expMax = expMin + Math.floor(rand() * 3);

      await sql`
        INSERT INTO job_postings (
          source, external_id, title, company, job_category, region, employment_type,
          experience_min, experience_max, education_level, salary_code, keywords,
          raw_requirements, posting_url, posted_at
        ) VALUES (
          'work24', ${`${category.name}-${i}`}, ${`${category.name} 채용`},
          ${COMPANIES[Math.floor(rand() * COMPANIES.length)]}, ${category.name},
          ${REGIONS[Math.floor(rand() * REGIONS.length)]}, '정규직',
          ${expMin}, ${expMax}, ${EDUCATIONS[Math.floor(rand() * EDUCATIONS.length)]}, '6',
          ${shuffled}, ${shuffled.join(", ")}, ${`https://example.com/postings/${category.name}-${i}`},
          ${postedAt.toISOString().slice(0, 10)}
        )
        ON CONFLICT (source, external_id) DO NOTHING
      `;
      total++;
    }
  }
  console.log(`Seeded ${total} job postings.`);
}

async function seedStats() {
  for (let i = 0; i < 30; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    const dateStr = date.toISOString().slice(0, 10);

    for (const category of CATEGORIES) {
      const postings = await sql`
        SELECT keywords FROM job_postings WHERE job_category = ${category.name} AND posted_at <= ${dateStr}
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
          VALUES (${category.name}, ${keyword}, ${frequency}, ${dateStr})
          ON CONFLICT (job_category, keyword, period_date) DO UPDATE SET frequency = ${frequency}
        `;
      }
    }
  }
  console.log("Seeded 30 days of job_category_stats.");
}

await applySchema();
await seedPostings();
await seedStats();
console.log("Done. F1/F3 will show real query results immediately; F2/F4 work as soon as a user hits the app.");
