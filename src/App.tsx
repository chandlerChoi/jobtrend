import { Route, Routes } from "react-router-dom";
import NavBar from "./components/common/NavBar";
import { AuthProvider } from "./context/AuthContext";
import { CreditProvider } from "./context/CreditContext";
import OnboardingPage from "./pages/OnboardingPage";
import TrendDashboardPage from "./pages/TrendDashboardPage";
import AlertSettingsPage from "./pages/AlertSettingsPage";
import ReportInboxPage from "./pages/ReportInboxPage";
import AdjacentJobsPage from "./pages/AdjacentJobsPage";
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
              <Route path="/trends/:jobCategory" element={<TrendDashboardPage />} />
              <Route path="/alerts" element={<AlertSettingsPage />} />
              <Route path="/reports" element={<ReportInboxPage />} />
              <Route path="/adjacent/:jobCategory" element={<AdjacentJobsPage />} />
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
