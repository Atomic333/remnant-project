import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "@/pages/HomePage";
import MapPage from "@/pages/MapPage";
import MarkerDetailPage from "@/pages/MarkerDetailPage";
import ProgressPage from "@/pages/ProgressPage";
import DashboardPage from "@/pages/DashboardPage";
import SharedVisitsPage from "@/pages/SharedVisitsPage";
import RequestPage from "@/pages/RequestPage";
import SettingsPage from "@/pages/SettingsPage";
import AuthPage from "@/pages/AuthPage";
import ProfilePage from "@/pages/ProfilePage";
import AdminPage from "@/pages/AdminPage";
import QrSheetPage from "@/pages/QrSheetPage";
import NotFound from "@/pages/NotFound";
import SplashScreen from "@/components/SplashScreen";
import RewardsPage from "@/pages/RewardsPage";
import RequireAuth from "@/components/RequireAuth";
import QuestRewardProvider from "@/components/QuestRewardProvider";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <SplashScreen />
      <BrowserRouter>
        <QuestRewardProvider>
        <div className="mx-auto min-h-screen max-w-lg">
          <Routes>
            {/* Public: marker pages opened from QR codes */}
            <Route path="/marker/:id" element={<MarkerDetailPage />} />
            <Route path="/u/:code" element={<SharedVisitsPage />} />
            <Route path="/auth" element={<AuthPage />} />

            {/* Account required */}
            <Route path="/" element={<RequireAuth><HomePage /></RequireAuth>} />
            <Route path="/map" element={<RequireAuth><MapPage /></RequireAuth>} />
            <Route path="/dashboard" element={<RequireAuth allowGuest={false}><DashboardPage /></RequireAuth>} />
            <Route path="/progress" element={<RequireAuth><ProgressPage /></RequireAuth>} />

            <Route path="/request" element={<RequireAuth><RequestPage /></RequireAuth>} />
            <Route path="/settings" element={<RequireAuth><SettingsPage /></RequireAuth>} />
            <Route path="/rewards" element={<RequireAuth allowGuest={false}><RewardsPage /></RequireAuth>} />
            <Route path="/profile" element={<RequireAuth allowGuest={false}><ProfilePage /></RequireAuth>} />
            <Route path="/admin" element={<RequireAuth admin><AdminPage /></RequireAuth>} />
            <Route path="/admin/qr-codes" element={<RequireAuth admin><QrSheetPage /></RequireAuth>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
        </QuestRewardProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
