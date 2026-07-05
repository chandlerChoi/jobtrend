// 내 공고 보관함 — 이미지 OCR로 추출한 공고 텍스트를 저장해
// AI 면접·스토리뱅크 어디서든 다시 불러온다. (localStorage, 최대 20개)
export interface SavedJd {
  id: string;
  name: string;
  text: string;
  savedAt: string; // ISO
}

const KEY = "jobtrend_saved_jds";
const MAX = 20;

export function listSavedJds(): SavedJd[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedJd[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function addSavedJd(text: string): SavedJd {
  const name = deriveName(text);
  const jd: SavedJd = {
    id: crypto.randomUUID(),
    name,
    text,
    savedAt: new Date().toISOString()
  };
  const next = [jd, ...listSavedJds()].slice(0, MAX);
  localStorage.setItem(KEY, JSON.stringify(next));
  return jd;
}

export function removeSavedJd(id: string): SavedJd[] {
  const next = listSavedJds().filter((j) => j.id !== id);
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

// 공고 텍스트 첫 의미 있는 줄에서 이름 추출 (회사명/제목 추정)
function deriveName(text: string): string {
  const line = text
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.length >= 4 && !/^[-=*#\s]+$/.test(l));
  const base = (line ?? "채용공고").slice(0, 30);
  const date = new Date().toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" });
  return `${base} (${date})`;
}
