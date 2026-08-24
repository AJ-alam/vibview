"use client";

import { useState, useEffect } from "react";
import { Bookmark, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type ListItem = { id: string; label: string; url: string; addedAt: number };

const KEYS = {
  stories: "vv_list_stories",
  profiles: "vv_list_profiles",
  downloaded: "vv_list_downloaded",
  live: "vv_list_live",
} as const;

function getList(key: string): ListItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(key) ?? "[]");
  } catch {
    return [];
  }
}

function ListTab({ storageKey }: { storageKey: string }) {
  const [items, setItems] = useState<ListItem[]>([]);

  useEffect(() => {
    setItems(getList(storageKey));
  }, [storageKey]);

  function remove(id: string) {
    const next = items.filter((i) => i.id !== id);
    setItems(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        Nothing saved yet.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li
          key={item.id}
          className="flex items-center justify-between gap-2 text-sm p-2 rounded-md hover:bg-muted"
        >
          <a href={item.url} className="truncate hover:underline flex-1">
            {item.label}
          </a>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={() => remove(item.id)}
            aria-label="Remove"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </li>
      ))}
    </ul>
  );
}

export function MyListsDrawer() {
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const count = Object.values(KEYS).reduce(
      (acc, k) => acc + getList(k).length,
      0
    );
    setTotal(count);
  }, []);

  return (
    <Sheet>
      <SheetTrigger
        render={(props) => (
          <Button {...props} variant="ghost" size="sm" className="relative gap-1.5">
            <Bookmark className="h-4 w-4" />
            <span className="hidden sm:inline">My Lists</span>
            {total > 0 && (
              <Badge className="h-4 min-w-4 px-1 text-[10px] absolute -top-1 -right-1">
                {total}
              </Badge>
            )}
          </Button>
        )}
      />
      <SheetContent side="right" className="w-80 sm:w-96">
        <SheetHeader>
          <SheetTitle>My Lists</SheetTitle>
        </SheetHeader>
        <Tabs defaultValue="profiles" className="mt-4">
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="profiles">Profiles</TabsTrigger>
            <TabsTrigger value="stories">Stories</TabsTrigger>
            <TabsTrigger value="downloaded">Downloads</TabsTrigger>
            <TabsTrigger value="live">Live</TabsTrigger>
          </TabsList>
          <TabsContent value="profiles" className="mt-4">
            <ListTab storageKey={KEYS.profiles} />
          </TabsContent>
          <TabsContent value="stories" className="mt-4">
            <ListTab storageKey={KEYS.stories} />
          </TabsContent>
          <TabsContent value="downloaded" className="mt-4">
            <ListTab storageKey={KEYS.downloaded} />
          </TabsContent>
          <TabsContent value="live" className="mt-4">
            <ListTab storageKey={KEYS.live} />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
