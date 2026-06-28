import { useState } from "react";
import { CATEGORIES, REGIONS } from "../../../shared/categories";

type AlertType = "직무명" | "기술스택" | "지역" | "연차";
const TYPES: AlertType[] = ["직무명", "기술스택", "지역", "연차"];

function optionsForType(type: AlertType): string[] {
  if (type === "직무명") return CATEGORIES.map((c) => c.name);
  if (type === "지역") return REGIONS;
  if (type === "연차") return ["신입", "경력 1-3년", "경력 4-7년", "경력무관"];
  return Array.from(new Set(CATEGORIES.flatMap((c) => c.keywords)));
}

interface AlertFormProps {
  disabled: boolean;
  onSubmit: (payload: { keyword: string; jobCategory?: string; region?: string; channel: "email" | "push" }) => void;
}

export default function AlertForm({ disabled, onSubmit }: AlertFormProps) {
  const [type, setType] = useState<AlertType>("직무명");
  const [keyword, setKeyword] = useState(optionsForType("직무명")[0]);
  const [channel, setChannel] = useState<"email" | "push">("email");

  function handleSubmit() {
    const payload: Parameters<AlertFormProps["onSubmit"]>[0] = { keyword, channel };
    if (type === "직무명") payload.jobCategory = keyword;
    if (type === "지역") payload.region = keyword;
    onSubmit(payload);
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <select
          value={type}
          onChange={(e) => {
            const next = e.target.value as AlertType;
            setType(next);
            setKeyword(optionsForType(next)[0]);
          }}
          className="rounded-lg bg-ink-900 px-3 py-2 text-sm"
        >
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className="rounded-lg bg-ink-900 px-3 py-2 text-sm sm:col-span-2"
        >
          {optionsForType(type).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        <select
          value={channel}
          onChange={(e) => setChannel(e.target.value as "email" | "push")}
          className="rounded-lg bg-ink-900 px-3 py-2 text-sm"
        >
          <option value="email">이메일</option>
          <option value="push">푸시</option>
        </select>
      </div>
      <button
        onClick={handleSubmit}
        disabled={disabled}
        className="mt-4 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium disabled:opacity-40"
      >
        {disabled ? "무료 등록 한도 도달" : "알람 등록"}
      </button>
    </div>
  );
}
