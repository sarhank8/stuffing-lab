import { createFileRoute, Link } from "@tanstack/react-router";
import { BIT_FLAG, bitStuffTrace, bytesToHex, buildByteFrame, textToBytes } from "@/lib/stuffing";
import { Panel } from "@/components/panel";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BitWise — Bit & Byte Stuffing Lab" },
      {
        name: "description",
        content:
          "Learn data-link framing interactively: step-by-step bit stuffing and byte stuffing visualizers, theory notes and runnable Python code.",
      },
      { property: "og:title", content: "BitWise — Bit & Byte Stuffing Lab" },
      {
        property: "og:description",
        content:
          "Learn data-link framing interactively: step-by-step bit stuffing and byte stuffing visualizers, theory notes and runnable Python code.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

const DEMO_BITS = "011111101111100111111";

function BitChip({ bit, kind }: { bit: string; kind: "flag" | "data" | "stuffed" }) {
  return (
    <span
      className={cn(
        "flex h-8 w-6 items-center justify-center rounded border text-xs",
        kind === "flag" && "border-accent/60 bg-accent/10 text-accent",
        kind === "data" && "border-border bg-secondary text-foreground",
        kind === "stuffed" && "border-primary bg-primary/15 font-bold text-primary",
      )}
    >
      {bit}
    </span>
  );
}

function FramePreview() {
  const { steps } = bitStuffTrace(DEMO_BITS);
  const bits = [
    ...BIT_FLAG.split("").map((b) => ({ bit: b, kind: "flag" as const })),
    ...steps.map((s) => ({ bit: s.bit, kind: s.origin === "stuffed" ? ("stuffed" as const) : ("data" as const) })),
    ...BIT_FLAG.split("").map((b) => ({ bit: b, kind: "flag" as const })),
  ];

  return (
    <div className="flex flex-wrap items-stretch gap-[3px]">
      {bits.map((b, i) => (
        <BitChip key={i} bit={b.bit} kind={b.kind} />
      ))}
    </div>
  );
}

const LABS = [
  {
    to: "/bit-stuffing" as const,
    cmd: "run bit_stuffing",
    title: "Bit Stuffing Lab",
    body: "Type a bitstream, hit play, and watch a 0 get stuffed after every run of five 1s — HDLC style. Step, scrub, and verify the round trip.",
    tag: "01111110",
  },
  {
    to: "/byte-stuffing" as const,
    cmd: "run byte_stuffing",
    title: "Byte Stuffing Lab",
    body: "Send bytes that contain the flag 0x7E and see the escape byte 0x7D appear, PPP/BISYNC style. Text or hex input, animated per byte.",
    tag: "0x7E → 0x7D 0x5E",
  },
];

function Home() {
  const demoBytes = textToBytes("Hi\x7E!");
  const demoFrame = bytesToHex(buildByteFrame(demoBytes));

  return (
    <div>
      <section className="grid-bg border-b border-border">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
          <p className="text-xs text-muted-foreground">
            <span className="text-primary">$</span> ./data-link --topic=framing --mode=interactive
          </p>
          <h1 className="mt-4 font-display text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-6xl">
            Bit &amp; byte stuffing,
            <br />
            <span className="text-primary glow-primary">visualised bit by bit.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            How do you send data that contains the frame delimiter itself? You stuff it.
            This lab animates both classic stuffing algorithms — 0-insertion after five 1s,
            and 0x7D escaping — with full step traces, theory notes and the matching Python code.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/bit-stuffing"
              className="rounded-md border border-primary bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/85"
            >
              Open the bit lab →
            </Link>
            <Link
              to="/byte-stuffing"
              className="rounded-md border border-border bg-secondary px-4 py-2 text-sm text-foreground transition-colors hover:bg-muted"
            >
              Open the byte lab →
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-12">
        <Panel title="live sample — an HDLC frame being stuffed" hint="green = stuffed bits · cyan = flags">
          <FramePreview />
          <p className="mt-4 text-xs text-muted-foreground">
            Payload <code className="text-foreground">{DEMO_BITS}</code> → flags stay intact because every
            run of five 1s gets a 0 inserted after it.
          </p>
        </Panel>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {LABS.map((lab) => (
            <Link
              key={lab.to}
              to={lab.to}
              className="group rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary/50"
            >
              <p className="text-xs text-muted-foreground">
                <span className="text-primary">$</span> {lab.cmd}
                <span className="caret-blink text-primary">▌</span>
              </p>
              <h2 className="mt-3 font-display text-xl font-semibold text-foreground group-hover:text-primary">
                {lab.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{lab.body}</p>
              <p className="mt-4 inline-block rounded border border-border bg-secondary px-2 py-1 text-xs text-accent">
                {lab.tag}
              </p>
            </Link>
          ))}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Link
            to="/theory"
            className="rounded-lg border border-border bg-card p-5 transition-colors hover:border-accent/50"
          >
            <h2 className="font-display text-lg font-semibold text-foreground">Theory notes →</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Why stuffing exists, where HDLC and PPP use it, and the exact rules side by side.
            </p>
          </Link>
          <Link
            to="/python"
            className="rounded-lg border border-border bg-card p-5 transition-colors hover:border-accent/50"
          >
            <h2 className="font-display text-lg font-semibold text-foreground">Python code →</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Two documented scripts — <code className="text-accent">bit_stuffing.py</code> and{" "}
              <code className="text-accent">byte_stuffing.py</code> — with copy &amp; download buttons.
              Sample frame: <code className="text-primary">{demoFrame}</code>
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
