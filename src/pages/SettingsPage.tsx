import { Sparkles, Shield, MapPin, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageHeader from "@/components/PageHeader";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";


const SettingsPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen pb-20">
      <PageHeader title="Settings" />

      <div className="px-5 pt-4">

        {/* About */}
        <h3 className="mb-3 mt-8 text-xs font-medium uppercase tracking-wider text-on-surface-variant">
          About
        </h3>
        <div className="space-y-2">
          <Dialog>
            <DialogTrigger asChild>
              <button className="flex w-full items-center justify-between rounded-xl bg-card p-4 elevation-1">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-sm font-medium text-card-foreground">How we use AI</span>
                </div>
                <ChevronRight className="h-5 w-5 text-on-surface-variant" />
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-sm rounded-xl">
              <DialogHeader>
                <DialogTitle className="font-display">How We Use AI</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-sm text-on-surface-variant">
                <p>The Remnant Project uses AI to bring historical markers to life. When you visit a marker, our system generates an engaging narrative based on verified historical sources.</p>
                <p><strong className="text-foreground">What AI does:</strong></p>
                <ul className="list-disc space-y-1 pl-4">
                  <li>Generates narrative stories from plaque text and archival sources</li>
                  <li>Summarizes historical context for quick reading</li>
                  <li>Helps suggest related markers nearby</li>
                </ul>
                <p><strong className="text-foreground">What AI does NOT do:</strong></p>
                <ul className="list-disc space-y-1 pl-4">
                  <li>Fabricate historical facts — all stories cite real sources</li>
                  <li>Track your location or personal data</li>
                  <li>Make decisions about which markers to include</li>
                </ul>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog>
            <DialogTrigger asChild>
              <button className="flex w-full items-center justify-between rounded-xl bg-card p-4 elevation-1">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-sm font-medium text-card-foreground">Privacy Policy</span>
                </div>
                <ChevronRight className="h-5 w-5 text-on-surface-variant" />
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-sm rounded-xl">
              <DialogHeader>
                <DialogTitle className="font-display">Privacy Policy</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-sm text-on-surface-variant">
                <p>Your privacy matters to us. The Remnant Project is designed to be used without creating an account.</p>
                <p><strong className="text-foreground">Data we collect:</strong></p>
                <ul className="list-disc space-y-1 pl-4">
                  <li>Visited marker progress (stored locally on your device)</li>
                  <li>Optional email if you submit a marker request</li>
                </ul>
                <p><strong className="text-foreground">Data we do NOT collect:</strong></p>
                <ul className="list-disc space-y-1 pl-4">
                  <li>Precise location data beyond what you grant temporarily</li>
                  <li>Personal identifying information</li>
                  <li>Browsing history or third-party tracking</li>
                </ul>
                <p>All progress data is stored locally and never leaves your device unless you choose to create an account in the future.</p>
              </div>
            </DialogContent>
          </Dialog>

          <button
            onClick={() => navigate("/request")}
            className="flex w-full items-center justify-between rounded-xl bg-card p-4 elevation-1"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <span className="text-sm font-medium text-card-foreground">Request Marker</span>
            </div>
            <ChevronRight className="h-5 w-5 text-on-surface-variant" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
