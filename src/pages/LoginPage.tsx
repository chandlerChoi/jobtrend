import { useState } from "react";
import { useAuth } from "../context/AuthContext";

function mapAuthError(message: string): string {
  return `로그인에 실패했어요. (${message})`;
}

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<"google" | "kakao" | null>(null);
  const { googleLogin, kakaoLogin } = useAuth();

  async function handleGoogle() {
    setSubmitting("google");
    setError(null);
    const { error } = await googleLogin();
    if (error) {
      setError(mapAuthError(error));
      setSubmitting(null);
    }
    // 성공 시 Supabase가 OAuth 페이지로 리다이렉트하므로 여기서 할 일 없음
  }

  async function handleKakao() {
    setSubmitting("kakao");
    setError(null);
    const { error } = await kakaoLogin();
    if (error) {
      setError(mapAuthError(error));
      setSubmitting(null);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center animate-fadeUp">
      <div className="rounded-2xl bg-white p-12 shadow-md">
        <h1 className="text-center text-2xl font-bold text-gray-900">
          잡<span className="text-brand-500">트렌드</span>
        </h1>
        <p className="mt-2 text-center text-sm text-gray-500">
          구직 준비의 모든 것을 한 곳에서
        </p>

        <div className="mt-8 flex flex-col gap-3">
          <button
            onClick={handleGoogle}
            disabled={submitting !== null}
            className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-gray-300 bg-white py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84c-.21 1.13-.84 2.09-1.8 2.73v2.27h2.91c1.7-1.57 2.69-3.88 2.69-6.64z" />
              <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.17l-2.91-2.27c-.81.54-1.84.86-3.05.86-2.35 0-4.34-1.58-5.05-3.71H.96v2.34C2.44 15.98 5.48 18 9 18z" />
              <path fill="#FBBC05" d="M3.95 10.71c-.18-.54-.28-1.11-.28-1.71s.1-1.17.28-1.71V4.95H.96A8.99 8.99 0 0 0 0 9c0 1.45.35 2.83.96 4.05l2.99-2.34z" />
              <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0 5.48 0 2.44 2.02.96 4.95l2.99 2.34C4.66 5.16 6.65 3.58 9 3.58z" />
            </svg>
            {submitting === "google" ? "이동 중..." : "Google로 시작하기"}
          </button>

          <button
            onClick={handleKakao}
            disabled={submitting !== null}
            className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-[#FEE500] py-3 text-sm font-medium text-black hover:brightness-95 disabled:opacity-50 transition-all"
          >
            <span className="text-base">🗨️</span>
            {submitting === "kakao" ? "이동 중..." : "카카오로 시작하기"}
          </button>
        </div>

        {error && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
