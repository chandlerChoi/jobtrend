// TODO(api-integration-last): this already calls the real Claude API when
// ANTHROPIC_API_KEY is set. Until the key is provisioned for the demo it
// falls back to a deterministic mock so /api/interview/* works end-to-end
// right now. No route handler needs to change when the key is added.
import type { InterviewQuestion } from "../shared/types.js";

const QUESTION_BANK = [
  "이 직무에 지원한 이유와 본인의 강점을 연결해서 설명해주세요.",
  "JD에 나온 기술/경험 중 가장 자신있는 것은 무엇이고, 실제로 어떻게 활용했나요?",
  "팀 내에서 의견 충돌이 있었던 경험과 해결 과정을 말씀해주세요.",
  "최근 1년간 새로 배운 기술이나 지식은 무엇이고, 어떻게 학습했나요?",
  "본인이 생각하는 이 직무의 가장 어려운 점과 극복 방안은 무엇인가요?",
  "실패했던 프로젝트 경험과 그로부터 얻은 교훈을 말씀해주세요.",
  "입사 후 3개월 내에 어떤 성과를 내고 싶은가요?"
];

const QUESTION_SYSTEM_PROMPT =
  "당신은 채용 면접관입니다. 주어진 JD와 이력서를 바탕으로 실제 면접에서 나올 가능성이 높은 질문 5~7개를 생성하세요. " +
  "직무역량/경험/상황대응을 균형 있게 포함하고 JSON 배열로만 응답하세요.";

const FEEDBACK_SYSTEM_PROMPT =
  "지원자 답변을 구체성·직무연관성·논리성 기준으로 평가하여 강점 2개, 보완점 2개를 제시하세요.";

async function callClaude(system: string, user: string): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system,
      messages: [{ role: "user", content: user }]
    })
  });
  if (!res.ok) throw new Error(`Claude API error: ${res.status}`);
  const data = await res.json();
  return data.content?.[0]?.text ?? "";
}

function mockQuestions(jobDescription: string, count: number): InterviewQuestion[] {
  const seed = jobDescription.length || 10;
  const ordered = [...QUESTION_BANK].sort((a, b) => ((a.length * seed) % 7) - ((b.length * seed) % 7));
  return ordered.slice(0, count).map((q, i) => ({ id: i + 1, text: q, order: i + 1 }));
}

export async function generateInterviewQuestions(
  jobDescription: string,
  resumeText: string | null,
  count = 5
): Promise<InterviewQuestion[]> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return mockQuestions(jobDescription, count);
  }
  try {
    const raw = await callClaude(
      QUESTION_SYSTEM_PROMPT,
      `JD: ${jobDescription}\n이력서: ${resumeText ?? "미제공"}`
    );
    const parsed = JSON.parse(raw) as string[];
    return parsed.slice(0, count).map((text, i) => ({ id: i + 1, text, order: i + 1 }));
  } catch {
    return mockQuestions(jobDescription, count);
  }
}

function mockFeedback(answerText: string): { strengths: string[]; improvements: string[] } {
  const length = answerText.trim().length;
  return {
    strengths:
      length > 80
        ? ["구체적인 경험과 수치를 활용해 설득력 있게 답변했어요.", "질문 의도에 맞는 핵심을 짚었어요."]
        : ["답변의 핵심 의도는 잘 전달됐어요."],
    improvements:
      length < 80
        ? ["구체적인 사례나 수치를 추가하면 더 설득력 있어요.", "STAR(상황-과업-행동-결과) 구조로 답변을 보완해보세요."]
        : ["결과로 이어진 임팩트를 한 문장으로 더 명확히 정리해보세요."]
  };
}

export async function evaluateAnswer(
  questionText: string,
  answerText: string
): Promise<{ strengths: string[]; improvements: string[] }> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return mockFeedback(answerText);
  }
  try {
    const raw = await callClaude(FEEDBACK_SYSTEM_PROMPT, `질문: ${questionText}\n답변: ${answerText}`);
    return JSON.parse(raw);
  } catch {
    return mockFeedback(answerText);
  }
}
