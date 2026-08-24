"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { History, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type HistoryEntry = { label: string; url: string };

export function HistoryPanel() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("vv_history") ?? "[]");
      setHistory(stored);
    } catch {}
  }, []);

  function remove(url: string) {
    const next = history.filter((e) => e.url !== url);
    setHistory(next);
    localStorage.setItem("vv_history", JSON.stringify(next));
  }

  function clearAll() {
    setHistory([]);
    localStorage.removeItem("vv_history");
  }

  if (history.length === 0) return null;

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <History className="h-4 w-4" />
          Your Recent Lookups
        </h2>
        <Button variant="ghost" size="sm" onClick={clearAll} className="text-xs">
          Clear all
        </Button>
      </div>
      <ul className="flex flex-wrap gap-2">
        {history.map((entry) => (
          <li
            key={entry.url}
            className="flex items-center gap-1 bg-muted rounded-full px-3 py-1.5 text-sm"
          >
            <Link href={entry.url} className="hover:underline">
              {entry.label}
            </Link>
            <button
              onClick={() => remove(entry.url)}
              className="text-muted-foreground hover:text-foreground ml-1"
              aria-label="Remove"
            >
              <X className="h-3 w-3" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
