'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { CATEGORY_LABELS } from '@/lib/types';
import type { IssueAnalysis } from '@/lib/types';
import {
  Camera,
  Send,
  Check,
  Search,
  AlertTriangle,
  HelpCircle,
  CheckCircle,
  MapPin,
  Tag,
  Building,
  Ticket,
} from '@/components/icons';

/**
 * Mocked WhatsApp / SMS reporting channel — the "moonshot" accessibility play.
 * It looks and feels like a WhatsApp thread with a civic bot, but the photo a
 * user sends is run through the *real* Gemini analysis pipeline (POST
 * /api/analyze), so the bot's triage reply is genuine. Nothing is persisted —
 * this is a demonstration of how the same agent could serve India's ~500M
 * WhatsApp users who'll never install another app.
 */

type Sender = 'bot' | 'user';

interface Message {
  id: number;
  from: Sender;
  content?: React.ReactNode;
  image?: string;
  time: string;
}

let msgId = 0;
function now(): string {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function ticketId(): string {
  const n = Math.floor(1000 + Math.random() * 9000);
  return `UP-2026-${n}`;
}

function SeverityBar({ severity }: { severity: number }) {
  return (
    <span className="flex items-center gap-1">
      <span className="text-xs text-ink/50">Severity</span>
      <span className="flex gap-0.5">
        {Array.from({ length: 5 }, (_, i) => (
          <span
            key={i}
            className={`h-2 w-3.5 rounded-sm ${i < severity ? 'bg-red-500' : 'bg-ink/15'}`}
          />
        ))}
      </span>
      <span className="text-xs text-ink/50">{severity}/5</span>
    </span>
  );
}

const GREETING: Message[] = [
  {
    id: msgId++,
    from: 'bot',
    content: (
      <span>
        Namaste! This is the <strong>UrbanPulse</strong> civic bot. Spotted a
        pothole, leak, broken light or garbage? Just send me a photo and I&apos;ll
        file it with the right department.
      </span>
    ),
    time: now(),
  },
  {
    id: msgId++,
    from: 'bot',
    content: (
      <span className="flex items-center gap-2">
        <Camera className="h-4 w-4 shrink-0 text-emerald-600" />
        <span>Tap the camera below to send a photo of the issue.</span>
      </span>
    ),
    time: now(),
  },
];

export default function WhatsAppPage() {
  const [messages, setMessages] = useState<Message[]>(GREETING);
  const [typing, setTyping] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, typing]);

  function push(m: Omit<Message, 'id' | 'time'>) {
    setMessages((prev) => [...prev, { ...m, id: msgId++, time: now() }]);
  }

  async function handleFile(file: File) {
    setBusy(true);
    const previewUrl = URL.createObjectURL(file);
    push({ from: 'user', image: previewUrl });

    await delay(500);
    push({
      from: 'bot',
      content: (
        <span className="flex items-center gap-2">
          <Search className="h-4 w-4 shrink-0 text-sarvam-blue" />
          <span>Got it — analysing the photo with our AI agent…</span>
        </span>
      ),
    });
    setTyping(true);

    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await fetch('/api/analyze', { method: 'POST', body: fd });
      const data = await res.json();
      setTyping(false);

      if (!res.ok || !data.analysis) {
        push({
          from: 'bot',
          content: (
            <span className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <span>
                Sorry, I couldn&apos;t analyse that one. Please try a clearer,
                well-lit photo of the issue.
              </span>
            </span>
          ),
        });
        return;
      }

      const a = data.analysis as IssueAnalysis;
      await replyWithAnalysis(a);
    } catch {
      setTyping(false);
      push({
        from: 'bot',
        content: (
          <span className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            <span>Network hiccup. Please send the photo again in a moment.</span>
          </span>
        ),
      });
    } finally {
      setBusy(false);
    }
  }

  async function replyWithAnalysis(a: IssueAnalysis) {
    if (!a.isValid) {
      await delay(300);
      push({
        from: 'bot',
        content: (
          <span className="flex items-start gap-2">
            <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-ink/50" />
            <span>
              This doesn&apos;t look like a reportable civic issue
              {a.rejectionReason ? ` — ${a.rejectionReason}` : ''}. If you
              think that&apos;s wrong, send another angle.
            </span>
          </span>
        ),
      });
      return;
    }

    const ticket = ticketId();

    await delay(300);
    push({
      from: 'bot',
      content: (
        <div className="space-y-2">
          <p className="flex items-center gap-1.5 font-semibold text-emerald-700">
            <CheckCircle className="h-4 w-4" />
            Issue registered!
          </p>
          <div className="space-y-1 border-t border-ink/10 pt-2 text-sm">
            <p className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink/50" />
              <span>{a.suggestedTitle}</span>
            </p>
            <p className="flex items-center gap-2">
              <Tag className="h-3.5 w-3.5 shrink-0 text-ink/50" />
              <span>{CATEGORY_LABELS[a.category]}</span>
            </p>
            <SeverityBar severity={a.severity} />
            {a.safetyRisk && (
              <p className="flex items-center gap-2 font-medium text-red-600">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                Safety risk flagged
              </p>
            )}
            <p className="flex items-center gap-2">
              <Building className="h-3.5 w-3.5 shrink-0 text-ink/50" />
              <span>Routed to: {a.routeTo}</span>
            </p>
          </div>
        </div>
      ),
    });

    await delay(450);
    push({
      from: 'bot',
      content: (
        <span className="flex items-start gap-2">
          <Ticket className="mt-0.5 h-4 w-4 shrink-0 text-sarvam-blue" />
          <span>
            Your tracking ID is <strong>{ticket}</strong>. We&apos;ll message
            you here when the department updates it. Thank you for keeping the
            city running!
          </span>
        </span>
      ),
    });
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
          Moonshot · Mocked channel
        </span>
        <h1 className="mt-3 font-serif text-3xl font-medium text-ink">
          Report on WhatsApp
        </h1>
        <p className="mx-auto mt-1 max-w-xl text-sm text-ink/55">
          No app, no login — for the ~500M Indians already on WhatsApp. The photo
          you send runs through the same live Gemini pipeline. (Demo only — chats
          aren&apos;t persisted.)
        </p>
      </div>

      {/* Phone frame */}
      <div className="mx-auto max-w-sm overflow-hidden rounded-[2.5rem] border-[10px] border-ink/85 bg-black shadow-2xl">
        {/* WhatsApp header */}
        <div className="flex items-center gap-3 bg-[#075E54] px-4 py-3 text-white">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-sm font-bold">
            UP
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">UrbanPulse Civic Bot</p>
            <p className="text-[11px] text-white/70">
              {typing ? 'typing…' : 'online'}
            </p>
          </div>
          <span className="rounded bg-white/15 px-1.5 py-0.5 text-[10px]">
            +91 1800-URBAN
          </span>
        </div>

        {/* Chat body */}
        <div
          ref={scrollRef}
          className="h-[28rem] space-y-2 overflow-y-auto bg-[#ECE5DD] px-3 py-4"
        >
          {messages.map((m) => (
            <Bubble key={m.id} m={m} />
          ))}
          {typing && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-tl-sm bg-white px-3 py-2 shadow-sm">
                <span className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="h-2 w-2 animate-pulse rounded-full bg-ink/30"
                      style={{ animationDelay: `${i * 200}ms` }}
                    />
                  ))}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="flex items-center gap-2 bg-[#F0F0F0] px-3 py-2.5">
          <div className="flex flex-1 items-center gap-2 rounded-full bg-white px-4 py-2 text-sm text-ink/40">
            Send a photo of the issue…
          </div>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#075E54] text-white transition hover:bg-[#064b43] disabled:opacity-60"
            aria-label="Send a photo"
          >
            {busy ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            ) : (
              <Camera className="h-5 w-5" />
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = '';
            }}
          />
        </div>
      </div>

      <p className="mx-auto mt-6 max-w-sm text-center text-xs text-ink/45">
        On a production line this thread runs over the WhatsApp Business API /
        an SMS gateway — the agent logic is identical to what you just used.
      </p>

      <div className="mt-6 text-center">
        <Link
          href="/report"
          className="text-sm font-medium text-ink/60 transition hover:text-ink"
        >
          Prefer the full web report? →
        </Link>
      </div>
    </div>
  );
}

function Bubble({ m }: { m: Message }) {
  const isUser = m.from === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
          isUser
            ? 'rounded-tr-sm bg-[#DCF8C6] text-ink'
            : 'rounded-tl-sm bg-white text-ink'
        }`}
      >
        {m.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={m.image}
            alt="Reported issue"
            className="mb-1 max-h-48 w-full rounded-lg object-cover"
          />
        )}
        {m.content && <div className="leading-relaxed">{m.content}</div>}
        <span className="mt-0.5 flex items-center justify-end gap-0.5 text-[10px] text-ink/40">
          {m.time}
          {isUser && <Check className="h-3 w-3 text-sky-500" />}
        </span>
      </div>
    </div>
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
