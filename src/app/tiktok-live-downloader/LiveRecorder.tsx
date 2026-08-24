"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Radio, Circle, Square, Download, AlertCircle, Users } from "lucide-react";
import { ViewerSearch } from "@/components/viewers/ViewerSearch";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { LiveRoom } from "@/lib/providers/types";

const MAX_RECORD_MS = 5 * 60 * 1000; // 5 minutes

type Phase = "idle" | "checking" | "live" | "recording" | "done" | "offline" | "error";

function fmt(n: number) {
  return Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

function fmtTime(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

export function LiveRecorder() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [room, setRoom] = useState<LiveRoom | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<import("hls.js").default | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopEverything();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function stopEverything() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.src = "";
    }
  }

  async function handleSearch(username: string) {
    setPhase("checking");
    setError(null);
    setRoom(null);
    setRecordedUrl(null);
    setElapsed(0);

    try {
      const res = await fetch(`/api/user/${encodeURIComponent(username)}/live`);
      if (res.status === 404) {
        setPhase("offline");
        return;
      }
      if (!res.ok) throw new Error("Failed to check live status");
      const data: LiveRoom = await res.json();
      if (!data.hlsUrl) {
        setPhase("offline");
        return;
      }
      setRoom(data);
      setPhase("live");
    } catch {
      setError("Could not check live status. Try again.");
      setPhase("error");
    }
  }

  const startRecording = useCallback(async () => {
    if (!room?.hlsUrl || !videoRef.current) return;

    const Hls = (await import("hls.js")).default;

    if (!Hls.isSupported()) {
      // Safari has native HLS — use it directly
      videoRef.current.src = room.hlsUrl;
    } else {
      const hls = new Hls({ enableWorker: false });
      hlsRef.current = hls;
      hls.loadSource(room.hlsUrl);
      hls.attachMedia(videoRef.current);
    }

    await videoRef.current.play().catch(() => {});

    // Capture the video element's stream
    // @ts-expect-error captureStream is non-standard but widely supported
    const stream: MediaStream = videoRef.current.captureStream?.() ?? videoRef.current.mozCaptureStream?.();
    if (!stream) {
      setError("Your browser does not support stream capture. Try Chrome.");
      setPhase("live");
      return;
    }

    chunksRef.current = [];
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : "video/webm";

    const mr = new MediaRecorder(stream, { mimeType });
    mediaRecorderRef.current = mr;

    mr.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      const url = URL.createObjectURL(blob);
      setRecordedUrl(url);
      setPhase("done");
      stopEverything();
    };

    mr.start(1000); // collect a chunk every second
    startTimeRef.current = Date.now();
    setPhase("recording");

    // Tick elapsed timer
    timerRef.current = setInterval(() => {
      const ms = Date.now() - startTimeRef.current;
      setElapsed(ms);
      if (ms >= MAX_RECORD_MS) stopRecording();
    }, 500);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room]);

  function stopRecording() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
  }

  const remaining = Math.max(0, MAX_RECORD_MS - elapsed);
  const progress = Math.min(100, (elapsed / MAX_RECORD_MS) * 100);

  return (
    <div className="space-y-6">
      <ViewerSearch
        placeholder="@username"
        onSearch={handleSearch}
        loading={phase === "checking"}
      />

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {phase === "offline" && (
        <div className="text-center py-16 text-muted-foreground border border-dashed rounded-lg">
          <Radio className="h-8 w-8 mx-auto mb-3 opacity-40" />
          <p className="font-medium">Not live right now</p>
          <p className="text-sm mt-1">This user is not currently streaming.</p>
        </div>
      )}

      {(phase === "live" || phase === "recording") && room && (
        <Card>
          <CardContent className="pt-5 space-y-4">
            {/* Room info */}
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-sm font-semibold text-red-500">LIVE</span>
                </div>
                <p className="font-medium">{room.title || "Live stream"}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Users className="h-3 w-3" /> {fmt(room.viewerCount)} watching
                </p>
              </div>

              {phase === "live" && (
                <Button onClick={startRecording} className="shrink-0 gap-1.5">
                  <Circle className="h-3.5 w-3.5 fill-red-500 text-red-500" />
                  Start recording
                </Button>
              )}
              {phase === "recording" && (
                <Button onClick={stopRecording} variant="destructive" className="shrink-0 gap-1.5">
                  <Square className="h-3.5 w-3.5" />
                  Stop
                </Button>
              )}
            </div>

            {/* Hidden video element used as the HLS source */}
            <video
              ref={videoRef}
              muted
              playsInline
              className="w-full rounded-lg bg-black aspect-video"
            />

            {/* Recording progress */}
            {phase === "recording" && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1 text-red-500 font-medium">
                    <Circle className="h-2.5 w-2.5 fill-red-500 animate-pulse" />
                    Recording {fmtTime(elapsed)}
                  </span>
                  <span>{fmtTime(remaining)} left</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-red-500 transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {phase === "done" && recordedUrl && (
        <Card>
          <CardContent className="pt-5 space-y-4">
            <p className="font-medium text-green-600 dark:text-green-400">
              Recording complete — {fmtTime(elapsed)}
            </p>
            <video src={recordedUrl} controls className="w-full rounded-lg bg-black aspect-video" />
            <a
              href={recordedUrl}
              download={`tiktok-live-${Date.now()}.webm`}
              className="inline-flex items-center gap-2"
            >
              <Button className="gap-2">
                <Download className="h-4 w-4" />
                Download recording
              </Button>
            </a>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
