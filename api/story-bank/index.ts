import { randomUUID } from "crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withErrorHandling } from "../../server/respond.js";
import { requireUser } from "../../server/auth.js";
import { db } from "../../server/db.js";
import {
  stepSlot,
  newSlotState,
  slotIdAt,
  openingFor,
  nameFor,
  TOTAL_SLOTS
} from "../../server/storyMining.js";
import { generateVersionContent, upgradeStoryAnswers } from "../../server/claude.js";

// POST /api/story-bank — 채굴 세션 시작/이어가기
//   body {} → 새 세션 시작
//   body { sessionId, answer } → 현재 질문 답변
// POST /api/story-bank?mode=version — 공고별 버전 CRUD
//   body { action:"create", versionName, jobPostingText, companyName } → 생성
//   body { action:"update", versionId, storyContent } → 내용 저장
//   body { action:"delete", versionId } → 삭제
// GET /api/story-bank → 스토리 카드 목록
// GET /api/story-bank?active=1 → 진행 중 세션
// GET /api/story-bank?versions=1 → 버전 목록
export default withErrorHandling(async (req: VercelRequest, res: VercelResponse) => {
  const user = await requireUser(req);

  // ── GET ──────────────────────────────────────────────────────────────────
  if (req.method === "GET") {
    if (req.query.versions) {
      const versions = await db.listStoryBankVersions(user.id);
      res.status(200).json({ versions });
      return;
    }
    if (req.query.active) {
      const session = await db.getActiveMiningSession(user.id);
      if (!session) {
        res.status(200).json({ session: null });
        return;
      }
      const slotId = slotIdAt(session.slot_index);
      res.status(200).json({
        session: {
          sessionId: session.id,
          slotIndex: session.slot_index,
          slotName: slotId ? nameFor(slotId) : null,
          transcript: session.transcript ?? []
        }
      });
      return;
    }
    const cards = await db.listStoryCards(user.id);
    res.status(200).json({ cards });
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  // ── POST ?mode=upgrade — 스토리 답변 AI 업그레이드 ──────────────────────
  if (req.query.mode === "upgrade") {
    const { slotName, questions, answers, targetIndex } = (req.body ?? {}) as {
      slotName?: string;
      questions?: string[];
      answers?: string[];
      targetIndex?: number;
    };
    if (!slotName || !Array.isArray(questions) || !Array.isArray(answers)) {
      res.status(400).json({ error: "slotName, questions, answers required" });
      return;
    }
    const upgradedAnswers = await upgradeStoryAnswers(
      slotName,
      questions,
      answers,
      typeof targetIndex === "number" ? targetIndex : undefined
    );
    res.status(200).json({ upgradedAnswers });
    return;
  }

  // ── POST ?mode=edit — 스토리 카드 raw_answers 수정 ───────────────────────
  if (req.query.mode === "edit") {
    const { cardId, rawAnswers } = (req.body ?? {}) as { cardId?: string; rawAnswers?: string[] };
    if (!cardId || !Array.isArray(rawAnswers)) {
      res.status(400).json({ error: "cardId and rawAnswers required" });
      return;
    }
    await db.updateStoryCard(cardId, user.id, rawAnswers);
    res.status(200).json({ ok: true });
    return;
  }

  // ── POST ?mode=version ────────────────────────────────────────────────────
  if (req.query.mode === "version") {
    const { action, versionId, versionName, jobPostingText, companyName, storyContent } =
      (req.body ?? {}) as {
        action: "create" | "update" | "delete";
        versionId?: string;
        versionName?: string;
        jobPostingText?: string;
        companyName?: string;
        storyContent?: Record<string, string>;
      };

    if (action === "create") {
      // RAG + GPT로 섹션 초안 생성
      const cards = await db.listStoryCards(user.id);
      const cardSummaries = cards.map((c) => c.raw_answers.slice(0, 3).join(" | "));
      const generatedContent = await generateVersionContent(
        jobPostingText ?? "",
        cardSummaries,
        companyName ?? null
      );
      const version = await db.createStoryBankVersion({
        user_id: user.id,
        version_name: versionName ?? companyName ?? "새 버전",
        job_posting_text: jobPostingText ?? null,
        company_name: companyName ?? null,
        story_content: generatedContent
      });
      res.status(201).json({ version });
      return;
    }

    if (action === "update" && versionId) {
      await db.updateStoryBankVersion(versionId, user.id, storyContent ?? {});
      res.status(200).json({ ok: true });
      return;
    }

    if (action === "delete" && versionId) {
      await db.deleteStoryBankVersion(versionId, user.id);
      res.status(200).json({ ok: true });
      return;
    }

    res.status(400).json({ error: "invalid_action" });
    return;
  }

  // ── POST 채굴 세션 ────────────────────────────────────────────────────────
  const { sessionId, answer, skip } = (req.body ?? {}) as { sessionId?: string; answer?: string; skip?: boolean };

  if (!sessionId) {
    const firstSlotId = slotIdAt(0)!;
    const firstQuestion = openingFor(firstSlotId);
    const session = {
      id: randomUUID(),
      user_id: user.id,
      slot_index: 0,
      slot_state: newSlotState(),
      transcript: [{ slotId: firstSlotId, question: firstQuestion, answer: "" }],
      status: "in_progress" as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    await db.createMiningSession(session);
    res.status(201).json({
      sessionId: session.id,
      slotIndex: 0,
      slotName: nameFor(firstSlotId),
      question: firstQuestion,
      done: false
    });
    return;
  }

  const session = await db.getMiningSession(sessionId, user.id);
  if (!session) {
    res.status(404).json({ error: "session_not_found" });
    return;
  }
  if (session.status === "completed") {
    res.status(200).json({ sessionId: session.id, done: true });
    return;
  }

  const slotId = slotIdAt(session.slot_index);
  if (!slotId) {
    res.status(500).json({ error: "invalid_slot_index" });
    return;
  }

  if (!answer && !skip) {
    const pending = (session.transcript ?? []).slice(-1)[0];
    res.status(200).json({
      sessionId: session.id,
      slotIndex: session.slot_index,
      slotName: nameFor(slotId),
      question: pending && !pending.answer ? pending.question : openingFor(slotId),
      done: false
    });
    return;
  }

  // ── 건너뛰기 ──────────────────────────────────────────────────────────────
  if (skip) {
    const nextIndex = session.slot_index + 1;
    const nextSlotId = slotIdAt(nextIndex);
    if (!nextSlotId) {
      session.status = "completed";
      session.updated_at = new Date().toISOString();
      await db.updateMiningSession(session);
      res.status(200).json({ sessionId: session.id, done: true, totalSlots: TOTAL_SLOTS });
      return;
    }
    const nextQuestion = openingFor(nextSlotId);
    session.slot_index = nextIndex;
    session.slot_state = newSlotState();
    session.transcript = session.transcript ?? [];
    session.transcript.push({ slotId: nextSlotId, question: nextQuestion, answer: "" });
    session.updated_at = new Date().toISOString();
    await db.updateMiningSession(session);
    res.status(200).json({
      sessionId: session.id,
      slotIndex: nextIndex,
      slotName: nameFor(nextSlotId),
      question: nextQuestion,
      checkpointNote: null,
      done: false
    });
    return;
  }

  session.transcript = session.transcript ?? [];
  const trailing = session.transcript[session.transcript.length - 1];
  if (trailing && !trailing.answer) {
    trailing.answer = answer!;
  } else {
    session.transcript.push({ slotId, question: "", answer: answer! });
  }

  const result = stepSlot(slotId, session.slot_state, answer!);

  if (result.status === "asking") {
    session.slot_state = result.state;
    session.transcript.push({ slotId, question: result.nextQuestion!, answer: "" });
    session.updated_at = new Date().toISOString();
    await db.updateMiningSession(session);
    res.status(200).json({
      sessionId: session.id,
      slotIndex: session.slot_index,
      slotName: nameFor(slotId),
      question: result.nextQuestion,
      done: false
    });
    return;
  }

  const card = await db.createStoryCard({
    user_id: user.id,
    slot_id: slotId,
    slot_name: nameFor(slotId),
    raw_answers: result.state.raw_answers,
    modules_filled: result.state.modules_filled,
    status: result.status
  });

  const nextIndex = session.slot_index + 1;
  const nextSlotId = slotIdAt(nextIndex);

  if (!nextSlotId) {
    session.status = "completed";
    session.updated_at = new Date().toISOString();
    await db.updateMiningSession(session);
    res.status(200).json({ sessionId: session.id, done: true, lastCard: card, totalSlots: TOTAL_SLOTS });
    return;
  }

  const nextQuestion = openingFor(nextSlotId);
  session.slot_index = nextIndex;
  session.slot_state = newSlotState();
  session.transcript.push({ slotId: nextSlotId, question: nextQuestion, answer: "" });
  session.updated_at = new Date().toISOString();
  await db.updateMiningSession(session);

  const checkpointNote =
    nextIndex === 5 || nextIndex === 8
      ? "여기까지의 이야기들 사이에서 공통된 흐름이 보이기 시작해요. 계속 이어가볼게요."
      : null;

  res.status(200).json({
    sessionId: session.id,
    slotIndex: nextIndex,
    slotName: nameFor(nextSlotId),
    question: nextQuestion,
    checkpointNote,
    lastCard: card,
    done: false
  });
});
