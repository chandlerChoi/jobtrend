// One-time setup for a Neon project: applies db/schema.sql, then runs the
// same ingestion the cron job does (api/cron/collect-news.ts) so F1/F3 have
// real 고용24 data to show immediately instead of waiting for the next
// scheduled run.
// Usage: DATABASE_URL=postgresql://... WORK24_API_KEY=... npx tsx db/seed.ts
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { Client } from "@neondatabase/serverless";
import { neonBackend } from "../api/lib/neonBackend.js";
import { fetchRecruitmentNews, fetchCompanyInfo, fetchJobFairs } from "../api/lib/normalizers.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set. Copy .env.example to .env and fill it in, or export it inline.");
  process.exit(1);
}

async function applySchema() {
  const schema = readFileSync(join(__dirname, "schema.sql"), "utf-8");
  const client = new Client(process.env.DATABASE_URL);
  await client.connect();
  await client.query(schema);
  await client.end();
  console.log("Applied schema.sql.");
}

async function collectReal() {
  if (!process.env.WORK24_API_KEY) {
    console.log("WORK24_API_KEY not set — skipping real data collection (schema is still applied).");
    return;
  }

  let newsInserted = 0;
  const news = await fetchRecruitmentNews(1, 100);
  for (const item of news) {
    if (await neonBackend.insertNewsIfNew(item)) newsInserted++;
  }
  console.log(`Inserted ${newsInserted}/${news.length} recruitment news items.`);

  const companies = await fetchCompanyInfo(1, 100);
  for (const item of companies) await neonBackend.upsertCompanyInfo(item);
  console.log(`Upserted ${companies.length} company info rows.`);

  const fairs = await fetchJobFairs(1, 20);
  for (const fair of fairs) await neonBackend.upsertJobFair(fair);
  console.log(`Upserted ${fairs.length} job fairs.`);
}

await applySchema();
await collectReal();
console.log("Done.");
