import { Sparkles, Shield, MapPin, ChevronRight, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";
import PageHeader from "@/components/PageHeader";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import johnLukePhoto from "@/assets/team/john-luke.jpg";
import terresaPhoto from "@/assets/team/terresa.jpg";
import maisiePhoto from "@/assets/team/maisie.jpg";
import skylerPhoto from "@/assets/team/skyler.jpg";

const team = [
  {
    name: "John-Luke Dokupil",
    role: "UW MSIM",
    email: "jdokupil@uw.edu",
    photo: johnLukePhoto,
    initials: "JD",
  },
  {
    name: "Terresa Thy Tran",
    role: "UW MSIM",
    email: "tran10@uw.edu",
    photo: terresaPhoto,
    initials: "TT",
  },
  {
    name: "Maisie Liu",
    role: "UW MSIM",
    email: "hliu48@uw.edu",
    photo: maisiePhoto,
    initials: "ML",
  },
  {
    name: "Skyler Chen",
    role: "UW MSIM",
    email: "sjc163@uw.edu",
    photo: skylerPhoto,
    initials: "SC",
  },
];

const SettingsPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen pb-20">
      <PageHeader title="Settings" />

      <div className="px-5 pt-4">

        {/* About */}
        <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-on-surface-variant">
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
            <DialogContent >
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
            <DialogContent >
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

          <Dialog>
            <DialogTrigger asChild>
              <button className="flex w-full items-center justify-between rounded-xl bg-card p-4 elevation-1">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-sm font-medium text-card-foreground">About the Team</span>
                </div>
                <ChevronRight className="h-5 w-5 text-on-surface-variant" />
              </button>
            </DialogTrigger>
            <DialogContent >
              <DialogHeader>
                <DialogTitle className="font-display">About the Team</DialogTitle>
              </DialogHeader>
              <div className="space-y-1 py-2">
                <p className="pb-2 text-sm text-on-surface-variant">
                  A multidisciplinary team from the UW Information School turning data into real-world impact.
                </p>
                {team.map((member) => (
                  <div key={member.email} className="flex items-center gap-3 rounded-lg p-2">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={member.photo} alt={member.name} className="object-cover" />
                      <AvatarFallback className="bg-secondary text-primary">{member.initials}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground">{member.name}</p>
                      <p className="truncate text-xs text-on-surface-variant">{member.role}</p>
                      <p className="truncate text-xs text-primary">{member.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
