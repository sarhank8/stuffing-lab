/*
 * Bit & byte stuffing — the exact algorithms the app animates.
 * Mirrored 1:1 by the Python scripts in src/python/ so the app and the
 * submitted code always agree.
 */

export const BIT_FLAG = "01111110";
export const MAX_ONES_RUN = 5;

export const BYTE_FLAG = 0x7e;
export const BYTE_ESC = 0x7d;
export const ESCAPE_XOR = 0x20;

/* ------------------------------ bit stuffing ----------------------------- */

export interface BitTraceStep {
  bit: "0" | "1";
  origin: "data" | "stuffed";
  /** Length of the run of consecutive 1s ending at this bit (0 after a stuffed 0). */
  onesRun: number;
  message: string;
}

export function sanitizeBits(raw: string): string {
  return raw.replace(/[^01]/g, "");
}

export function bitStuffTrace(data: string): { steps: BitTraceStep[]; stuffed: string } {
  const clean = sanitizeBits(data);
  const steps: BitTraceStep[] = [];
  let out = "";
  let run = 0;

  for (const bit of clean) {
    if (bit === "1") {
      run += 1;
      steps.push({
        bit: "1",
        origin: "data",
        onesRun: run,
        message:
          run === MAX_ONES_RUN
            ? "Fifth consecutive 1 — the receiver would mistake this for a flag!"
            : "",
      });
    } else {
      run = 0;
      steps.push({ bit: "0", origin: "data", onesRun: 0, message: "" });
    }
    out += bit;

    if (run === MAX_ONES_RUN) {
      out += "0";
      steps.push({
        bit: "0",
        origin: "stuffed",
        onesRun: 0,
        message: "Run of five 1s → stuff a 0 to break it",
      });
      run = 0;
    }
  }

  return { steps, stuffed: out };
}

export function bitDestuff(body: string): { bits: string; error?: string } {
  const bits: string[] = [];
  let run = 0;
  let i = 0;

  while (i < body.length) {
    const bit = body[i];
    bits.push(bit);
    if (bit === "1") {
      run += 1;
      if (run === MAX_ONES_RUN) {
        i += 1;
        if (i >= body.length || body[i] !== "0") {
          return { bits: "", error: "Malformed frame: expected a stuffed 0 after five 1s" };
        }
        run = 0;
      }
    } else {
      run = 0;
    }
    i += 1;
  }

  return { bits: bits.join("") };
}

export function buildBitFrame(body: string): string {
  return BIT_FLAG + body + BIT_FLAG;
}

/* ----------------------------- byte stuffing ----------------------------- */

export type ByteStepKind = "data" | "escape" | "escaped";

export interface ByteTraceStep {
  /** Original byte from the payload. */
  raw: number;
  /** Byte actually transmitted for this step. */
  out: number;
  kind: ByteStepKind;
  message: string;
}

export function hexByte(n: number): string {
  return n.toString(16).padStart(2, "0").toUpperCase();
}

export function bytesToHex(bytes: number[]): string {
  return bytes.map(hexByte).join(" ");
}

export function parseHexInput(raw: string): { bytes: number[]; error?: string } {
  const tokens = raw.trim().split(/[\s,]+/).filter(Boolean);
  const bytes: number[] = [];
  for (const token of tokens) {
    if (!/^[0-9a-fA-F]{1,2}$/.test(token)) {
      return { bytes: [], error: `"${token}" is not a valid hex byte (use 00–FF)` };
    }
    bytes.push(parseInt(token, 16));
  }
  return { bytes };
}

export function textToBytes(text: string): number[] {
  return Array.from(text, (ch) => ch.charCodeAt(0) & 0xff);
}

export function byteStuffTrace(data: number[]): { steps: ByteTraceStep[]; stuffed: number[] } {
  const steps: ByteTraceStep[] = [];
  const stuffed: number[] = [];

  for (const raw of data) {
    if (raw === BYTE_FLAG || raw === BYTE_ESC) {
      stuffed.push(BYTE_ESC);
      steps.push({
        raw,
        out: BYTE_ESC,
        kind: "escape",
        message: `0x${hexByte(raw)} is a control byte → insert escape 0x${hexByte(BYTE_ESC)}`,
      });
      const escaped = raw ^ ESCAPE_XOR;
      stuffed.push(escaped);
      steps.push({
        raw,
        out: escaped,
        kind: "escaped",
        message: `Transmit 0x${hexByte(escaped)} (original XOR 0x20)`,
      });
    } else {
      stuffed.push(raw);
      steps.push({ raw, out: raw, kind: "data", message: "" });
    }
  }

  return { steps, stuffed };
}

export function byteDestuff(bytes: number[]): { bytes: number[]; error?: string } {
  const out: number[] = [];
  let i = 0;

  while (i < bytes.length) {
    const b = bytes[i];
    if (b === BYTE_ESC) {
      i += 1;
      if (i >= bytes.length) {
        return { bytes: [], error: "Malformed frame: escape byte 0x7D with nothing after it" };
      }
      out.push(bytes[i] ^ ESCAPE_XOR);
    } else if (b === BYTE_FLAG) {
      return { bytes: [], error: "Malformed frame: unexpected flag 0x7E inside the payload" };
    } else {
      out.push(b);
    }
    i += 1;
  }

  return { bytes: out };
}

export function buildByteFrame(data: number[]): number[] {
  return [BYTE_FLAG, ...byteStuffTrace(data).stuffed, BYTE_FLAG];
}
