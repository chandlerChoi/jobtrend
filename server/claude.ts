// All LLM calls go through OpenAI. RAG principles are injected into prompts
// at runtime (searchKnowledge) to reduce token use while improving accuracy.
import type { InterviewQuestion } from "../shared/types.js";
import { searchKnowledge, principlesToPrompt } from "./knowledge.js";

const QUESTION_BANK = [
  "이 직무에 지원한 이유와 본인의 강점을 연결해서 설명해주세요.",
  "JD에 나온 기술/경험 중 가장 자신있는 것은 무엇이고, 실제로 어떻게 활용했나요?",
  "팀 내에서 의견 충돌이 있었던 경험과 해결 과정을 말씀해주세요.",
  "최근 1년간 새로 배운 기술이나 지식은 무엇이고, 어떻게 학습했나요?",
  "본인이 생각하는 이 직무의 가장 어려운 점과 극복 방안은 무엇인가요?",
  "실패했던 프로젝트 경험과 그로부터 얻은 교훈을 말씀해주세요.",
  "입사 후 3개월 내에 어떤 성과를 내고 싶은가요?"
];

export const PERSONA_SYSTEM: Record<string, string> = {
  // ── 기관/업종별 ──────────────────────────────────────────────────────────
  startup:
    "당신은 스타트업 인사담당자입니다. 빠른 질문, 실행력·적응력·결과 중심. 실제 경험과 수치를 구체적으로 물어보세요.",
  enterprise:
    "당신은 대기업 임원 면접관입니다. 격식체 사용, 조직문화 적합성·리더십·장기 기여도를 중점 평가합니다.",
  public:
    "당신은 공공기관 면접관입니다. 구조화된 질문 형식, 공직가치·성실성·윤리의식을 체계적으로 평가합니다.",
  finance:
    "당신은 금융권(은행/증권/보험) 면접관입니다. 수치 분석력, 리스크 판단, 윤리의식 중점. 격식체로 STAR 구조 사례를 요구합니다.",
  tech:
    "당신은 IT/테크 기업 테크니컬 면접관입니다. 기술 깊이, 문제 해결 과정, 시스템 설계 사고 평가. 구체적인 기술 스택과 구현 경험을 꼬리질문으로 파고드세요.",
  global:
    "당신은 외국계/글로벌 기업 면접관입니다. 영어와 한국어를 혼용해 질문하고, 글로벌 마인드셋·다양성 이해·영어 커뮤니케이션 능력을 평가합니다.",
  // ── 면접 스타일별 ─────────────────────────────────────────────────────────
  newcomer:
    "당신은 신입 친화형 면접관입니다. 학교·인턴·팀 프로젝트 중심으로 잠재력과 성장가능성을 부드럽게 평가합니다.",
  stress:
    "당신은 압박 면접관입니다. 지원자 답변에 날카로운 반론과 예리한 꼬리질문을 이어가세요. '왜요?', '근거가 있나요?', '다른 사람도 그렇게 할 수 있지 않나요?'처럼 흔들어보세요. 단, 인신공격은 금지.",
  competency:
    "당신은 역량구조화 면접관입니다. 모든 답변에 대해 반드시 STAR(상황-과업-행동-결과) 구조를 요구합니다. '결과가 구체적으로 무엇이었나요?', '수치로 말씀해주세요'를 반복하세요.",
  culture:
    "당신은 컬처핏 면접관입니다. 가치관·팀워크·갈등 해결·회사 비전 공감도를 중심으로 평가합니다. 직무 경험보다 사람됨과 협업 방식을 깊이 파고드세요.",
  case:
    "당신은 케이스 인터뷰 면접관입니다. 논리적 사고력과 문제 해결 과정을 평가합니다. 추정 문제(시장 규모 계산), 비즈니스 케이스, 프레임워크 활용 능력을 물어보세요.",
  career:
    "당신은 커리어패스 면접관입니다. 지원자의 성장 경로, 장기 비전, 이직 이유, 이 회사에서의 5년 계획을 깊이 파고드는 질문을 합니다.",
};

export const PERSONA_LABELS: Record<string, string> = {
  startup: "스타트업",
  enterprise: "대기업 임원",
  public: "공공기관",
  finance: "금융권",
  tech: "테크니컬",
  global: "외국계/글로벌",
  newcomer: "신입친화형",
  stress: "압박 면접",
  competency: "역량구조화",
  culture: "컬처핏",
  case: "케이스인터뷰",
  career: "커리어패스",
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
    // RAG: retrieve coaching principles relevant to this Q&A
    const hits = await searchKnowledge(`${questionText} ${answerText}`, { limit: 3 });
    const principles = principlesToPrompt(hits);

    const system = [
      principles,
      "지원자 답변을 구체성·직무연관성·논리성 기준으로 평가하세요.",
      "반드시 JSON으로만 응답: {\"strengths\":[\"강점1\",\"강점2\"],\"improvements\":[\"보완점1\",\"보완점2\"],\"quickTip\":\"즉각 실천 가이드 1줄\"}"
    ].filter(Boolean).join("\n\n");

    const raw = await callOpenAI(system, `질문: ${questionText}\n답변: ${answerText}`);
    const match = raw.match(/\{[\s\S]*\}/);
    return JSON.parse(match ? match[0] : raw) as { strengths: string[]; improvements: string[]; quickTip?: string };
  } catch {
    return mockFeedback(answerText);
  }
}

