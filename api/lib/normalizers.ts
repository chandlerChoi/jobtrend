// 고용24(워크넷) Open API — all 3 field sets below are confirmed against
// live responses (개인회원 access only; 채용정보목록/상세 is blocked with
// "개인회원은 사용할 수 없는 OPEN-API입니다." — see 잡트렌드 기술명세서 v3.0 §0).
import { XMLParser } from "fast-xml-parser";
import type { RecruitmentNewsRow, CompanyInfoRow, JobFairRow } from "../../shared/types.js";

const BASE = "https://www.work24.go.kr/cm/openApi/call/wk";
const parser = new XMLParser();

function authKey(): string {
  const key = process.env.WORK24_API_KEY;
  if (!key) throw new Error("WORK24_API_KEY not set");
  return key;
}

async function getXml(path: string, params: Record<string, string>) {
  const qs = new URLSearchParams({ authKey: authKey(), ...params }).toString();
  const res = await fetch(`${BASE}/${path}?${qs}`);
  const xml = await res.text();
  const parsed = parser.parse(xml);
  if (parsed.GO24?.error) throw new Error(`Work24 API error: ${parsed.GO24.error}`);
  return parsed;
}

function asArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export function parseWork24Yyyymmdd(value: string | number | undefined): string | null {
  // fast-xml-parser auto-coerces numeric-looking tag text (e.g. "20260625")
  // into a JS number, so normalize back to string before slicing.
  if (value === undefined || value === null) return null;
  const str = String(value);
  if (str.length !== 8) return null;
  return `${str.slice(0, 4)}-${str.slice(4, 6)}-${str.slice(6, 8)}`;
}

// ── 공채속보 (210L21) ────────────────────────────────────────────────────
interface RawRecruitmentNews {
  empSeqno: string | number;
  empWantedTitle: string;
  empBusiNm: string;
  coClcdNm?: string;
  empWantedStdt?: string | number;
  empWantedEndt?: string | number;
  empWantedTypeNm?: string;
  regLogImgNm?: string;
  empWantedHomepgDetail?: string;
}

export function normalizeRecruitmentNews(raw: RawRecruitmentNews): Omit<RecruitmentNewsRow, "id" | "collected_at"> {
  return {
    external_id: String(raw.empSeqno),
    company_name: raw.empBusiNm,
    title: raw.empWantedTitle,
    company_type: raw.coClcdNm || null,
    employment_types: (raw.empWantedTypeNm ?? "").split("|").map((s) => s.trim()).filter(Boolean),
    posted_at: parseWork24Yyyymmdd(raw.empWantedStdt),
    closing_at: parseWork24Yyyymmdd(raw.empWantedEndt),
    logo_url: raw.regLogImgNm || null,
    posting_url: raw.empWantedHomepgDetail || null
  };
}

export async function fetchRecruitmentNews(page = 1, display = 100): Promise<Omit<RecruitmentNewsRow, "id" | "collected_at">[]> {
  const data = await getXml("callOpenApiSvcInfo210L21.do", {
    callTp: "L",
    returnType: "XML",
    startPage: String(page),
    display: String(display)
  });
  const items = asArray<RawRecruitmentNews>(data.dhsOpenEmpInfoList?.dhsOpenEmpInfo);
  return items.map(normalizeRecruitmentNews);
}

// ── 공채기업정보 (210L31) ────────────────────────────────────────────────
interface RawCompanyInfo {
  empCoNo: string;
  coNm: string;
  coClcdNm?: string;
  busino?: string;
  coIntroSummaryCont?: string;
  coIntroCont?: string;
  homepg?: string;
  regLogImgNm?: string;
}

export function normalizeCompanyInfo(raw: RawCompanyInfo): Omit<CompanyInfoRow, "id" | "collected_at"> {
  return {
    external_id: raw.empCoNo,
    company_name: raw.coNm,
    company_type: raw.coClcdNm || null,
    business_no: raw.busino || null,
    intro_summary: raw.coIntroSummaryCont || null,
    intro_detail: raw.coIntroCont || null,
    homepage: raw.homepg || null,
    logo_url: raw.regLogImgNm || null
  };
}

export async function fetchCompanyInfo(page = 1, display = 100): Promise<Omit<CompanyInfoRow, "id" | "collected_at">[]> {
  const data = await getXml("callOpenApiSvcInfo210L31.do", {
    callTp: "L",
    returnType: "XML",
    startPage: String(page),
    display: String(display)
  });
  const items = asArray<RawCompanyInfo>(data.dhsOpenEmpHireInfoList?.dhsOpenEmpHireInfo);
  return items.map(normalizeCompanyInfo);
}

// ── 채용행사 (210L11 목록 / 210D11 상세) ──────────────────────────────────
interface RawJobFair {
  areaCd: string;
  area: string;
  eventNo: string;
  eventNm: string;
  eventTerm: string;
  startDt: string;
}

export function normalizeJobFair(
  raw: RawJobFair,
  detail?: { eventPlc?: string; joinCoWantedInfo?: string; inqTelNo?: string; email?: string }
): Omit<JobFairRow, "id" | "collected_at"> {
  return {
    external_id: raw.eventNo,
    area_code: raw.areaCd || null,
    area: raw.area || null,
    event_name: raw.eventNm,
    event_term: raw.eventTerm || null,
    start_date: raw.startDt || null,
    event_place: detail?.eventPlc ?? null,
    participating_companies: detail?.joinCoWantedInfo ?? null,
    contact_phone: detail?.inqTelNo ?? null,
    contact_email: detail?.email ?? null
  };
}

export async function fetchJobFairDetail(areaCd: string, eventNo: string) {
  const data = await getXml("callOpenApiSvcInfo210D11.do", {
    callTp: "D",
    returnType: "XML",
    areaCd,
    eventNo
  });
  return data.empEventDtl as { eventPlc?: string; joinCoWantedInfo?: string; inqTelNo?: string; email?: string } | undefined;
}

export async function fetchJobFairs(page = 1, display = 100): Promise<Omit<JobFairRow, "id" | "collected_at">[]> {
  const data = await getXml("callOpenApiSvcInfo210L11.do", {
    callTp: "L",
    returnType: "XML",
    startPage: String(page),
    display: String(display)
  });
  const items = asArray<RawJobFair>(data.empEvList?.empEvent);

  const fairs: Omit<JobFairRow, "id" | "collected_at">[] = [];
  for (const item of items) {
    const detail = await fetchJobFairDetail(item.areaCd, item.eventNo).catch(() => undefined);
    fairs.push(normalizeJobFair(item, detail));
  }
  return fairs;
}
