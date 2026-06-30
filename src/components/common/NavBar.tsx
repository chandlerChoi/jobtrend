import { NavLink } from "react-router-dom";

const LINKS = [
  { to: "/news", label: "공채속보" },
  { to: "/job-fairs", label: "채용행사" },
  { to: "/alerts", label: "관심기업 알림" },
  { to: "/digest", label: "데일리 다이제스트" },
  { to: "/interview", label: "AI 모의면접" },
  { to: "/mypage", label: "마이페이지" }
];

export default function NavBar() {
  return (
    <header className="sticky top-0 z-10 border-b border-white/10 bg-ink-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <NavLink to="/" className="text-lg font-bold text-white">
          잡<span className="text-brand-500">트렌드</span>
        </NavLink>
        <nav className="flex gap-5 text-sm text-white/70">
          {LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `transition-colors hover:text-white ${isActive ? "font-semibold text-white" : ""}`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}
