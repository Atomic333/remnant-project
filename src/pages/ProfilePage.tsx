import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Mail, Bell, Megaphone, LogOut, Camera, Shield, MapPin } from "lucide-react";
import { z } from "zod";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useProfile, resolveAvatarUrl } from "@/hooks/useProfile";
import { useVisited } from "@/hooks/useVisited";
import { useAllMarkers } from "@/hooks/useAllMarkers";

const ACCEPTED = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const MAX_BYTES = 5 * 1024 * 1024;

const nameSchema = z
  .string()
  .trim()
  .max(60, { message: "Display name must be 60 characters or fewer." });

const prefOptions = [
  { key: "email_opt_in" as const, icon: Mail, label: "Email messages" },
  { key: "notifications_opt_in" as const, icon: Bell, label: "Notifications" },
  { key: "ads_opt_in" as const, icon: Megaphone, label: "Advertisements" },
];

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, isAdmin, signOut } = useAuth();
  const { profile, update } = useProfile();
  const { records } = useVisited();
  const markers = useAllMarkers();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    setName(profile?.display_name ?? "");
  }, [profile?.display_name]);

  useEffect(() => {
    let active = true;
    resolveAvatarUrl(profile?.avatar_url ?? null).then((url) => {
      if (active) setAvatarUrl(url);
    });
    return () => {
      active = false;
    };
  }, [profile?.avatar_url]);

  const visitedList = useMemo(
    () =>
      records
        .map((r) => ({ record: r, marker: markers.find((m) => m.id === r.marker_id) }))
        .filter((entry) => entry.marker),
    [records, markers],
  );

  const initials = (profile?.display_name || profile?.email || "?")
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  const saveName = async () => {
    const parsed = nameSchema.safeParse(name);
    if (!parsed.success) {
      toast({ title: parsed.error.issues[0].message, variant: "destructive" });
      return;
    }
    setSavingName(true);
    try {
      await update({ display_name: parsed.data || null });
      toast({ title: "Profile updated" });
    } catch (error) {
      toast({
        title: "Couldn't save your name",
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    } finally {
      setSavingName(false);
    }
  };

  const onFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !user) return;
    if (!ACCEPTED.includes(file.type)) {
      toast({ title: "Use a PNG, JPG, WEBP or GIF image.", variant: "destructive" });
      return;
    }
    if (file.size > MAX_BYTES) {
      toast({ title: "Image must be 5MB or smaller.", variant: "destructive" });
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("avatars")
      .upload(path, file, { contentType: file.type, upsert: true });
    if (error) {
      setUploading(false);
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      return;
    }
    try {
      if (profile?.avatar_url && !profile.avatar_url.startsWith("http")) {
        await supabase.storage.from("avatars").remove([profile.avatar_url]);
      }
      await update({ avatar_url: path });
      toast({ title: "Profile image updated" });
    } catch (err) {
      toast({
        title: "Couldn't save your image",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const togglePref = async (key: (typeof prefOptions)[number]["key"], value: boolean) => {
    try {
      await update({ [key]: value });
    } catch (error) {
      toast({
        title: "Couldn't update preference",
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen pb-24">
      <PageHeader title="Profile" />

      <div className="space-y-3 px-5 pt-4">
        {/* Identity */}
        <div className="rounded-xl bg-card p-4 elevation-1">
          <div className="flex items-center gap-4">
            <button
              onClick={() => fileRef.current?.click()}
              className="relative"
              aria-label="Change profile image"
            >
              <Avatar className="h-20 w-20">
                {avatarUrl && <AvatarImage src={avatarUrl} alt="Your profile image" />}
                <AvatarFallback className="bg-secondary text-lg text-secondary-foreground">
                  {initials || "?"}
                </AvatarFallback>
              </Avatar>
              <span className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
                {uploading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Camera className="h-3.5 w-3.5" />
                )}
              </span>
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-card-foreground">
                {profile?.display_name || "Add your name"}
              </p>
              <p className="truncate text-xs text-on-surface-variant">{profile?.email}</p>
              <p className="mt-1 text-xs text-on-surface-variant">
                PNG, JPG, WEBP or animated GIF · max 5MB
              </p>
            </div>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPTED.join(",")}
            onChange={onFile}
            className="hidden"
          />

          <label htmlFor="display-name" className="mt-4 block text-xs font-medium text-on-surface-variant">
            Display name
          </label>
          <div className="mt-1 flex gap-2">
            <input
              id="display-name"
              value={name}
              maxLength={60}
              onChange={(e) => setName(e.target.value)}
              className="min-w-0 flex-1 rounded-lg bg-surface-variant px-3 py-2.5 text-sm text-foreground outline-none"
            />
            <button
              onClick={saveName}
              disabled={savingName}
              className="flex shrink-0 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              {savingName && <Loader2 className="h-4 w-4 animate-spin" />}
              Save
            </button>
          </div>
        </div>

        {/* Communication preferences */}
        <div className="rounded-xl bg-card p-4 elevation-1">
          <h2 className="font-display text-sm font-medium text-card-foreground">
            What we can send you
          </h2>
          <div className="mt-3 space-y-3">
            {prefOptions.map(({ key, icon: Icon, label }) => (
              <div key={key} className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <span className="flex-1 text-sm text-card-foreground">{label}</span>
                <Switch
                  checked={Boolean(profile?.[key])}
                  onCheckedChange={(checked) => togglePref(key, checked)}
                  aria-label={label}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Visited sites */}
        <div className="rounded-xl bg-card p-4 elevation-1">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-sm font-medium text-card-foreground">Sites visited</h2>
            <span className="text-sm text-on-surface-variant">
              {visitedList.length} of {markers.length}
            </span>
          </div>
          {visitedList.length === 0 ? (
            <p className="mt-3 text-xs text-on-surface-variant">
              No visits yet — scan a marker QR code or mark a site as visited.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {visitedList.map(({ record, marker }) => (
                <li key={record.marker_id}>
                  <button
                    onClick={() => navigate(`/marker/${record.marker_id}`)}
                    className="flex w-full items-center gap-3 rounded-lg bg-surface-variant px-3 py-2.5 text-left"
                  >
                    <MapPin className="h-4 w-4 shrink-0 text-primary" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-foreground">{marker!.name}</span>
                      {record.visited_at && (
                        <span className="block text-xs text-on-surface-variant">
                          {new Date(record.visited_at).toLocaleDateString()}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {isAdmin && (
          <button
            onClick={() => navigate("/admin")}
            className="flex w-full items-center gap-3 rounded-xl bg-card p-4 text-left elevation-1"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <span className="text-sm font-medium text-card-foreground">Admin dashboard</span>
          </button>
        )}

        <button
          onClick={async () => {
            await signOut();
            navigate("/auth", { replace: true });
          }}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-border py-3 font-display text-sm font-medium text-foreground"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>

      <BottomNav />
    </div>
  );
};

export default ProfilePage;
