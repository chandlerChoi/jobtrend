// All LLM calls go through OpenAI — ANTHROPIC_API_KEY is no longer used.
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

const PERSONA_SYSTEM: Record<string, string> = {
  startup: "당신은 스타트업의 인사담당자입니다. 질문은 짧고 실행력 중심으로 합니다. 실제 경험과 결과를 구체적으로 묻는 질문을 포함하세요.",
  enterprise: "당신은 대기업의 임원 면접관입니다. 격식체를 사용하고, 조직문화 적합성과 리더십 경험을 중점으로 질문합니다.",
  public: "당신은 공공기관 면접관입니다. 구조화된 질문 형식을 사용하고, 공직가치·성실성·윤리의식을 평가합니다."
};

async function callOpenAI(system: string, user: string, model = "gpt-4.1-mini"): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user }
      ]
    })
  });
  if (!res.ok) throw new Error(`OpenAI error: ${res.status}`);
  const data = await res.json() as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

function mockQuestions(jobDescription: string, count: number): InterviewQuestion[] {
  const seed = jobDescription.length || 10;
  const ordered = [...QUESTION_BANK].sort((a, b) => ((a.length * seed) % 7) - ((b.length * seed) % 7));
  return ordered.slice(0, count).map((q, i) => ({ id: i + 1, text: q, order: i + 1 }));
}

export async function generateInterviewQuestions(
  jobDescription: string,
  resumeText: string | null,
  count = 5,
  persona = "startup"
): Promise<InterviewQuestion[]> {
  if (!process.env.OPENAI_API_KEY) return mockQuestions(jobDescription, count);
  try {
    const system = `${PERSONA_SYSTEM[persona] ?? PERSONA_SYSTEM.startup} 주어진 JD와 이력서를 바탕으로 실제 면접에서 나올 가능성이 높은 질문 ${count}개를 생성하세요. 문자열 배열 JSON으로만 응답하세요. 예: ["질문1","질문2"]`;
    const raw = await callOpenAI(system, `JD: ${jobDescription}\n이력서: ${resumeText ?? "미제공"}`);
    // Extract JSON array from response
    const match = raw.match(/\[[\s\S]*\]/);
    const parsed = JSON.parse(match ? match[0] : raw) as string[];
    return parsed.slice(0, count).map((text, i) => ({ id: i + 1, text, order: i + 1 }));
  } catch {
    return mockQuestions(jobDescription, count);
  }
}

function mockFeedback(answerText: string): { strengths: string[]; improvements: string[]; quickTip: string } {
  const length = answerText.trim().length;
  return {
    strengths: length > 80
      ? ["구체적인 경험과 수치를 활용해 설득력 있게 답변했어요.", "질문 의도에 맞는 핵심을 짚었어요."]
      : ["답변의 핵심 의도는 잘 전달됐어요."],
    improvements: length < 80
      ? ["구체적인 사례나 수치를 추가하면 더 설득력 있어요.", "STAR 구조로 답변을 보완해보세요."]
      : ["결과로 이어진 임팩트를 한 문장으로 더 명확히 정리해보세요."],
    quickTip: length < 80
      ? "STAR(상황-과업-행동-결과) 구조로 답변을 3배 늘려보세요."
      : "결과에 수치를 추가하면 더욱 인상적입니다."
  };
}

export async function evaluateAnswer(
  questionText: string,
  answerText: string
): Promise<{ strengths: string[]; improvements: string[]; quickTip?: string }> {
  if (!process.env.OPENAI_API_KEY) return mockFeedback(answerText);
  try {
    const system = `지원자 답변을 구체성·직무연관성·논리성 기준으로 평가하세요. 반드시 JSON으로만 응답: {"strengths":["강점1","강점2"],"improvements":["보완점1","보완점2"],"quickTip":"즉각 실천 가이드 1줄"}`;
    const raw = await callOpenAI(system, `질문: ${questionText}\n답변: ${answerText}`);
    const match = raw.match(/\{[\s\S]*\}/);
    return JSON.parse(match ? match[0] : raw) as { strengths: string[]; improvements: string[]; quickTip?: string };
  } catch {
    return mockFeedback(answerText);
  }
}
