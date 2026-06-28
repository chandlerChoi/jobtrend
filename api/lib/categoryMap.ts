// TODO(api-integration-last): fill in real 사람인 job-mid-code / 잡코리아 gi_job_cd_nm
// values once approved. Without this, the same internal job_category would
// get split across two sources during F1 aggregation.
export const CATEGORY_MAP: Record<string, { saramin: string[]; jobkorea: string[] }> = {
  "백엔드 개발자": { saramin: ["개발·데이터"], jobkorea: ["IT개발", "백엔드"] },
  "프론트엔드 개발자": { saramin: ["개발·데이터"], jobkorea: ["IT개발", "프론트엔드"] },
  "마케팅 매니저": { saramin: ["마케팅·홍보·조사"], jobkorea: ["마케팅"] }
  // 사람인 "직무/직업 코드표" + 잡코리아 코드표 받은 뒤 나머지 직무 채우면 됨.
};

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
