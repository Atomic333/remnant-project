import { useState, useEffect, useCallback } from "react";
import { Camera, MapPin, Sparkles, Shield, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageHeader from "@/components/PageHeader";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

const queryPermission = async (name: PermissionName): Promise<PermissionState> => {
  try {
    const status = await navigator.permissions.query({ name });
    return status.state;
  } catch {
    return "prompt";
  }
};

const SettingsPage = () => {
  const navigate = useNavigate();
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [locationEnabled, setLocationEnabled] = useState(false);

  // Sync toggle state with actual browser permission on mount
  useEffect(() => {
    queryPermission("camera" as PermissionName).then((s) => setCameraEnabled(s === "granted"));
    queryPermission("geolocation").then((s) => setLocationEnabled(s === "granted"));
  }, []);

  const handleCameraToggle = useCallback(async () => {
    if (cameraEnabled) {
      toast.info("To revoke camera access, update your browser site settings.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((t) => t.stop());
      setCameraEnabled(true);
      toast.success("Camera access granted");
    } catch {
      setCameraEnabled(false);
      toast.error("Camera access denied — check your browser settings");
    }
  }, [cameraEnabled]);

  const handleLocationToggle = useCallback(async () => {
    if (locationEnabled) {
      toast.info("To revoke location access, update your browser site settings.");
      return;
    }
    try {
      await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
      );
      setLocationEnabled(true);
      toast.success("Location access granted");
    } catch {
      setLocationEnabled(false);
      toast.error("Location access denied — check your browser settings");
    }
  }, [locationEnabled]);

  return (
    <div className="min-h-screen pb-20">
      <PageHeader title="Settings" />

      <div className="px-5 pt-4">
        {/* Device Permissions */}
        <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-on-surface-variant">
          Device Permissions
        </h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between rounded-xl bg-card p-4 elevation-1">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
                <Camera className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-card-foreground">Camera</p>
                <p className="text-xs text-on-surface-variant">
                  {cameraEnabled ? "Enabled" : "Disabled"}
                </p>
              </div>
            </div>
            <button
              onClick={handleCameraToggle}
              className={`relative h-8 w-[52px] rounded-full border-2 transition-colors ${
                cameraEnabled ? "border-primary bg-primary" : "border-border bg-surface-variant"
              }`}
            >
              <span
                className={`absolute top-1 h-5 w-5 rounded-full shadow transition-all ${
                  cameraEnabled ? "left-[26px] bg-primary-foreground" : "left-1 bg-on-surface-variant"
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between rounded-xl bg-card p-4 elevation-1">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-card-foreground">Location</p>
                <p className="text-xs text-on-surface-variant">
                  {locationEnabled ? "Enabled" : "Disabled"}
                </p>
              </div>
            </div>
            <button
              onClick={handleLocationToggle}
              className={`relative h-8 w-[52px] rounded-full border-2 transition-colors ${
                locationEnabled ? "border-primary bg-primary" : "border-border bg-surface-variant"
              }`}
            >
              <span
                className={`absolute top-1 h-5 w-5 rounded-full shadow transition-all ${
                  locationEnabled ? "left-[26px] bg-primary-foreground" : "left-1 bg-on-surface-variant"
                }`}
              />
            </button>
          </div>
        </div>

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
