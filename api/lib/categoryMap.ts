// TODO(api-integration-last): fill in real 고용24(워크넷) 직종코드 / 사람인
// job-mid-code / 잡코리아 gi_job_cd_nm values once confirmed against live
// API responses. Without this, the same internal job_category would get
// split across sources during F1 aggregation.
export const CATEGORY_MAP: Record<string, { work24: string[]; saramin: string[]; jobkorea: string[] }> = {
  "백엔드 개발자": { work24: ["정보통신·방송·IT"], saramin: ["개발·데이터"], jobkorea: ["IT개발", "백엔드"] },
  "프론트엔드 개발자": { work24: ["정보통신·방송·IT"], saramin: ["개발·데이터"], jobkorea: ["IT개발", "프론트엔드"] },
  "마케팅 매니저": { work24: ["경영·회계·사무"], saramin: ["마케팅·홍보·조사"], jobkorea: ["마케팅"] }
  // 고용24 "직종코드표"(워크넷 Open API 가이드) + 사람인/잡코리아 코드표 받은 뒤
  // 나머지 직무 채우면 됨.
};

export function mapWork24Category(rawName: string): string {
  for (const [standard, sources] of Object.entries(CATEGORY_MAP)) {
    if (sources.work24.includes(rawName)) return standard;
  }
  return rawName;
}

export function mapJobKoreaCategory(rawName: string): string {
  for (const [standard, sources] of Object.entries(CATEGORY_MAP)) {
    if (sources.jobkorea.includes(rawName)) return standard;
  }
  return rawName;
}

export function mapSaraminCategory(rawName: string): string {
  for (const [standard, sources] of Object.entries(CATEGORY_MAP)) {
    if (sources.saramin.includes(rawName)) return standard;
  }
  return rawName;
}

// 고용24 Open API requires a 직종코드(jobsCd) per request rather than a name
// filter. TODO(api-integration-last): replace placeholders with real codes
// from the 워크넷 Open API 가이드의 직종코드표.
export const WORK24_JOB_CODES: Record<string, string> = {
  "백엔드 개발자": "1530",
  "프론트엔드 개발자": "1530",
  "데이터 분석가": "1530",
  "데이터 엔지니어": "1530",
  "AI/ML 엔지니어": "1530",
  "제품 매니저(PM)": "1530",
  "UX/UI 디자이너": "1530",
  "마케팅 매니저": "1410",
  "QA 엔지니어": "1530",
  "DevOps 엔지니어": "1530"
};
