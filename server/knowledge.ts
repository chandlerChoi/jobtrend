// Runtime RAG search over knowledge_chunks (see db/ingest-knowledge.ts).
// One cheap embedding call per query, then cosine search in Neon pgvector —
// the retrieved principle cards get injected into feedback prompts instead
// of long instructions, which is the token-cost win this exists for.
import { neon } from "@neondatabase/serverless";

export interface KnowledgeHit {
  claim: string;
  why: string | null;
  example: string | null;
  category: string;
  stage: string | null;
  source_title: string;
  similarity: number;
}

async function embedQuery(text: string): Promise<number[] | null> {
  if (!process.env.OPENAI_API_KEY) return null;
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({ model: "text-embedding-3-small", input: text.slice(0, 8000) })
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { data: { embedding: number[] }[] };
  return data.data[0].embedding;
}

// Returns [] when the knowledge base is empty, DATABASE_URL/OPENAI key is
// missing, or anything fails — callers treat principles as best-effort.
export async function searchKnowledge(
  query: string,
  opts: { category?: string; limit?: number } = {}
): Promise<KnowledgeHit[]> {
  try {
    if (!process.env.DATABASE_URL) return [];
    const embedding = await embedQuery(query);
    if (!embedding) return [];

    const sql = neon(process.env.DATABASE_URL);
    const limit = opts.limit ?? 3;
    const rows = await sql`
      SELECT claim, why, example, category, stage, source_title,
             1 - (embedding <=> ${JSON.stringify(embedding)}::vector) AS similarity
      FROM knowledge_chunks
      WHERE (${opts.category ?? null}::text IS NULL OR category = ${opts.category ?? null})
      ORDER BY embedding <=> ${JSON.stringify(embedding)}::vector
      LIMIT ${limit}
    `;
    return rows as unknown as KnowledgeHit[];
  } catch {
    return [];
  }
}

// Compact prompt block from retrieved principles — a few hundred tokens
// standing in for what would otherwise be the whole coaching corpus.
export function principlesToPrompt(hits: KnowledgeHit[]): string {
  if (hits.length === 0) return "";
  return [
    "다음은 검증된 면접/자소서 코칭 원칙입니다. 평가와 피드백에 이 원칙들을 기준으로 사용하세요:",
    ...hits.map((h, i) => `${i + 1}. ${h.claim}${h.why ? ` (이유: ${h.why})` : ""}`)
  ].join("\n");
}
