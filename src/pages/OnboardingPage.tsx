import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CATEGORIES } from "../../shared/categories";

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  function goTo(jobCategory: string) {
    navigate(`/trends/${encodeURIComponent(jobCategory)}`);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 py-16 text-center animate-fadeUp">
      <div>
        <h1 className="text-3xl font-bold">지금, 어떤 직무가 뜨고 있을까요?</h1>
        <p className="mt-2 text-sm text-white/50">
          실제 공고 데이터로 직무별 자격요건과 트렌드를 확인하고, 인접 직무와 모의면접까지 한 번에.
        </p>
      </div>

      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && query && goTo(query)}
          placeholder="직무명을 검색해보세요 (예: 백엔드 개발자)"
          className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm"
          list="job-category-options"
        />
        <datalist id="job-category-options">
          {CATEGORIES.map((c) => (
            <option key={c.name} value={c.name} />
          ))}
        </datalist>
        <button
          onClick={() => query && goTo(query)}
          className="rounded-lg bg-brand-500 px-5 py-3 text-sm font-medium"
        >
          검색
        </button>
      </div>

      <div>
        <p className="mb-3 text-xs text-white/40">인기 직무</p>
        <div className="flex flex-wrap justify-center gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.name}
              onClick={() => goTo(c.name)}
              className="rounded-full bg-white/5 px-4 py-1.5 text-sm text-white/70 hover:bg-white/10"
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
