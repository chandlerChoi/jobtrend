import { useEffect, useState } from "react";
import { getDailyDigest } from "../api/endpoints";
import type { DailyDigestContent } from "../../shared/types";
import LoadingSpinner from "../components/common/LoadingSpinner";
import EmptyState from "../components/common/EmptyState";

export default function DigestInboxPage() {
  const [offset, setOffset] = useState(0);
  const [digest, setDigest] = useState<DailyDigestContent | null>(null);

  useEffect(() => {
    const date = new Date();
    date.setDate(date.getDate() - offset);
    setDigest(null);
    getDailyDigest(date.toISOString().slice(0, 10)).then(setDigest);
  }, [offset]);

  return (
    <div className="space-y-6 animate-fadeUp">
      <div>
        <h1 className="text-2xl font-bold">데일리 다이제스트</h1>
        <p className="mt-1 text-sm text-white/50">등록한 관심기업의 신규 공채를 매일 모아 보여드려요.</p>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={() => setOffset((o) => o + 1)} className="rounded-lg bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10">
          이전 날
        </button>
        <span className="text-sm font-medium">{digest?.date ?? "..."}</span>
        <button
          onClick={() => setOffset((o) => Math.max(0, o - 1))}
          disabled={offset === 0}
          className="rounded-lg bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10 disabled:opacity-30"
        >
          다음 날
        </button>
      </div>

      {!digest && <LoadingSpinner />}

      {digest && digest.newPostingsByCompany.length === 0 && (
        <EmptyState
          title="새 공채가 없어요."
          description="관심기업을 등록하면 그 기업의 신규 공채가 여기 표시돼요."
        />
      )}

      <div className="space-y-2">
        {digest?.newPostingsByCompany.map((p, i) => (
          <a
            key={i}
            href={p.postingUrl ?? "#"}
            target="_blank"
            rel="noreferrer"
            className="block rounded-lg bg-white/5 px-4 py-3 text-sm hover:bg-white/10"
          >
            <span className="font-medium">{p.companyName}</span> · {p.title}
          </a>
        ))}
      </div>
    </div>
  );
}
