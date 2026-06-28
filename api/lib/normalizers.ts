// TODO(api-integration-last): wired against the 사람인 response shape that's
// already confirmed, plus a 잡코리아 shape that's a best-guess from public
// docs until approval — see 잡트렌드 - 상세 기술명세서(구현용).txt §부록.
// Both functions return JobPostingRow-shaped objects (minus id/collected_at)
// so api/cron/collect-postings.ts can insert them directly once live.
import { extractKeywordsFromText } from "./keywordExtractor.js";
import { mapJobKoreaCategory } from "./categoryMap.js";
import type { JobPostingRow } from "../../shared/types.js";

type NewPosting = Omit<JobPostingRow, "id" | "collected_at">;

export function extractIdFromUrl(url: string): string {
  const m = url.match(/rec_idx=(\d+)/);
  return m ? m[1] : url;
}

interface SaraminJob {
  url: string;
  active: number;
  company?: { detail?: { name?: string } };
  position: {
    title: string;
    "job-mid-code"?: { name: string };
    "job-code"?: { name: string };
    location?: { name: string };
    "job-type"?: { name: string };
    "experience-level"?: { min?: number; max?: number };
    "required-education-level"?: { name: string };
  };
  keyword?: string;
  salary?: { code?: string };
}

export function normalizeSaraminJob(job: SaraminJob): NewPosting {
  return {
    source: "saramin",
    external_id: extractIdFromUrl(job.url),
    title: job.position.title,
    company: job.company?.detail?.name ?? null,
    job_category: job.position["job-mid-code"]?.name ?? "기타",
    region: (job.position.location?.name ?? "").split(">")[0].trim() || null,
    employment_type: job.position["job-type"]?.name ?? null,
    experience_min: job.position["experience-level"]?.min ?? null,
    experience_max: job.position["experience-level"]?.max ?? null,
    education_level: job.position["required-education-level"]?.name ?? null,
    salary_code: job.salary?.code ?? null,
    keywords: (job.keyword ?? "").split(",").map((k) => k.trim()).filter(Boolean),
    raw_requirements: job.keyword ?? null,
    posting_url: job.url,
    posted_at: new Date().toISOString().slice(0, 10)
  };
}

export function parseExperienceRange(text: string): { min: number | null; max: number | null } {
  if (text.includes("신입")) return { min: 0, max: 0 };
  const range = text.match(/(\d+)\s*~\s*(\d+)/);
  if (range) return { min: Number(range[1]), max: Number(range[2]) };
  const atLeast = text.match(/(\d+)\s*년\s*이상/);
  if (atLeast) return { min: Number(atLeast[1]), max: null };
  return { min: null, max: null };
}

interface JobKoreaJob {
  gi_no: string | number;
  co_name: string;
  gi_title: string;
  gi_job_cd_nm: string;
  gi_area_nm: string;
  gi_edu_nm: string;
  gi_career_nm: string;
  gi_salary_nm?: string;
  gi_duty: string;
  gi_url: string;
}

export function normalizeJobKoreaJob(rawJob: JobKoreaJob): NewPosting {
  const { min, max } = parseExperienceRange(rawJob.gi_career_nm ?? "");
  return {
    source: "jobkorea",
    external_id: String(rawJob.gi_no),
    title: rawJob.gi_title,
    company: rawJob.co_name,
    job_category: mapJobKoreaCategory(rawJob.gi_job_cd_nm),
    region: rawJob.gi_area_nm ?? null,
    employment_type: null,
    experience_min: min,
    experience_max: max,
    education_level: rawJob.gi_edu_nm ?? null,
    salary_code: null,
    keywords: extractKeywordsFromText(rawJob.gi_duty),
    raw_requirements: rawJob.gi_duty,
    posting_url: rawJob.gi_url,
    posted_at: new Date().toISOString().slice(0, 10)
  };
}
