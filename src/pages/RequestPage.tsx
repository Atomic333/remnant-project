import { useState } from "react";
import { Check, Camera } from "lucide-react";
import PageHeader from "@/components/PageHeader";

const RequestPage = () => {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: "",
    address: "",
    why: "",
    email: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-secondary">
          <Check className="h-10 w-10 text-primary" />
        </div>
        <h2 className="font-display text-xl font-medium text-foreground">Request Received</h2>
        <p className="mt-3 text-sm text-on-surface-variant">
          Thank you — we'll review this marker. Your contribution helps preserve our local history.
        </p>
        <button
          onClick={() => { setSubmitted(false); setForm({ name: "", address: "", why: "", email: "" }); }}
          className="mt-6 rounded-xl bg-primary px-8 py-3 font-display text-sm font-medium text-primary-foreground"
        >
          Return Home
        </button>
        <button
          onClick={() => { setSubmitted(false); setForm({ name: "", address: "", why: "", email: "" }); }}
          className="mt-3 text-sm font-medium text-primary"
        >
          Request Another Marker
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <PageHeader title="Request a Marker" />

      <form onSubmit={handleSubmit} className="space-y-5 px-5 pt-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Location Name</label>
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm text-foreground placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="e.g. Stadium High School"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Address or Description</label>
          <input
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm text-foreground placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Street address or landmark description"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Why It Matters</label>
          <textarea
            required
            value={form.why}
            onChange={(e) => setForm({ ...form, why: e.target.value })}
            rows={3}
            className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm text-foreground placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Tell us why this place matters to Tacoma's history..."
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Photo Upload (optional)</label>
          <button
            type="button"
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-surface py-8 text-sm text-on-surface-variant"
          >
            <Camera className="h-5 w-5" />
            <span>Tap to upload image<br />(JPG, PNG up to 10MB)</span>
          </button>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Your Email</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm text-foreground placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Optional — for updates"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-xl bg-primary py-3.5 font-display text-sm font-medium text-primary-foreground elevation-1"
        >
          Submit Request
        </button>
      </form>
    </div>
  );
};

export default RequestPage;
