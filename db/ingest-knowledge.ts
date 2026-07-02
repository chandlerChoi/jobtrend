// One-time (re-runnable) RAG ingestion: knowledge/raw/*.txt →
// GPT principle-card extraction → OpenAI embeddings → knowledge_chunks.
// Usage: npx tsx db/ingest-knowledge.ts
// Requires DATABASE_URL and OPENAI_API_KEY in .env (read manually below
// since the project doesn't ship dotenv).
import { readFileSync, readdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { neon } from "@neondatabase/serverless";

const __dirname = dirname(fileURLToPath(import.meta.url));
const RAW_DIR = join(__dirname, "..", "knowledge", "raw");

const envText = readFileSync(join(__dirname, "..", ".env"), "utf-8");
function env(name: string): string {
  const m = envText.match(new RegExp(`^${name}=(.+)$`, "m"));
  if (!m) throw new Error(`${name} not set in .env`);
  return m[1].trim();
}
const sql = neon(env("DATABASE_URL"));
const OPENAI_KEY = env("OPENAI_API_KEY");

interface PrincipleCard {
  claim: string;
  why: string;
  example: string;
  stage: "자소서작성" | "면접준비" | "면접당일";
  question_types: string[];
}

// Accepts both the strict header format (title:/url:/category:) and the
// loose YouTube-export format teammates actually produce: first line is
// the title (optionally "... - YouTube"), a bare URL line, "Transcript:",
// then timestamped text. Category may be absent — GPT classifies then.
function parseRawFile(text: string): {
  title: string | null;
  url: string | null;
  category: string | null;
  transcript: string;
} {
  const headerTitle = text.match(/^title:\s*(.+)$/m)?.[1]?.trim();
  const url = text.match(/^url:\s*(.+)$/m)?.[1]?.trim()
    ?? text.match(/^(https?:\/\/\S+)\s*$/m)?.[1]?.trim()
    ?? null;
  const category = text.match(/^category:\s*(.+)$/m)?.[1]?.trim() ?? null;

  let title = headerTitle ?? null;
  if (!title) {
    const firstLine = text.split("\n").map((l) => l.trim()).find((l) => l && !l.startsWith("http"));
    if (firstLine) title = firstLine.replace(/\s*-\s*YouTube\s*$/i, "").trim();
  }

  let transcript: string;
  const tIdx = text.search(/^Transcript:\s*$/m);
  if (tIdx >= 0) {
    transcript = text.slice(tIdx).replace(/^Transcript:\s*/m, "");
  } else if (headerTitle) {
    transcript = text.split(/\n\s*\n/).slice(1).join("\n\n");
  } else {
    transcript = text;
  }
  // strip (00:00)-style timestamps
  transcript = transcript.replace(/\(\d{1,2}:\d{2}(:\d{2})?\)/g, " ").replace(/[ \t]+/g, " ").trim();

  return { title, url, category, transcript };
}

async function openai(path: string, body: unknown): Promise<any> {
  const res = await fetch(`https://api.openai.com/v1/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_KEY}` },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`OpenAI ${path} ${res.status}: ${await res.text()}`);
  return res.json();
}

async function extractCards(
  title: string,
  category: string | null,
  transcript: string
): Promise<{ category: string; cards: PrincipleCard[] }> {
  const prompt = [
    `다음은 "${title}" 유튜브 영상${category ? `(주제: ${category})` : ""}의 스크립트입니다.`,
    "이 스크립트에서 구직자에게 실제로 적용 가능한 '원칙 카드'를 추출하세요.",
    "",
    "규칙:",
    "- 원칙 5~15개. 스크립트에 실제로 언급된 내용만 (지어내기 금지)",
    "- 스크립트가 반복되면(같은 내용 두 번) 한 번만 반영",
    "- claim: 원칙 한 문장 (명령형, 50자 이내)",
    "- why: 영상이 제시한 근거/이유 (100자 이내)",
    "- example: 영상 속 적용 예시. 없으면 빈 문자열",
    "- stage: 자소서작성 | 면접준비 | 면접당일 중 하나",
    "- question_types: 이 원칙이 적용되는 질문 유형 배열",
    "  (예: 자기소개, 지원동기, 갈등해결, 실패경험, 직무역량, 성장가능성, 마무리답변)",
    `- category: ${category ? `"${category}" 고정` : "영상 주제 기준으로 면접팁 | 자소서팁 | 이력서팁 중 하나 판정"}`,
    "",
    'JSON만 출력: {"category":"...","cards":[{"claim":"...","why":"...","example":"...","stage":"...","question_types":["..."]}]}',
    "",
    "--- 스크립트 ---",
    transcript.slice(0, 24000)
  ].join("\n");

  const data = await openai("chat/completions", {
    model: "gpt-4.1-mini",
    max_tokens: 4000,
    messages: [{ role: "user", content: prompt }]
  });
  const raw = data.choices[0].message.content.trim().replace(/^```json?/, "").replace(/```$/, "").trim();
  const parsed = JSON.parse(raw);
  return { category: category ?? parsed.category ?? "면접팁", cards: parsed.cards };
}

async function embed(texts: string[]): Promise<number[][]> {
  const data = await openai("embeddings", { model: "text-embedding-3-small", input: texts });
  return data.data.map((d: { embedding: number[] }) => d.embedding);
}

async function ingestFile(filename: string) {
  const text = readFileSync(join(RAW_DIR, filename), "utf-8");
  const { title, url, category: rawCategory, transcript } = parseRawFile(text);
  if (!title) {
    console.warn(`  skip ${filename}: 제목을 찾을 수 없음`);
    return;
  }
  if (transcript.length < 100) {
    console.warn(`  skip ${filename}: 스크립트가 너무 짧음`);
    return;
  }

  console.log(`- ${title} (${rawCategory ?? "카테고리 자동판정"}, ${transcript.length}자)`);
  const { category, cards } = await extractCards(title, rawCategory, transcript);
  console.log(`  카테고리: ${category} / 원칙 카드 ${cards.length}개 추출`);

  const contents = cards.map((c) => `${c.claim}\n이유: ${c.why}\n예시: ${c.example}`);
  const embeddings = await embed(contents);

  // re-runnable: replace this source's existing cards
  await sql`DELETE FROM knowledge_chunks WHERE source_title = ${title}`;
  for (let i = 0; i < cards.length; i++) {
    const c = cards[i];
    await sql`
      INSERT INTO knowledge_chunks
        (source_title, source_url, category, stage, question_types, claim, why, example, content, embedding)
      VALUES
        (${title}, ${url}, ${category}, ${c.stage}, ${c.question_types}, ${c.claim}, ${c.why},
         ${c.example}, ${contents[i]}, ${JSON.stringify(embeddings[i])}::vector)
    `;
  }
  console.log(`  저장 완료`);
}

const files = readdirSync(RAW_DIR).filter((f) => f.endsWith(".txt"));
if (files.length === 0) {
  console.log("knowledge/raw/에 .txt 파일이 없습니다. README.md 형식대로 저장 후 다시 실행하세요.");
} else {
  console.log(`${files.length}개 파일 인제스트 시작`);
  for (const f of files) {
    await ingestFile(f);
  }
  const count = await sql`SELECT count(*)::int AS n FROM knowledge_chunks`;
  console.log(`\n총 원칙 카드: ${count[0].n}개`);
}
