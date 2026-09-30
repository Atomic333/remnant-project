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
import TrailsPage from "@/pages/TrailsPage";
import TrailDetailPage from "@/pages/TrailDetailPage";
import AdminTrailsPage from "@/pages/AdminTrailsPage";
import AdminImportPage from "@/pages/AdminImportPage";
import ExploreWashingtonPage from "@/pages/ExploreWashingtonPage";
import WashingtonStoryPage from "@/pages/WashingtonStoryPage";
import SplashScreen from "@/components/SplashScreen";
import FloatingMapButton from "@/components/FloatingMapButton";
import WalletPage from "@/pages/WalletPage";
import StorePage from "@/pages/StorePage";
import AdminQuestPage from "@/pages/AdminQuestPage";
import { Navigate } from "react-router-dom";
import RequireAuth from "@/components/RequireAuth";
import QuestRewardProvider from "@/components/QuestRewardProvider";
import PostcardsPage from "@/pages/PostcardsPage";
import PendingDiscoveryClaimer from "@/components/PendingDiscoveryClaimer";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <SplashScreen />
      <BrowserRouter>
        <QuestRewardProvider>
        <PendingDiscoveryClaimer />
        <div className="mx-auto min-h-screen max-w-lg">
          <Routes>
            {/* Public: marker pages opened from QR codes */}
            <Route path="/marker/:id" element={<MarkerDetailPage />} />
            <Route path="/trails" element={<TrailsPage />} />
            <Route path="/trails/:slug" element={<TrailDetailPage />} />
            <Route path="/postcards" element={<PostcardsPage />} />
            <Route path="/u/:code" element={<SharedVisitsPage />} />
            <Route path="/auth" element={<AuthPage />} />

            {/* Account required */}
            <Route path="/" element={<RequireAuth><HomePage /></RequireAuth>} />
            <Route path="/map" element={<RequireAuth><MapPage /></RequireAuth>} />
            <Route path="/dashboard" element={<RequireAuth allowGuest={false}><DashboardPage /></RequireAuth>} />
            <Route path="/progress" element={<RequireAuth><ProgressPage /></RequireAuth>} />

            <Route path="/request" element={<RequireAuth><RequestPage /></RequireAuth>} />
            <Route path="/settings" element={<RequireAuth><SettingsPage /></RequireAuth>} />
            <Route path="/wallet" element={<RequireAuth allowGuest={false}><WalletPage /></RequireAuth>} />
            <Route path="/store" element={<RequireAuth allowGuest={false}><StorePage /></RequireAuth>} />
            <Route path="/rewards" element={<Navigate to="/wallet" replace />} />
            <Route path="/admin/quest-coins" element={<RequireAuth admin allowCreator><AdminQuestPage /></RequireAuth>} />
            <Route path="/profile" element={<RequireAuth allowGuest={false}><ProfilePage /></RequireAuth>} />
            <Route path="/admin" element={<RequireAuth admin allowCreator><AdminPage /></RequireAuth>} />
            <Route path="/admin/qr-codes" element={<RequireAuth admin><QrSheetPage /></RequireAuth>} />
            <Route path="/admin/trails" element={<RequireAuth admin><AdminTrailsPage /></RequireAuth>} />
            <Route path="/admin/import" element={<RequireAuth admin allowCreator><AdminImportPage /></RequireAuth>} />
            <Route path="/explore/washington" element={<RequireAuth><ExploreWashingtonPage /></RequireAuth>} />
            <Route path="/explore/washington/story/:markerId" element={<RequireAuth><WashingtonStoryPage /></RequireAuth>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <FloatingMapButton />
        </div>
        </QuestRewardProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
