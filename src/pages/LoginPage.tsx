import { useState } from "react";
import { useAuth } from "../context/AuthContext";

function mapAuthError(message: string): string {
  return `로그인에 실패했어요. (${message})`;
}

function isWebView(): boolean {
  const ua = navigator.userAgent;
  // Android WebView: contains 'wv' flag or KakaoTalk/Line/Instagram/Facebook
  const webviewPatterns = /KAKAOTALK|NAVER|Instagram|FBAN|FBAV|Line\/|MicroMessenger|wv\)|WebView/i;
  // Android WebView 추가 감지: Chrome이 없는 AppleWebKit (iOS webview)
  const isAndroidWebView = /Android/.test(ua) && /wv/.test(ua);
  const isIOSWebView = /iPhone|iPad/.test(ua) && !/Safari/.test(ua) && /AppleWebKit/.test(ua);
  return webviewPatterns.test(ua) || isAndroidWebView || isIOSWebView;
}

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<"google" | "kakao" | null>(null);
  const { googleLogin, kakaoLogin } = useAuth();
  const inWebView = isWebView();

  async function handleGoogle() {
    setSubmitting("google");
    setError(null);
    const { error } = await googleLogin();
    if (error) {
      setError(mapAuthError(error));
      setSubmitting(null);
    }
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

        {inWebView && (
          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <p className="font-semibold mb-1">⚠️ 인앱 브라우저에서는 구글 로그인이 제한됩니다</p>
            <p className="text-xs leading-relaxed text-amber-700">
              카카오톡·인스타그램 등 앱 내 브라우저에서 Google 로그인 시 차단될 수 있어요.<br />
              <strong>Chrome 또는 Safari에서 직접 열어주세요.</strong>
            </p>
            <button
              onClick={() => window.open(window.location.href, "_blank")}
              className="mt-2 w-full rounded-lg bg-amber-500 py-2 text-xs font-semibold text-white hover:bg-amber-600"
            >
              Chrome/Safari에서 열기
            </button>
          </div>
        )}

        <div className="mt-8 flex flex-col gap-3">
          {/* 카카오 로그인 */}
          <button
            onClick={handleKakao}
            disabled={submitting !== null}
            className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-[#FEE500] py-3 text-sm font-semibold text-[#191919] hover:bg-[#f0d800] disabled:opacity-50 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              <path fill="#191919" d="M9 1.5C4.86 1.5 1.5 4.19 1.5 7.5c0 2.1 1.27 3.94 3.19 5.03l-.81 2.97c-.07.26.21.47.44.32L7.7 13.5c.42.06.86.09 1.3.09 4.14 0 7.5-2.69 7.5-6S13.14 1.5 9 1.5z"/>
            </svg>
            {submitting === "kakao" ? "이동 중..." : "카카오로 시작하기"}
          </button>

          {/* 구글 로그인 */}
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
