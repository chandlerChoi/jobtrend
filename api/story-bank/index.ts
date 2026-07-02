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

// POST /api/story-bank — drives the 10-slot mining interview one turn at a
// time: { } starts a session, { sessionId, answer } advances it.
// GET  /api/story-bank — lists the user's completed/incomplete story cards.
// GET  /api/story-bank?active=1 — returns the in-progress session (with
// full transcript) so the client can resume where the user left off.
export default withErrorHandling(async (req: VercelRequest, res: VercelResponse) => {
  const user = await requireUser(req);

  if (req.method === "GET") {
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

  const { sessionId, answer } = (req.body ?? {}) as { sessionId?: string; answer?: string };

  // Start a new session at slot S01. Transcript entries are appended
  // when a question is issued (answer: "") and filled in when the user
  // replies, so the trailing unanswered entry is always "the current
  // question" on resume.
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

  // Resuming without a new answer — just re-send the current question.
  if (!answer) {
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

  session.transcript = session.transcript ?? [];
  const trailing = session.transcript[session.transcript.length - 1];
  if (trailing && !trailing.answer) {
    trailing.answer = answer;
  } else {
    session.transcript.push({ slotId, question: "", answer });
  }

  const result = stepSlot(slotId, session.slot_state, answer);

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

  // Slot finished (complete or gave up after max follow-ups) — save the
  // story card and advance to the next slot, or finish the interview.
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
    res.status(200).json({
      sessionId: session.id,
      done: true,
      lastCard: card,
      totalSlots: TOTAL_SLOTS
    });
    return;
  }

  const nextQuestion = openingFor(nextSlotId);
  session.slot_index = nextIndex;
  session.slot_state = newSlotState();
  session.transcript.push({ slotId: nextSlotId, question: nextQuestion, answer: "" });
  session.updated_at = new Date().toISOString();
  await db.updateMiningSession(session);

  // Checkpoint after slots 5 and 8 (design doc STAGE 3 mid-checkins).
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
