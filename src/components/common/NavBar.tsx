import { NavLink } from "react-router-dom";
import { useCredits } from "../../context/CreditContext";

const NAV_LINKS = [
  { to: "/news", label: "트렌드" },
  { to: "/job-fairs", label: "채용행사" },
  { to: "/interview", label: "AI 면접" },
];

export default function NavBar() {
  const { credits } = useCredits();
  return (
    <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <NavLink to="/" className="text-lg font-bold text-gray-900">
          잡<span className="text-brand-500">트렌드</span>
        </NavLink>
        <nav className="flex gap-7 text-sm text-gray-600">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `transition-colors hover:text-gray-900 ${isActive ? "font-semibold text-gray-900" : ""}`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        <NavLink
          to="/mypage"
          className="flex items-center gap-2 rounded-full bg-brand-100 px-4 py-1.5 text-sm font-medium text-brand-600 hover:bg-brand-500 hover:text-white transition-colors"
        >
          마이페이지
          {credits > 0 && (
            <span className="rounded-full bg-brand-500 text-white px-1.5 py-0.5 text-xs leading-none">{credits}</span>
          )}
        </NavLink>
      </div>
    </header>
  );
}
