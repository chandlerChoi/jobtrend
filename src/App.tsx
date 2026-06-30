import { Route, Routes } from "react-router-dom";
import NavBar from "./components/common/NavBar";
import { AuthProvider } from "./context/AuthContext";
import { CreditProvider } from "./context/CreditContext";
import OnboardingPage from "./pages/OnboardingPage";
import NewsFeedPage from "./pages/NewsFeedPage";
import CompanyPage from "./pages/CompanyPage";
import AlertSettingsPage from "./pages/AlertSettingsPage";
import DigestInboxPage from "./pages/DigestInboxPage";
import JobFairCalendarPage from "./pages/JobFairCalendarPage";
import InterviewPage from "./pages/InterviewPage";
import InterviewSessionPage from "./pages/InterviewSessionPage";
import MyPage from "./pages/MyPage";

export default function App() {
  return (
    <AuthProvider>
      <CreditProvider>
        <div className="min-h-screen bg-ink-950 text-white">
          <NavBar />
          <main className="mx-auto max-w-6xl px-6 py-8">
            <Routes>
              <Route path="/" element={<OnboardingPage />} />
              <Route path="/news" element={<NewsFeedPage />} />
              <Route path="/companies/:name" element={<CompanyPage />} />
              <Route path="/alerts" element={<AlertSettingsPage />} />
              <Route path="/digest" element={<DigestInboxPage />} />
              <Route path="/job-fairs" element={<JobFairCalendarPage />} />
              <Route path="/interview" element={<InterviewPage />} />
              <Route path="/interview/:sessionId" element={<InterviewSessionPage />} />
              <Route path="/mypage" element={<MyPage />} />
            </Routes>
          </main>
        </div>
      </CreditProvider>
    </AuthProvider>
  );
}
