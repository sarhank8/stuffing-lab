import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  BIT_FLAG,
  bitDestuff,
  bitStuffTrace,
  buildBitFrame,
  sanitizeBits,
  type BitTraceStep,
} from "@/lib/stuffing";
import { Legend, Panel, TButton } from "@/components/panel";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/bit-stuffing")({
  head: () => ({
    meta: [
      { title: "Bit Stuffing Lab — BitWise" },
      {
        name: "description",
        content:
          "Animate HDLC-style bit stuffing: enter any bitstream and watch a 0 get stuffed after every run of five consecutive 1s, step by step.",
      },
      { property: "og:title", content: "Bit Stuffing Lab — BitWise" },
      {
        property: "og:description",
        content:
          "Animate HDLC-style bit stuffing: enter any bitstream and watch a 0 get stuffed after every run of five consecutive 1s, step by step.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BitStuffingPage,
});

const PRESETS = [
  { label: "flag collision", bits: "01111110111111011111" },
  { label: "all ones", bits: "111111111111" },
  { label: "mixed traffic", bits: "01101111101111100110001111110" },
];

const SPEEDS = [
  { label: "slow", ms: 220 },
  { label: "normal", ms: 110 },
  { label: "fast", ms: 45 },
];

function BitCell({ step, active, current }: { step: BitTraceStep; active: boolean; current: boolean }) {
  return (
    <span
      className={cn(
        "flex h-9 w-7 shrink-0 items-center justify-center rounded border text-sm transition-all duration-150",
        step.origin === "stuffed"
          ? "border-primary bg-primary/15 font-bold text-primary"
          : step.bit === "1"
            ? "border-border bg-secondary text-foreground"
            : "border-border bg-secondary/60 text-muted-foreground",
        !active && "opacity-15",
        current && "ring-2 ring-accent",
      )}
    >
      {step.bit}
    </span>
  );
}

function FlagCell({ bit, dim }: { bit: string; dim?: boolean }) {
  return (
    <span
      className={cn(
        "flex h-9 w-7 shrink-0 items-center justify-center rounded border border-accent/60 bg-accent/10 text-sm text-accent",
        dim && "opacity-30",
      )}
    >
      {bit}
    </span>
  );
}

function BitStuffingPage() {
  const [raw, setRaw] = useState(PRESETS[0].bits);
  const [pos, setPos] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speedIdx, setSpeedIdx] = useState(1);
  const [copied, setCopied] = useState<string | null>(null);

  const data = useMemo(() => sanitizeBits(raw), [raw]);
  const { steps, stuffed } = useMemo(() => bitStuffTrace(data), [data]);
  const roundTrip = useMemo(() => bitDestuff(stuffed), [stuffed]);
  const roundTripOk = !roundTrip.error && roundTrip.bits === data;

  // Reset the trace when the input changes.
  useEffect(() => {
    setPos(0);
    setPlaying(false);
  }, [raw]);

  useEffect(() => {
    if (!playing) return;
    if (pos >= steps.length) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(() => setPos((p) => p + 1), SPEEDS[speedIdx].ms);
    return () => clearTimeout(t);
  }, [playing, pos, steps.length, speedIdx]);

  const currentStep = pos > 0 && pos <= steps.length ? steps[pos - 1] : null;

  function copy(text: string, key: string) {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 1200);
    });
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <p className="text-xs text-muted-foreground">
        <span className="text-primary">$</span> ./bit_lab --algorithm=zero-insertion
      </p>
      <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        Bit Stuffing Lab
      </h1>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
        HDLC frames are delimited by the flag <code className="text-accent">01111110</code>. To stop the
        payload from faking a flag, the transmitter inserts a <code className="text-primary">0</code> after
        every run of five consecutive 1s. Type a bitstream and watch it happen.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        <div className="flex flex-col gap-6">
          <Panel title="input bitstream" hint={`${data.length} bits`}>
            <textarea
              value={raw}
              onChange={(e) => setRaw(e.target.value.slice(0, 400))}
              rows={4}
              spellCheck={false}
              placeholder="e.g. 01111110111111011111"
              className="w-full resize-none rounded-md border border-input bg-secondary p-3 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary/60 focus:ring-1 focus:ring-primary/40"
            />
            {raw.replace(/[^01]/g, "").length !== raw.trim().length && (
              <p className="mt-2 text-xs text-escaped">Non-binary characters are ignored.</p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <TButton key={p.label} onClick={() => setRaw(p.bits)}>
                  {p.label}
                </TButton>
              ))}
            </div>
          </Panel>

          <Panel title="rules">
            <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
              <li>
                Scan the payload bit by bit, counting consecutive <code className="text-foreground">1</code>s.
              </li>
              <li>
                After the <span className="text-primary">fifth consecutive 1</span>, insert a{" "}
                <code className="text-primary">0</code> and reset the counter.
              </li>
              <li>Wrap the stuffed body between the two flag delimiters.</li>
              <li>
                The receiver deletes any 0 that follows five 1s — restoring the original data exactly.
              </li>
            </ol>
          </Panel>

          <Panel title="round-trip check" hint="destuff(stuff(x)) ?= x">
            {roundTripOk ? (
              <p className="text-sm text-primary">✓ verified — the receiver recovers the exact input</p>
            ) : (
              <p className="text-sm text-destructive">✗ {roundTrip.error ?? "round-trip mismatch"}</p>
            )}
          </Panel>
        </div>

        <div className="flex flex-col gap-6">
          <Panel title="transmission trace" hint={`step ${Math.min(pos, steps.length)} / ${steps.length}`}>
            <div className="flex flex-wrap gap-[3px]">
              {BIT_FLAG.split("").map((b, i) => (
                <FlagCell key={`pre-${i}`} bit={b} dim={pos < steps.length} />
              ))}
              {steps.map((step, i) => (
                <BitCell
                  key={i}
                  step={step}
                  active={i < pos}
                  current={i === pos - 1 && playing !== undefined}
                />
              ))}
              {BIT_FLAG.split("").map((b, i) => (
                <FlagCell key={`post-${i}`} bit={b} dim={pos < steps.length} />
              ))}
            </div>

            <div className="mt-4 min-h-5 text-xs">
              {currentStep?.message ? (
                <p className="text-primary">↳ {currentStep.message}</p>
              ) : (
                <p className="text-muted-foreground">
                  {pos === 0
                    ? "Press play to transmit."
                    : pos >= steps.length
                      ? "Frame complete — trailing flag sent."
                      : ""}
                </p>
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <TButton
                variant="primary"
                onClick={() => {
                  if (pos >= steps.length) setPos(0);
                  setPlaying((p) => !p);
                }}
              >
                {playing ? "❚❚ pause" : "▶ play"}
              </TButton>
              <TButton onClick={() => { setPlaying(false); setPos((p) => Math.min(p + 1, steps.length)); }}>
                step →
              </TButton>
              <TButton onClick={() => { setPlaying(false); setPos(steps.length); }}>
                skip ⏭
              </TButton>
              <TButton onClick={() => { setPlaying(false); setPos(0); }}>reset</TButton>
              <div className="ml-auto flex items-center gap-1 rounded-md border border-border p-0.5">
                {SPEEDS.map((s, i) => (
                  <button
                    key={s.label}
                    onClick={() => setSpeedIdx(i)}
                    className={cn(
                      "rounded px-2 py-1 text-xs transition-colors",
                      speedIdx === i ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 border-t border-border pt-3">
              <Legend
                items={[
                  { swatch: "bg-accent", label: "flag 01111110" },
                  { swatch: "bg-secondary", label: "payload bit" },
                  { swatch: "bg-primary", label: "stuffed 0" },
                ]}
              />
            </div>
          </Panel>

          <Panel title="result">
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">stuffed body</p>
                <div className="mt-1 flex items-center gap-2">
                  <code className="flex-1 overflow-x-auto rounded-md border border-border bg-secondary p-3 text-sm text-primary">
                    {stuffed || "—"}
                  </code>
                  <TButton onClick={() => copy(stuffed, "body")}>{copied === "body" ? "copied" : "copy"}</TButton>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">full frame on the wire</p>
                <div className="mt-1 flex items-center gap-2">
                  <code className="flex-1 overflow-x-auto rounded-md border border-border bg-secondary p-3 text-sm text-foreground">
                    <span className="text-accent">{BIT_FLAG}</span>
                    <span className="text-primary">{stuffed}</span>
                    <span className="text-accent">{BIT_FLAG}</span>
                  </code>
                  <TButton onClick={() => copy(buildBitFrame(stuffed), "frame")}>
                    {copied === "frame" ? "copied" : "copy"}
                  </TButton>
                </div>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
