import { Link } from "react-router-dom";

export default function OnboardingPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-8 py-16 text-center animate-fadeUp">
      <div>
        <h1 className="text-3xl font-bold">지금, 어떤 기업이 채용 중일까요?</h1>
        <p className="mt-2 text-sm text-white/50">
          고용24 공채속보를 실시간으로 모아 보여드리고, 관심기업을 등록하면 새 공채를 바로 알려드려요.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Link to="/news" className="rounded-xl border border-white/10 bg-white/5 p-5 text-left hover:border-brand-500/50">
          <p className="font-semibold">공채속보 피드</p>
          <p className="mt-1 text-xs text-white/40">방금 올라온 공채를 가장 먼저 확인하세요.</p>
        </Link>
        <Link to="/job-fairs" className="rounded-xl border border-white/10 bg-white/5 p-5 text-left hover:border-brand-500/50">
          <p className="font-semibold">채용행사 캘린더</p>
          <p className="mt-1 text-xs text-white/40">채용박람회·구인구직 만남의날 일정을 확인하세요.</p>
        </Link>
        <Link to="/alerts" className="rounded-xl border border-white/10 bg-white/5 p-5 text-left hover:border-brand-500/50">
          <p className="font-semibold">관심기업 알림</p>
          <p className="mt-1 text-xs text-white/40">기업을 등록하면 새 공채를 알려드려요.</p>
        </Link>
        <Link to="/interview" className="rounded-xl border border-brand-500/30 bg-brand-500/10 p-5 text-left hover:border-brand-500/60">
          <p className="font-semibold">AI 모의면접</p>
          <p className="mt-1 text-xs text-white/40">JD와 이력서로 예상 질문을 받아보세요.</p>
        </Link>
      </div>
    </div>
  );
}
