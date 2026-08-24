"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

export function RemoveForm() {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());

    startTransition(async () => {
      try {
        const res = await fetch("/api/remove", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        setStatus(res.ok ? "success" : "error");
        if (res.ok) form.reset();
      } catch {
        setStatus("error");
      }
    });
  }

  if (status === "success") {
    return (
      <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-6 text-center text-green-600 dark:text-green-400">
        Request received. We will review it within 5 business days.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {status === "error" && (
        <p className="text-sm text-destructive">
          Something went wrong. Please try again.
        </p>
      )}
      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="name">
          Your Name
        </label>
        <input
          id="name"
          name="name"
          required
          className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="content_url">
          TikTok Content URL
        </label>
        <input
          id="content_url"
          name="content_url"
          type="url"
          placeholder="https://www.tiktok.com/@..."
          required
          className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="reason">
          Reason for Removal
        </label>
        <textarea
          id="reason"
          name="reason"
          rows={4}
          required
          placeholder="Describe why you believe this content should be removed..."
          className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? "Submitting…" : "Submit Request"}
      </Button>
    </form>
  );
}
