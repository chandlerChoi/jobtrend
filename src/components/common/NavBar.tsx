import { useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useCredits } from "../../context/CreditContext";
import { useAuth } from "../../context/AuthContext";
import { useOnClickOutside } from "../../hooks/useOnClickOutside";

const NAV_LINKS = [
  { to: "/news", label: "트렌드" },
  { to: "/job-fairs", label: "채용행사" },
  { to: "/interview", label: "AI 면접" },
  { to: "/story-bank", label: "스토리뱅크" },
];

function avatarInitials(email: string | undefined | null): string {
  if (!email) return "??";
  return email.slice(0, 2).toUpperCase();
}

export default function NavBar() {
  const { credits } = useCredits();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useOnClickOutside(menuRef, () => setMenuOpen(false));

  async function handleSignOut() {
    setMenuOpen(false);
    await signOut();
    navigate("/");
  }

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

        {user ? (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-500 text-xs font-semibold text-white hover:bg-brand-600 transition-colors"
            >
              {avatarInitials(user.email)}
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-44 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
                <div className="border-b border-gray-100 px-4 py-3">
                  <p className="truncate text-xs text-gray-500">{user.email}</p>
                  {credits > 0 && (
                    <p className="mt-0.5 text-xs font-medium text-brand-600">크레딧 {credits}회</p>
                  )}
                </div>
                <NavLink
                  to="/mypage"
                  onClick={() => setMenuOpen(false)}
                  className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                >
                  마이페이지
                </NavLink>
                <button
                  onClick={handleSignOut}
                  className="block w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  로그아웃
                </button>
              </div>
            )}
          </div>
        ) : (
          <NavLink
            to="/login"
            className="rounded-full bg-brand-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
          >
            로그인
          </NavLink>
        )}
      </div>
    </header>
  );
}
