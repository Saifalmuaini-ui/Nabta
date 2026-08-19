"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, RotateCcw, Send, Sprout } from "lucide-react";
import { Card, cx, DemoNote, PageHeader } from "@/components/ui";
import { useStore } from "@/lib/store";
import { useI18n } from "@/lib/i18n";
import type { ChatRequest, ChatResponse, ChatTurn } from "@/lib/ai/contract";

/**
 * Starter questions matter more here than they would in a general chat tool.
 * A blank box asks the grower to know what to ask, which is exactly what a
 * first time grower does not know. These are the questions people actually
 * arrive with, phrased the way they would say them out loud.
 */
const STARTER_KEYS = [
  "helper.q1",
  "helper.q2",
  "helper.q3",
  "helper.q4",
  "helper.q5",
  "helper.q6",
];

interface Bubble extends ChatTurn {
  id: string;
  failed?: boolean;
}

export default function HelperPage() {
  const { plants, verifications } = useStore();
  const { t, locale } = useI18n();
  const [turns, setTurns] = useState<Bubble[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Nothing to scroll to before the first question, and jumping the page on
    // load would hide the starter questions the empty state exists to show.
    if (turns.length === 0) return;
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns, busy]);

  const send = useCallback(
    async (text: string) => {
      const question = text.trim();
      if (!question || busy) return;

      const mine: Bubble = { id: `u-${Date.now()}`, role: "user", text: question };
      // Snapshot the history that goes to the model, so a reply landing late
      // cannot be answered against a conversation the grower has moved past.
      const history = [...turns, mine].map(({ role, text }) => ({ role, text }));

      setTurns((prev) => [...prev, mine]);
      setInput("");
      setBusy(true);

      // Give the helper the plants this grower actually has, so "my plant"
      // resolves to something real instead of a generic answer.
      const context = plants.slice(0, 8).map((p) => {
        const latest = verifications.find((v) => v.plantId === p.id);
        return {
          species: p.species,
          healthScore: p.history[p.history.length - 1]?.score ?? 0,
          lastCondition: latest?.diagnosis?.condition.en ?? "no notes yet",
        };
      });

      // Send the interface language so the helper answers in it by default.
      // It still follows the grower if they write in the other language.
      const body: ChatRequest = { messages: history, locale, context };

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = (await res.json()) as ChatResponse;
        setTurns((prev) => [
          ...prev,
          data.ok && data.reply
            ? { id: `m-${Date.now()}`, role: "model", text: data.reply }
            : {
                id: `m-${Date.now()}`,
                role: "model",
                failed: true,
                text: t("helper.failed"),
              },
        ]);
      } catch {
        setTurns((prev) => [
          ...prev,
          {
            id: `m-${Date.now()}`,
            role: "model",
            failed: true,
            text: t("helper.offline"),
          },
        ]);
      } finally {
        setBusy(false);
        inputRef.current?.focus();
      }
    },
    [busy, turns, plants, verifications, locale, t],
  );

  const empty = turns.length === 0;

  return (
    // The composer sits at the end of the page rather than pinned above it.
    // A sticky composer inside this shell parks an opaque panel on top of the
    // answer whenever the conversation is taller than the viewport, and the
    // list would need its own scroll container to fix properly. Auto scrolling
    // to the newest message keeps the box in reach without any of that.
    <div className="pb-4">
      <PageHeader
        eyebrow={t("helper.eyebrow")}
        title={t("helper.title")}
        arabic={locale === "en" ? "مساعد الزراعة" : undefined}
        subtitle={t("helper.subtitle")}
        action={
          turns.length > 0 ? (
            <button
              onClick={() => setTurns([])}
              className="flex items-center gap-2 rounded-xl border border-sand-200 px-3 py-2 text-sm font-medium text-ink-soft transition hover:bg-sand-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-palm-500"
            >
              <RotateCcw size={15} /> {t("helper.startAgain")}
            </button>
          ) : null
        }
      />

      {empty ? (
        <div className="space-y-4">
          <Card className="flex items-start gap-4 p-5">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-palm-50 text-palm-600">
              <Sprout size={22} />
            </span>
            <p className="text-base leading-relaxed text-ink">
              {t("helper.intro")}
            </p>
          </Card>

          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-ink-soft">
              {t("helper.common")}
            </p>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {STARTER_KEYS.map((key) => t(key)).map((q) => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  className="rounded-2xl border border-sand-200 bg-white px-4 py-4 text-start text-base leading-snug text-ink transition hover:border-palm-200 hover:bg-palm-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-palm-500"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {turns.map((turn) => (
            <div
              key={turn.id}
              className={cx(
                "flex",
                turn.role === "user" ? "justify-end" : "justify-start",
              )}
            >
              <div
                className={cx(
                  "max-w-[38rem] rounded-2xl px-4 py-3 text-base leading-relaxed whitespace-pre-wrap",
                  turn.role === "user"
                    ? "bg-palm-600 text-white"
                    : turn.failed
                      ? "border border-clay/30 bg-clay-50 text-ink"
                      : "border border-sand-200 bg-white text-ink",
                )}
              >
                {turn.text}
              </div>
            </div>
          ))}

          {busy && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2.5 rounded-2xl border border-sand-200 bg-white px-4 py-3 text-sm text-ink-soft">
                <Loader2 size={16} className="animate-spin motion-reduce:animate-none" />
                {t("helper.thinking")}
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
        className="mt-5"
      >
        <div className="flex items-end gap-2 rounded-2xl border border-sand-200 bg-white p-2 shadow-sm">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              // Enter sends, shift and enter makes a new line. Most growers
              // will send one short question and never need the second.
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(input);
              }
            }}
            rows={1}
            placeholder={t("helper.placeholder")}
            aria-label={t("helper.placeholder")}
            className="max-h-40 min-h-[2.75rem] flex-1 resize-none bg-transparent px-3 py-2.5 text-base text-ink outline-none placeholder:text-ink-faint"
          />
          <button
            type="submit"
            disabled={busy || input.trim().length === 0}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-palm-600 text-white transition disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-palm-500"
            aria-label={t("helper.send")}
          >
            {busy ? (
              <Loader2 size={18} className="animate-spin motion-reduce:animate-none" />
            ) : (
              <Send size={18} />
            )}
          </button>
        </div>
      </form>

      <DemoNote>{t("helper.note")}</DemoNote>
    </div>
  );
}