// 자소서 분석 — RAG 원칙 기반 섹션별 진단 + 꼬리질문 + 개선본 생성
export async function analyzeCoverLetter(
  coverLetterText: string,
  jobPostingText: string | null,
  followUpAnswers: Record<string, string> | null
): Promise<{
  sections: { key: string; title: string; original: string; score: number; issues: string[]; principles: string[]; improved: string }[];
  followUpQuestions: { key: string; question: string }[];
  overallScore: number;
}> {
  if (!process.env.OPENAI_API_KEY) {
    return {
      sections: [{ key: "intro", title: "자기소개", original: coverLetterText.slice(0, 200), score: 60, issues: ["더 구체적인 경험을 추가하세요"], principles: ["하나의 핵심 키워드로 집중하라"], improved: "" }],
      followUpQuestions: [{ key: "q1", question: "가장 힘들었던 경험은 무엇인가요?" }],
      overallScore: 60
    };
  }

  // 1. RAG에서 자소서 관련 원칙 검색
  const ragHits = await searchKnowledge(
    `자기소개서 ${jobPostingText ? "직무 지원동기" : "작성법"}`,
    { category: "자소서팁", limit: 4 }
  );
  const ragFallback = await searchKnowledge("면접 자기소개서 작성", { limit: 4 });
  const allHits = [...ragHits, ...ragFallback].slice(0, 5);
  const principles = principlesToPrompt(allHits);

  const prompt = [
    jobPostingText ? `[모집공고]\n${jobPostingText.slice(0, 2000)}\n` : "",
    `[자기소개서 원문]\n${coverLetterText.slice(0, 5000)}`,
    followUpAnswers ? `\n[꼬리질문 답변]\n${Object.entries(followUpAnswers).map(([k, v]) => `${k}: ${v}`).join("\n")}` : "",
    "",
    "위 자기소개서를 분석하여 다음 JSON으로 응답하세요:",
    '{"overallScore": 0~100, "sections": [{"key":"intro|motivation|competency|growth|other","title":"섹션명","original":"원문(최대200자)","score":0~100,"issues":["문제점1","문제점2"],"principles":["적용할원칙"],"improved":"개선된버전(followUpAnswers가 있을 때만 작성, 없으면 빈문자열)"}],"followUpQuestions":[{"key":"q1","question":"꼬리질문"}]}',
    "",
    "규칙:",
    "- sections: 자기소개서를 최대 4개 섹션으로 분류 (자기소개/지원동기/직무역량/성장계획)",
    "- issues: 각 섹션의 구체성·차별성·논리성 문제점 2~3개",
    "- principles: RAG 원칙 중 이 섹션에 적용 가능한 것 1~2개",
    "- improved: followUpAnswers가 제공된 경우에만 개선본 작성 (글자수 300~600자)",
    "- followUpQuestions: 원문에서 모호한 부분을 파고드는 꼬리질문 3~5개",
    principles ? `\n[참고 코칭 원칙]\n${principles}` : ""
  ].filter(Boolean).join("\n");

  try {
    const raw = await callOpenAI(
      "자기소개서 전문 코치입니다. 지시에 따라 JSON만 출력하세요.",
      prompt,
      "gpt-4.1-mini"
    );
    const match = raw.match(/\{[\s\S]*\}/);
    return JSON.parse(match ? match[0] : raw);
  } catch {
    return {
      sections: [{ key: "full", title: "전체", original: coverLetterText.slice(0, 200), score: 50, issues: ["분석 중 오류가 발생했습니다"], principles: [], improved: "" }],
      followUpQuestions: [{ key: "q1", question: "이 경험에서 본인의 역할은 구체적으로 무엇이었나요?" }],
      overallScore: 50
    };
  }
}

// 공고별 스토리뱅크 버전 생성 — RAG 원칙 + 사용자 스토리카드 → 맞춤 자소서 섹션
export async function generateVersionContent(
  jobPostingText: string,
  storyCardSummaries: string[],
  companyName: string | null
): Promise<Record<string, string>> {
  if (!process.env.OPENAI_API_KEY) {
    return {
      intro: "저는 [핵심 역량]을 갖춘 지원자입니다.",
      motivation: `${companyName ?? "귀사"}에 지원하게 된 이유는...`,
      competency: "직무 역량 측면에서...",
      growth: "입사 후 성장 계획으로..."
    };
  }

  const hits = await searchKnowledge(`${companyName ?? ""} 자기소개서 지원동기 직무역량`, { limit: 5 });
  const principles = principlesToPrompt(hits);

  const stories = storyCardSummaries.slice(0, 5).map((s, i) => `스토리 ${i + 1}: ${s}`).join("\n");

  const prompt = [
    `[모집공고]\n${jobPostingText.slice(0, 3000)}`,
    stories ? `\n[지원자 스토리뱅크]\n${stories}` : "",
    principles ? `\n[코칭 원칙]\n${principles}` : "",
    "",
    "위 정보를 활용해 이 공고에 최적화된 자기소개서 4개 섹션을 JSON으로 작성하세요:",
    '{"intro":"자기소개(400자 내외)","motivation":"지원동기(400자 내외)","competency":"직무역량(400자 내외)","growth":"성장계획(300자 내외)"}',
    "",
    "규칙: 지원자 스토리에서 공고 요구사항에 가장 잘 맞는 경험을 선택·조합. 구체적 수치와 STAR 구조 활용. 추상적 표현 금지."
  ].filter(Boolean).join("\n");

  try {
    const raw = await callOpenAI(
      "자기소개서 전문 코치입니다. 지시에 따라 JSON만 출력하세요.",
      prompt,
      "gpt-4.1-mini"
    );
    const match = raw.match(/\{[\s\S]*\}/);
    return JSON.parse(match ? match[0] : raw);
  } catch {
    return { intro: "", motivation: "", competency: "", growth: "" };
  }
}
