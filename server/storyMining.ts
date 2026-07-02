// F5 — Story Bank mining interview engine.
// Ported from the Python/LangGraph prototype: heuristic abstraction
// detection + per-module follow-up questions, no LLM required. Each call
// advances one turn (collect answer -> detect -> decide next question),
// mirroring how the graph is invoked once per user message rather than
// looped internally (a chatbot must wait for the next user turn).
import { STORY_MODULES, SLOT_IDS } from "../shared/types.js";
import type { StoryModule, SlotId, SlotProgressState } from "../shared/types.js";

interface SlotTemplate {
  name: string;
  opening: string;
  followups: Partial<Record<StoryModule, string>>;
}

const GENERIC_FOLLOWUPS: Record<StoryModule, string> = {
  situation: "그게 언제, 어떤 상황에서였는지 조금 더 구체적으로 말씀해주시겠어요?",
  friction: "그때 구체적으로 무엇이 어려웠거나 걸림돌이었나요?",
  action: "그 상황에서 실제로 어떤 행동을 하셨는지 말씀해주시겠어요?",
  result_quant: "그 결과를 숫자나 눈에 보이는 변화로 표현하면 어떻게 되나요?",
  result_qual: "그 이후 관계나 태도, 신뢰 측면에서 달라진 점이 있나요?",
  reflection: "그 경험에서 얻은 원칙이나 기준이 있다면 한 문장으로 말씀해주시겠어요?"
};

export const SLOT_TEMPLATES: Record<SlotId, SlotTemplate> = {
  S01: {
    name: "입문/전환 스토리",
    opening: "지금 하고 계신 일이나 관심 분야를 처음 시작하게 된 계기, 그 순간이 언제였나요?",
    followups: {
      situation: "그게 언제, 어떤 상황에서였나요? 그때 뭘 하고 계셨어요?",
      friction: "그 전까지는 뭘 하려고 했었나요? 방향을 바꾼 이유가 된 구체적인 사건이 있었나요?",
      action: "그렇게 마음먹은 뒤 처음으로 실제로 한 행동은 뭐였어요?",
      reflection: "그 경험이 지금 당신이 일하는 방식에 남긴 원칙이 하나 있다면요?"
    }
  },
  S02: {
    name: "실패·좌절 스토리",
    opening: "일하면서(또는 프로젝트하면서) 가장 크게 좌절했던 순간, 혹은 '내가 틀렸다'고 인정해야 했던 순간이 있었나요?",
    followups: {
      friction: "그때 본인이 놓쳤던 부분, 혹은 다르게 판단했으면 좋았을 부분이 있었을까요?",
      action: "그 상황에서 상황을 바꾸기 위해 처음 시도한 게 뭐였어요?",
      result_qual: "그 이후로 비슷한 상황이 다시 왔을 때는 어떻게 하셨어요?"
    }
  },
  S03: {
    name: "갈등·이견 스토리",
    opening: "팀원이나 상사, 파트너와 의견이 부딪혔던 순간이 있었나요? 어떻게 풀었나요?",
    followups: {
      friction: "구체적으로 무엇에 대해 서로 다른 입장이었나요? 그 사람 입장에서는 왜 그렇게 생각했을까요?",
      action: "그 이견을 좁히기 위해 실제로 어떤 대화나 행동을 하셨나요?",
      result_qual: "결국 어떻게 정리됐고, 그 사람과의 관계는 그 후 어땠나요?"
    }
  },
  S04: {
    name: "주도·이니셔티브 스토리",
    opening: "누가 시키지 않았는데 스스로 만들어낸 결과물이나 변화가 있었나요?",
    followups: {
      situation: "그걸 시작하기 전, 어떤 문제나 불편함을 먼저 발견하셨나요?",
      result_quant: "그 결과로 무엇이 몇 % 나아졌다거나, 시간이 얼마나 줄었다거나 하는 게 있었나요? 없다면 어떤 변화가 눈에 보였나요?"
    }
  },
  S05: {
    name: "압박·마감 스토리",
    opening: "시간이나 자원이 절대적으로 부족한 상황에서 뭔가를 해내야 했던 순간이 있었나요?",
    followups: {
      action: "그 안에서 무엇을 포기하고 무엇을 먼저 했는지, 그 선택의 기준이 뭐였나요?",
      reflection: "그 경험 이후로 마감이 급할 때 지금은 어떻게 다르게 접근하세요?"
    }
  },
  S06: {
    name: "숫자/성과 스토리",
    opening: "숫자로 증명할 수 있는, 본인이 가장 자신 있는 성과 하나만 말씀해주세요.",
    followups: {
      result_quant: "그게 이전과 비교해서 대략 몇 배, 몇 %, 얼마의 기간이었나요? 정확한 숫자가 기억 안 나면 대략적인 규모라도요.",
      action: "그 숫자를 만들기 위해 구체적으로 어떤 걸 바꾸셨나요?"
    }
  },
  S07: {
    name: "학습·전환 스토리",
    opening: "완전히 모르는 걸 짧은 시간 안에 배워서 써먹어야 했던 순간이 있었나요?",
    followups: {
      action: "구체적으로 어떤 자료/방법으로 배우셨어요? 막혔던 지점은 어떻게 뚫으셨나요?",
      result_qual: "그걸 배운 이후로 그 지식을 다른 상황에도 써본 적이 있나요?"
    }
  },
  S08: {
    name: "리더십/영향력 스토리",
    opening: "직급이나 역할과 관계없이, 다른 사람을 움직이게 하거나 설득해야 했던 순간이 있었나요?",
    followups: {
      friction: "왜 다들 꺼려했을까요? 그 사람들 입장에서의 이유가 뭐였을까요?",
      action: "그 사람들을 움직이기 위해 논리로 설득했나요, 먼저 행동으로 보여줬나요, 아니면 다른 방법이었나요?"
    }
  },
  S09: {
    name: "가치관 충돌 스토리",
    opening: "효율이나 결과를 위해 원칙을 조금 굽힐 수 있었던 상황에서, 오히려 원칙을 지켰던(또는 지키지 못했던) 순간이 있었나요?",
    followups: {
      friction: "그 순간 조금이라도 흔들렸던 지점이 있었을 것 같은데, 뭐였나요? 없었다면 왜 그렇게 확신할 수 있었나요?"
    }
  },
  S10: {
    name: "미래연결 스토리",
    opening: "지금까지의 이야기들이 지원하려는 직무/회사와 어떻게 이어진다고 생각하세요?",
    followups: {
      reflection: "지금까지 나온 이야기들의 공통점이 이 회사/직무에서는 구체적으로 어떤 상황에 쓰일 것 같나요?"
    }
  }
};

