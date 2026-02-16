import { useState } from "react";
import { Camera, MapPin, Sparkles, Shield, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageHeader from "@/components/PageHeader";

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
          {[
            { icon: Sparkles, label: "How we use AI" },
            { icon: Shield, label: "Privacy Policy" },
          ].map(({ icon: Icon, label }) => (
            <button
              key={label}
              className="flex w-full items-center justify-between rounded-lg bg-card p-4"
            >
              <div className="flex items-center gap-3">
                <Icon className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium text-card-foreground">{label}</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
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
