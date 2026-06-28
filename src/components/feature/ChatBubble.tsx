interface ChatBubbleProps {
  role: "interviewer" | "candidate";
  children: React.ReactNode;
}

export default function ChatBubble({ role, children }: ChatBubbleProps) {
  const isInterviewer = role === "interviewer";
  return (
    <div className={`flex ${isInterviewer ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[80%] rounded-xl px-4 py-3 text-sm ${
          isInterviewer ? "bg-white/10 text-white" : "bg-brand-500 text-white"
        }`}
      >
        {children}
      </div>
    </div>
  );
}