const ABSTRACT_PATTERNS = [
  /저는\s*.*(잘합니다|잘해요|능합니다|사람입니다)/,
  /(항상|보통|일반적으로)\s*그렇게/,
  /(열심히|최선을 다해)\s*(했습니다|했어요)\s*[.]?$/,
  /^(네|아니요|글쎄요|모르겠어요)[.]?$/
];

const CONCRETE_SIGNALS = [
  /\d+(%|건|개|원|시간|일|주|개월|년)/,
  /(그때|당시|처음에|그 다음|그래서 저는)/
];

export function detectAbstraction(text: string): { isAbstract: boolean; reason: string | null } {
  const trimmed = text.trim();
  const abstractHit = ABSTRACT_PATTERNS.some((p) => p.test(trimmed));
  const concreteHit = CONCRETE_SIGNALS.some((p) => p.test(trimmed));
  const tooShort = trimmed.length < 15;

  const isAbstract = (abstractHit || tooShort) && !concreteHit;
  let reason: string | null = null;
  if (abstractHit) reason = "결론형/일반화 표현 감지";
  else if (tooShort) reason = "답변이 지나치게 짧음";

  return { isAbstract, reason };
}

export function inferFilledModules(text: string): Record<StoryModule, boolean> {
  const filled = Object.fromEntries(STORY_MODULES.map((m) => [m, false])) as Record<StoryModule, boolean>;
  if (/(때|당시|처음에|먼저)/.test(text)) filled.situation = true;
  if (/(어려웠|힘들었|문제는|막혔|틀렸|아니었|다른.*하고 있었)/.test(text)) filled.friction = true;
  if (/(그래서|해서|하기 위해|실제로|시도)/.test(text)) filled.action = true;
  if (/\d+(%|건|개|원|시간|일|주|개월|년)/.test(text)) filled.result_quant = true;
  if (/(관계|신뢰|배웠|느꼈)/.test(text)) filled.result_qual = true;
  if (/(원칙|그 이후로|지금도|지금까지)/.test(text)) filled.reflection = true;
  return filled;
}

export function newSlotState(): SlotProgressState {
  return {
    modules_filled: Object.fromEntries(STORY_MODULES.map((m) => [m, false])) as Record<StoryModule, boolean>,
    raw_answers: [],
    followup_count: 0
  };
}

const MAX_FOLLOWUP = 3;

export interface StepResult {
  state: SlotProgressState;
  status: "asking" | "slot_complete" | "slot_incomplete";
  nextQuestion: string | null;
}

// One turn: fold the answer into slot_state, then decide the next
// question (or declare the slot done). Called once per user message.
export function stepSlot(slotId: SlotId, state: SlotProgressState, answer: string): StepResult {
  const next: SlotProgressState = {
    modules_filled: { ...state.modules_filled },
    raw_answers: [...state.raw_answers, answer],
    followup_count: state.followup_count
  };

  const detection = detectAbstraction(answer);
  const filled = inferFilledModules(answer);
  for (const m of STORY_MODULES) {
    next.modules_filled[m] = next.modules_filled[m] || filled[m];
  }

  const missing = STORY_MODULES.filter((m) => !next.modules_filled[m]);
  if (missing.length === 0) {
    return { state: next, status: "slot_complete", nextQuestion: null };
  }

  if (next.followup_count >= MAX_FOLLOWUP) {
    return { state: next, status: "slot_incomplete", nextQuestion: null };
  }

  const template = SLOT_TEMPLATES[slotId];
  let nextQuestion: string;
  if (detection.isAbstract) {
    nextQuestion = "그렇게 말할 수 있는 구체적인 순간 하나만 얘기해주실 수 있나요?";
  } else {
    const target = missing[0];
    nextQuestion = template.followups[target] ?? GENERIC_FOLLOWUPS[target];
  }

  next.followup_count += 1;
  return { state: next, status: "asking", nextQuestion };
}

export function slotIdAt(index: number): SlotId | null {
  return SLOT_IDS[index] ?? null;
}

export function openingFor(slotId: SlotId): string {
  return SLOT_TEMPLATES[slotId].opening;
}

export function nameFor(slotId: SlotId): string {
  return SLOT_TEMPLATES[slotId].name;
}

export const TOTAL_SLOTS = SLOT_IDS.length;
