interface ChatBubbleProps {
  role: "interviewer" | "candidate";
  children: React.ReactNode;
}

export default function ChatBubble({ role, children }: ChatBubbleProps) {
  const isInterviewer = role === "interviewer";
  return (
    <div className={`flex ${isInterviewer ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isInterviewer
            ? "bg-gray-100 text-gray-800 rounded-tl-sm"
            : "bg-brand-500 text-white rounded-tr-sm"
        }`}
      >
        {children}
      </div>
    </div>
  );
}
