import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import HomePage from "@/pages/HomePage";
import MapPage from "@/pages/MapPage";
import NearbyPage from "@/pages/NearbyPage";
import ScanPage from "@/pages/ScanPage";
import MarkerDetailPage from "@/pages/MarkerDetailPage";
import ProgressPage from "@/pages/ProgressPage";
import RequestPage from "@/pages/RequestPage";
import SettingsPage from "@/pages/SettingsPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <div className="mx-auto min-h-screen max-w-lg">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/nearby" element={<NearbyPage />} />
            <Route path="/scan" element={<ScanPage />} />
            <Route path="/marker/:id" element={<MarkerDetailPage />} />
            <Route path="/progress" element={<ProgressPage />} />
            <Route path="/request" element={<RequestPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <BottomNav />
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
