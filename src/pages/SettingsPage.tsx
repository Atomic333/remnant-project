import { useState } from "react";
import { Camera, MapPin, Sparkles, Shield, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageHeader from "@/components/PageHeader";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const SettingsPage = () => {
  const navigate = useNavigate();
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(true);

  return (
    <div className="min-h-screen pb-20">
      <PageHeader title="Settings" back />

      <div className="px-4 pt-4">
        {/* Device Permissions */}
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Device Permissions
        </h3>
        <div className="space-y-1">
          <div className="flex items-center justify-between rounded-lg bg-card p-4">
            <div className="flex items-center gap-3">
              <Camera className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium text-card-foreground">Camera</p>
                <p className="text-xs text-muted-foreground">
                  {cameraEnabled ? "Can't access in settings" : "Disabled"}
                </p>
              </div>
            </div>
            <button
              onClick={() => setCameraEnabled(!cameraEnabled)}
              className={`relative h-7 w-12 rounded-full transition-colors ${
                cameraEnabled ? "bg-primary" : "bg-muted"
              }`}
            >
              <span
                className={`absolute top-0.5 h-6 w-6 rounded-full bg-card shadow transition-transform ${
                  cameraEnabled ? "left-[22px]" : "left-0.5"
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-card p-4">
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium text-card-foreground">Location</p>
                <p className="text-xs text-muted-foreground">
                  {locationEnabled ? "Can't access in settings" : "Disabled"}
                </p>
              </div>
            </div>
            <button
              onClick={() => setLocationEnabled(!locationEnabled)}
              className={`relative h-7 w-12 rounded-full transition-colors ${
                locationEnabled ? "bg-primary" : "bg-muted"
              }`}
            >
              <span
                className={`absolute top-0.5 h-6 w-6 rounded-full bg-card shadow transition-transform ${
                  locationEnabled ? "left-[22px]" : "left-0.5"
                }`}
              />
            </button>
          </div>
        </div>

        {/* About */}
        <h3 className="mb-3 mt-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          About
        </h3>
        <div className="space-y-1">
          {/* How we use AI */}
          <Dialog>
            <DialogTrigger asChild>
              <button className="flex w-full items-center justify-between rounded-lg bg-card p-4">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium text-card-foreground">How we use AI</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>How We Use AI</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-sm text-muted-foreground">
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

          {/* Privacy Policy */}
          <Dialog>
            <DialogTrigger asChild>
              <button className="flex w-full items-center justify-between rounded-lg bg-card p-4">
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium text-card-foreground">Privacy Policy</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Privacy Policy</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-sm text-muted-foreground">
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
            className="flex w-full items-center justify-between rounded-lg bg-card p-4"
          >
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-card-foreground">Request Marker</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;