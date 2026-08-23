"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type SpeechRecognitionCtor = new () => {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((ev: { results: SpeechRecognitionResultList }) => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};

export function VoiceTicketForm({
  disabled,
  licenseWarning,
}: {
  disabled?: boolean;
  licenseWarning?: string | null;
}) {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<
    "LOW" | "MEDIUM" | "HIGH" | "URGENT"
  >("MEDIUM");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const voiceUsed = useRef(false);
  const recRef = useRef<InstanceType<SpeechRecognitionCtor> | null>(null);

  function toggleVoice() {
    if (disabled) return;
    const W = window as unknown as {
      SpeechRecognition?: SpeechRecognitionCtor;
      webkitSpeechRecognition?: SpeechRecognitionCtor;
    };
    const Ctor = W.SpeechRecognition ?? W.webkitSpeechRecognition;
    if (!Ctor) {
      toast.error("المتصفح لا يدعم الإملاء الصوتي — اكتب النص يدوياً.");
      return;
    }
    if (listening && recRef.current) {
      recRef.current.stop();
      setListening(false);
      return;
    }
    const rec = new Ctor();
    rec.lang = "ar-EG";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (ev) => {
      voiceUsed.current = true;
      let text = "";
      for (let i = 0; i < ev.results.length; i++) {
        text += ev.results[i]![0]!.transcript;
      }
      setDescription((prev) => {
        const base = prev.trim();
        return base ? `${base} ${text}`.trim() : text.trim();
      });
    };
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
    toast.message("جاري الاستماع… اضغط مرة أخرى للإيقاف.");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (disabled) return;
    setBusy(true);
    try {
      const res = await fetch("/api/customer/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          description,
          priority,
          isVoiceTranscribed: voiceUsed.current,
        }),
      });
      const j = (await res.json().catch(() => ({}))) as {
        message?: string;
        ticket?: { id: string };
      };
      if (!res.ok) {
        toast.error(j.message ?? "تعذر إنشاء التذكرة.");
        return;
      }
      toast.success("تم إرسال التذكرة.");
      router.push("/customer/tickets");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {licenseWarning ? (
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
          {licenseWarning}
        </p>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="subject">الموضوع</Label>
        <Input
          id="subject"
          value={subject}
          disabled={disabled || busy}
          onChange={(e) => setSubject(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label htmlFor="desc">الوصف</Label>
          <Button
            type="button"
            size="sm"
            variant={listening ? "default" : "outline"}
            disabled={disabled || busy}
            onClick={toggleVoice}
          >
            {listening ? "إيقاف الإملاء" : "إملاء صوتي"}
          </Button>
        </div>
        <Textarea
          id="desc"
          rows={6}
          dir="rtl"
          value={description}
          disabled={disabled || busy}
          onChange={(e) => setDescription(e.target.value)}
          required
          minLength={10}
        />
        <p className="text-xs text-muted-foreground">
          راجع النص قبل الإرسال. الإملاء يعتمد على متصفحك.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="priority">الأولوية</Label>
        <select
          id="priority"
          className="h-9 w-full rounded-lg border border-input bg-transparent px-2 text-sm"
          value={priority}
          disabled={disabled || busy}
          onChange={(e) =>
            setPriority(e.target.value as typeof priority)
          }
        >
          <option value="LOW">منخفضة</option>
          <option value="MEDIUM">متوسطة</option>
          <option value="HIGH">عالية</option>
          <option value="URGENT">عاجلة</option>
        </select>
      </div>
      <Button type="submit" disabled={disabled || busy}>
        {busy ? "جاري الإرسال…" : "إرسال التذكرة"}
      </Button>
    </form>
  );
}
