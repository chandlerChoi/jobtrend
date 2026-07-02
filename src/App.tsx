import { Route, Routes } from "react-router-dom";
import NavBar from "./components/common/NavBar";
import PrivateRoute from "./components/common/PrivateRoute";
import { AuthProvider } from "./context/AuthContext";
import { CreditProvider } from "./context/CreditContext";
import TrendDashboardPage from "./pages/TrendDashboardPage";
import CompanyPage from "./pages/CompanyPage";
import JobFairCalendarPage from "./pages/JobFairCalendarPage";
import InterviewPage from "./pages/InterviewPage";
import InterviewSessionPage from "./pages/InterviewSessionPage";
import MyPage from "./pages/MyPage";
import LoginPage from "./pages/LoginPage";
import AuthCallbackPage from "./pages/AuthCallbackPage";
import StoryMiningPage from "./pages/StoryMiningPage";

export default function App() {
  return (
    <AuthProvider>
      <CreditProvider>
        <div className="min-h-screen bg-[#F7F7F5] text-gray-900">
          <NavBar />
          <main className="mx-auto max-w-6xl px-6 py-8">
            <Routes>
              <Route path="/" element={<TrendDashboardPage />} />
              <Route path="/news" element={<TrendDashboardPage />} />
              <Route path="/companies/:name" element={<CompanyPage />} />
              <Route path="/job-fairs" element={<JobFairCalendarPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/auth/callback" element={<AuthCallbackPage />} />
              <Route path="/interview" element={<PrivateRoute><InterviewPage /></PrivateRoute>} />
              <Route path="/interview/:sessionId" element={<PrivateRoute><InterviewSessionPage /></PrivateRoute>} />
              <Route path="/mypage" element={<PrivateRoute><MyPage /></PrivateRoute>} />
              <Route path="/story-bank" element={<PrivateRoute><StoryMiningPage /></PrivateRoute>} />
            </Routes>
          </main>
        </div>
      </CreditProvider>
    </AuthProvider>
  );
}
