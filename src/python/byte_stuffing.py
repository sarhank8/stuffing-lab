#!/usr/bin/env python3
"""
byte_stuffing.py — PPP/BISYNC-style byte stuffing, with a small demo CLI.

Why stuffing exists
-------------------
Byte-oriented protocols (BISYNC, later PPP in its byte-stuffed form) frame
data with the flag byte 0x7E. If the payload itself contains 0x7E the frame
would end early, so the transmitter replaces every flag — and every escape
byte — with a two-byte sequence:

    0x7E (flag) -> 0x7D 0x5E     (escape, then flag XOR 0x20)
    0x7D (escape) -> 0x7D 0x5D   (escape, then escape XOR 0x20)

0x7D is the escape byte; the receiver drops it and XORs the next byte with
0x20 to recover the original. Arbitrary binary payloads can then be sent
safely inside one frame.

Run the demo:
    python3 byte_stuffing.py

Functions
---------
byte_stuff(data)     -> list of transmitted bytes (escapes inserted)
byte_destuff(bytes)  -> original bytes (raises ValueError on malformed frames)
build_frame(data)    -> [FLAG] + stuffed + [FLAG]
parse_frame(frame)   -> original bytes (validates the flags and the escapes)
hex_view(bytes)      -> "7D 5E 45" style display string
"""

FLAG = 0x7E   # frame delimiter
ESC = 0x7D    # escape byte
XOR_BIT = 0x20  # escape transformation: original XOR 0x20


def byte_stuff(data) -> list:
    """Insert escape sequences for every FLAG or ESC byte in the payload.

    Accepts any iterable of ints (0-255), e.g. bytes or a list.
    """
    stuffed = []
    for raw in data:
        raw = int(raw) & 0xFF
        if raw == FLAG or raw == ESC:
            stuffed.append(ESC)
            stuffed.append(raw ^ XOR_BIT)
        else:
            stuffed.append(raw)
    return stuffed


def byte_destuff(data) -> list:
    """Undo byte_stuff: drop each ESC and XOR the following byte with 0x20.

    Raises ValueError if a flag appears inside the frame or an escape byte
    has nothing after it.
    """
    out = []
    it = iter(range(len(data)))
    i = 0
    while i < len(data):
        b = int(data[i]) & 0xFF
        if b == ESC:
            if i + 1 >= len(data):
                raise ValueError("Malformed frame: escape byte 0x7D with nothing after it")
            out.append(int(data[i + 1]) ^ XOR_BIT)
            i += 2
            continue
        if b == FLAG:
            raise ValueError("Malformed frame: unexpected flag 0x7E inside the payload")
        out.append(b)
        i += 1
    del it
    return out


def build_frame(data) -> list:
    """Wrap stuffed bytes between two flag delimiters."""
    return [FLAG] + byte_stuff(data) + [FLAG]


def parse_frame(frame) -> list:
    """Validate the flags and return the original, unstuffed bytes."""
    frame = list(frame)
    if len(frame) < 2 or frame[0] != FLAG or frame[-1] != FLAG:
        raise ValueError("Frame must start and end with the flag 0x7E")
    inner = frame[1:-1]
    for b in inner:
        if int(b) & 0xFF == FLAG:
            raise ValueError("Malformed frame: unexpected flag 0x7E inside the payload")
    # byte_destuff would also reject flags; this keeps the error message clear.
    return byte_destuff(inner)


def hex_view(data) -> str:
    """Display helper: [0x7d, 0x5e, 0x45] -> '7D 5E 45'."""
    return " ".join(f"{int(b) & 0xFF:02X}" for b in data)


if __name__ == "__main__":
    demo = bytes([0x48, 0x7E, 0x65, 0x7D, 0x6C, 0x6F])   # "H\x7ee\x7dlo"
    stuffed = byte_stuff(demo)
    frame = build_frame(demo)

    print("Original :", hex_view(demo), "(text:", demo.decode("latin-1"), ")")
    print("Stuffed  :", hex_view(stuffed))
    print("Frame    :", hex_view(frame))
    print("Parsed   :", hex_view(parse_frame(frame)))
    assert bytes(parse_frame(frame)) == demo, "round-trip failed"
    print("\nRound-trip OK: destuff(stuff(data)) == data")

    print("\nTry your own hex bytes, e.g. '7E 48 7D 45' (blank line to quit):")
    while True:
        raw = input("hex    > ").strip()
        if not raw:
            break
        try:
            payload = [int(tok, 16) for tok in raw.replace(",", " ").split()]
            for tok in payload:
                if not 0 <= tok <= 0xFF:
                    raise ValueError(f"{tok:02X} is out of the byte range 00-FF")
            print("frame  >", hex_view(build_frame(payload)))
        except ValueError as exc:
            print("error  >", exc)
