import { useCallback, useState } from "react";
import { submitAnswer, getInterviewSummary } from "../api/endpoints";
import type { InterviewQuestion, InterviewSummary } from "../../shared/types";

interface AnsweredItem {
  question: string;
  answer: string;
  feedback: { strengths: string[]; improvements: string[] };
}

export function useInterviewSession(sessionId: string, questions: InterviewQuestion[]) {
  const [step, setStep] = useState(0);
  const [history, setHistory] = useState<AnsweredItem[]>([]);
  const [summary, setSummary] = useState<InterviewSummary | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const currentQuestion = questions[step] ?? null;
  const isComplete = step >= questions.length;

  const answer = useCallback(
    async (answerText: string) => {
      if (!currentQuestion) return;
      setSubmitting(true);
      try {
        const result = await submitAnswer({ sessionId, questionId: currentQuestion.id, answerText });
        setHistory((h) => [...h, { question: currentQuestion.text, answer: answerText, feedback: result.feedback }]);

        if (result.nextQuestionId === null) {
          const finalSummary = await getInterviewSummary(sessionId);
          setSummary(finalSummary);
          setStep((s) => s + 1);
        } else {
          setStep((s) => s + 1);
        }
      } finally {
        setSubmitting(false);
      }
    },
    [currentQuestion, sessionId]
  );

  return { currentQuestion, step, totalSteps: questions.length, history, summary, isComplete, submitting, answer };
}
