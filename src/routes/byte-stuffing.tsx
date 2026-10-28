import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  BYTE_ESC,
  BYTE_FLAG,
  byteDestuff,
  byteStuffTrace,
  bytesToHex,
  hexByte,
  parseHexInput,
  textToBytes,
  type ByteTraceStep,
} from "@/lib/stuffing";
import { Legend, Panel, TButton } from "@/components/panel";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/byte-stuffing")({
  head: () => ({
    meta: [
      { title: "Byte Stuffing Lab — BitWise" },
      {
        name: "description",
        content:
          "Animate PPP/BISYNC-style byte stuffing: enter text or hex bytes and watch the escape byte 0x7D get inserted before every flag 0x7E, step by step.",
      },
      { property: "og:title", content: "Byte Stuffing Lab — BitWise" },
      {
        property: "og:description",
        content:
          "Animate PPP/BISYNC-style byte stuffing: enter text or hex bytes and watch the escape byte 0x7D get inserted before every flag 0x7E, step by step.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ByteStuffingPage,
});

const PRESETS = [
  { label: "text with 0x7E", mode: "text" as const, value: "Hi\x7E!" },
  { label: "hex collision", mode: "hex" as const, value: "48 7E 65 7D 6C 6F" },
  { label: "escape inside", mode: "hex" as const, value: "7D 5E 01 7E" },
];

const SPEEDS = [
  { label: "slow", ms: 500 },
  { label: "normal", ms: 250 },
  { label: "fast", ms: 100 },
];

function ByteCell({
  step,
  mode,
  active,
  current,
}: {
  step: ByteTraceStep;
  mode: "text" | "hex";
  active: boolean;
  current: boolean;
}) {
  const printable = step.out >= 0x20 && step.out < 0x7f;
  const label =
    mode === "text" && step.kind === "data" && printable
      ? String.fromCharCode(step.out)
      : hexByte(step.out);

  return (
    <span
      className={cn(
        "flex h-10 w-11 shrink-0 items-center justify-center rounded border text-sm transition-all duration-150",
        step.kind === "escape" && "border-escaped bg-escaped/15 font-bold text-escaped",
        step.kind === "escaped" && "border-escaped/60 bg-escaped/10 text-escaped",
        step.kind === "data" && "border-border bg-secondary text-foreground",
        !active && "opacity-15",
        current && "ring-2 ring-accent",
      )}
      title={`0x${hexByte(step.raw)}${step.kind !== "data" ? ` → 0x${hexByte(step.out)}` : ""}`}
    >
      {label}
    </span>
  );
}

function ByteStuffingPage() {
  const [mode, setMode] = useState<"text" | "hex">("text");
  const [raw, setRaw] = useState(PRESETS[0].value);
  const [pos, setPos] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speedIdx, setSpeedIdx] = useState(1);
  const [copied, setCopied] = useState<string | null>(null);

  const parsed = useMemo(() => {
    if (mode === "text") return { bytes: textToBytes(raw), error: undefined as string | undefined };
    return parseHexInput(raw);
  }, [mode, raw]);

  const { steps, stuffed } = useMemo(() => byteStuffTrace(parsed.bytes), [parsed.bytes]);
  const roundTrip = useMemo(() => byteDestuff(stuffed), [stuffed]);
  const roundTripOk =
    !roundTrip.error &&
    roundTrip.bytes.length === parsed.bytes.length &&
    roundTrip.bytes.every((b, i) => b === parsed.bytes[i]);

  useEffect(() => {
    setPos(0);
    setPlaying(false);
  }, [raw, mode]);

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
  const frame = bytesToHex([BYTE_FLAG, ...stuffed, BYTE_FLAG]);

  function copy(text: string, key: string) {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 1200);
    });
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <p className="text-xs text-muted-foreground">
        <span className="text-primary">$</span> ./byte_lab --algorithm=escape-0x7d
      </p>
      <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        Byte Stuffing Lab
      </h1>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
        Byte-oriented protocols frame data with the flag byte{" "}
        <code className="text-accent">0x7E</code>. If the payload contains{" "}
        <code className="text-accent">0x7E</code> — or the escape byte{" "}
        <code className="text-escaped">0x7D</code> — the transmitter sends{" "}
        <code className="text-escaped">0x7D</code> first, then the offending byte XOR{" "}
        <code className="text-escaped">0x20</code> (so 0x7E → 0x7D 0x5E and 0x7D → 0x7D 0x5D).
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        <div className="flex flex-col gap-6">
          <Panel title="input payload" hint={mode === "text" ? `${parsed.bytes.length} bytes (ASCII)` : `${parsed.bytes.length} bytes (hex)`}>
            <div className="mb-3 flex rounded-md border border-border p-0.5 text-xs">
              {(["text", "hex"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setMode(m);
                    if (m === "hex" && mode === "text") {
                      setRaw(bytesToHex(textToBytes(raw)));
                    } else if (m === "text" && mode === "hex") {
                      const parsedHex = parseHexInput(raw);
                      setRaw(
                        parsedHex.error
                          ? raw
                          : parsedHex.bytes.map((b) => (b >= 0x20 && b < 0x7f ? String.fromCharCode(b) : "")).join(""),
                      );
                    }
                  }}
                  className={cn(
                    "flex-1 rounded px-3 py-1.5 transition-colors",
                    mode === m ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {m === "text" ? "text (ascii)" : "hex bytes"}
                </button>
              ))}
            </div>
            <textarea
              value={raw}
              onChange={(e) => setRaw(e.target.value.slice(0, 200))}
              rows={3}
              spellCheck={false}
              placeholder={mode === "text" ? "e.g. Hello 0x7E world" : "e.g. 48 7E 65 7D 6C 6F"}
              className="w-full resize-none rounded-md border border-input bg-secondary p-3 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary/60 focus:ring-1 focus:ring-primary/40"
            />
            {parsed.error && <p className="mt-2 text-xs text-destructive">✗ {parsed.error}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <TButton
                  key={p.label}
                  onClick={() => {
                    setMode(p.mode);
                    setRaw(p.value);
                  }}
                >
                  {p.label}
                </TButton>
              ))}
            </div>
          </Panel>

          <Panel title="rules">
            <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
              <li>Scan the payload byte by byte.</li>
              <li>
                On <code className="text-accent">0x7E</code> or{" "}
                <code className="text-escaped">0x7D</code>, insert{" "}
                <code className="text-escaped">0x7D</code> (escape).
              </li>
              <li>
                Then send the original byte XOR <code className="text-escaped">0x20</code>:{" "}
                <span className="text-foreground">0x7E→0x5E</span>,{" "}
                <span className="text-foreground">0x7D→0x5D</span>.
              </li>
              <li>
                The receiver drops each 0x7D and XORs the next byte back with 0x20.
              </li>
            </ol>
          </Panel>

          <Panel title="round-trip check" hint="destuff(stuff(x)) ?= x">
            {parsed.error ? (
              <p className="text-sm text-destructive">✗ fix the input first</p>
            ) : roundTripOk ? (
              <p className="text-sm text-primary">✓ verified — the receiver recovers the exact payload</p>
            ) : (
              <p className="text-sm text-destructive">✗ {roundTrip.error ?? "round-trip mismatch"}</p>
            )}
          </Panel>
        </div>

        <div className="flex flex-col gap-6">
          <Panel title="transmission trace" hint={`step ${Math.min(pos, steps.length)} / ${steps.length}`}>
            <div className="flex flex-wrap gap-[3px]">
              <span className="flex h-10 w-11 shrink-0 items-center justify-center rounded border border-accent/60 bg-accent/10 text-sm text-accent" title="frame flag">
                7E
              </span>
              {steps.map((step, i) => (
                <ByteCell key={i} step={step} mode={mode} active={i < pos} current={i === pos - 1} />
              ))}
              <span className="flex h-10 w-11 shrink-0 items-center justify-center rounded border border-accent/60 bg-accent/10 text-sm text-accent" title="frame flag">
                7E
              </span>
            </div>

            <div className="mt-4 min-h-5 text-xs">
              {currentStep?.message ? (
                <p className={currentStep.kind === "data" ? "text-muted-foreground" : "text-escaped"}>
                  ↳ {currentStep.message}
                </p>
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
              <TButton onClick={() => { setPlaying(false); setPos(steps.length); }}>skip ⏭</TButton>
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
                  { swatch: "bg-accent", label: "flag 0x7E" },
                  { swatch: "bg-secondary", label: "payload byte" },
                  { swatch: "bg-escaped", label: "escape 0x7D + XOR'd byte" },
                ]}
              />
            </div>
          </Panel>

          <Panel title="result">
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">stuffed payload (hex)</p>
                <div className="mt-1 flex items-center gap-2">
                  <code className="flex-1 overflow-x-auto rounded-md border border-border bg-secondary p-3 text-sm text-primary">
                    {stuffed.length ? bytesToHex(stuffed) : "—"}
                  </code>
                  <TButton onClick={() => copy(bytesToHex(stuffed), "body")}>
                    {copied === "body" ? "copied" : "copy"}
                  </TButton>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">full frame on the wire</p>
                <div className="mt-1 flex items-center gap-2">
                  <code className="flex-1 overflow-x-auto rounded-md border border-border bg-secondary p-3 text-sm text-foreground">
                    <span className="text-accent">{hexByte(BYTE_FLAG)}</span>{" "}
                    <span className="text-primary">{bytesToHex(stuffed)}</span>{" "}
                    <span className="text-accent">{hexByte(BYTE_FLAG)}</span>
                  </code>
                  <TButton onClick={() => copy(frame, "frame")}>{copied === "frame" ? "copied" : "copy"}</TButton>
                </div>
              </div>
              {mode === "hex" && parsed.bytes.some((b) => b === BYTE_ESC || b === BYTE_FLAG) && (
                <p className="text-xs text-muted-foreground">
                  Note: the payload contains a control byte ({hexByte(BYTE_ESC)} or {hexByte(BYTE_FLAG)}) — that's
                  exactly the case byte stuffing exists for.
                </p>
              )}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
