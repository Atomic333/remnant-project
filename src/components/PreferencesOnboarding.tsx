import { useState } from "react";
import { Loader2, Mail, Bell, Megaphone } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "@/hooks/use-toast";

const options = [
  {
    key: "email_opt_in" as const,
    icon: Mail,
    label: "Email messages",
    description: "Updates about new markers and stories near you.",
  },
  {
    key: "notifications_opt_in" as const,
    icon: Bell,
    label: "Notifications",
    description: "Alerts when you're close to a historical site.",
  },
  {
    key: "ads_opt_in" as const,
    icon: Megaphone,
    label: "Advertisements",
    description: "Partner offers and sponsored local events.",
  },
];

const PreferencesOnboarding = () => {
  const { savePreferences } = useProfile();
  const [prefs, setPrefs] = useState({
    email_opt_in: false,
    notifications_opt_in: false,
    ads_opt_in: false,
  });
  const [busy, setBusy] = useState(false);

  const save = async (values: typeof prefs) => {
    if (busy) return;
    setBusy(true);
    try {
      await savePreferences(values);
    } catch (error) {
      toast({
        title: "Couldn't save your preferences",
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen px-5 py-10">
      <h1 className="font-display text-2xl font-medium text-foreground">
        What would you like to receive?
      </h1>
      <p className="mt-2 text-sm text-on-surface-variant">
        Choose what MarkerQuest can send you. You can change this any time on your profile.
      </p>

      <div className="mt-6 space-y-3">
        {options.map(({ key, icon: Icon, label, description }) => (
          <div key={key} className="flex items-start gap-3 rounded-xl bg-card p-4 elevation-1">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-card-foreground">{label}</p>
              <p className="mt-0.5 text-xs text-on-surface-variant">{description}</p>
            </div>
            <Switch
              checked={prefs[key]}
              onCheckedChange={(checked) => setPrefs((prev) => ({ ...prev, [key]: checked }))}
              aria-label={label}
            />
          </div>
        ))}
      </div>

      <button
        onClick={() => save(prefs)}
        disabled={busy}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-display text-sm font-medium text-primary-foreground elevation-1 disabled:opacity-60"
      >
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        Continue
      </button>
      <button
        onClick={() =>
          save({ email_opt_in: false, notifications_opt_in: false, ads_opt_in: false })
        }
        disabled={busy}
        className="mt-3 w-full text-center text-xs text-on-surface-variant underline"
      >
        Skip — don't send me anything
      </button>
    </div>
  );
};

export default PreferencesOnboarding;
