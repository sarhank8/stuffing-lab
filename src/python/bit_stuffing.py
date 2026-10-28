#!/usr/bin/env python3
"""
bit_stuffing.py — HDLC-style bit stuffing, with a small demo CLI.

Why stuffing exists
-------------------
HDLC frames are delimited by the flag pattern 01111110 (0x7E). If the payload
ever contains six consecutive 1s, a receiver would see a "flag" in the middle
of the data and the frame would be cut in two. The transmitter therefore
inserts ("stuffs") a 0 after every run of five consecutive 1s; the receiver
removes any 0 that immediately follows five 1s. Both sides stay in sync and
arbitrary data can be transmitted safely.

Run the demo:
    python3 bit_stuffing.py

Functions
---------
bit_stuff(data)      -> stuffed body (0 inserted after every run of five 1s)
bit_destuff(body)    -> original data (raises ValueError on malformed frames)
build_frame(data)    -> FLAG + stuffed body + FLAG
parse_frame(frame)   -> original data (validates the flags and the stuffing)
"""

FLAG = "01111110"   # 0x7E — the HDLC frame delimiter
MAX_RUN = 5         # five consecutive 1s trigger a stuff


def bit_stuff(data: str) -> str:
    """Insert a 0 after every run of MAX_RUN consecutive 1s.

    Non-binary characters are ignored so "0111 1110" works as input too.
    """
    stuffed = []
    run = 0
    for bit in data:
        if bit not in "01":
            continue
        stuffed.append(bit)
        if bit == "1":
            run += 1
            if run == MAX_RUN:
                stuffed.append("0")   # the stuffed bit
                run = 0
        else:
            run = 0
    return "".join(stuffed)


def bit_destuff(body: str) -> str:
    """Undo bit_stuff: remove the 0 that follows every run of five 1s.

    Raises ValueError if the frame is malformed (no 0 after five 1s).
    """
    destuffed = []
    run = 0
    i = 0
    while i < len(body):
        bit = body[i]
        if bit not in "01":
            raise ValueError(f"Non-binary character {bit!r} in frame body")
        destuffed.append(bit)
        if bit == "1":
            run += 1
            if run == MAX_RUN:
                i += 1                # the next bit must be the stuffed 0
                if i >= len(body) or body[i] != "0":
                    raise ValueError("Malformed frame: expected a stuffed 0 after five 1s")
                run = 0
        else:
            run = 0
        i += 1
    return "".join(destuffed)


def build_frame(data: str) -> str:
    """Wrap stuffed data between two flag delimiters."""
    return FLAG + bit_stuff(data) + FLAG


def parse_frame(frame: str) -> str:
    """Validate the flags and return the original, unstuffed data."""
    if not (frame.startswith(FLAG) and frame.endswith(FLAG) and len(frame) >= 2 * len(FLAG)):
        raise ValueError("Frame must start and end with the flag 01111110")
    return bit_destuff(frame[len(FLAG):-len(FLAG)])


if __name__ == "__main__":
    demo = "0111111011111001111111"
    body = bit_stuff(demo)
    frame = build_frame(demo)

    print("Original :", demo)
    print("Stuffed  :", body)
    print("Frame    :", FLAG, body, FLAG)
    print("Parsed   :", parse_frame(frame))
    assert parse_frame(frame) == demo, "round-trip failed"
    print("\nRound-trip OK: destuff(stuff(data)) == data")

    print("\nTry your own (blank line to quit):")
    while True:
        raw = input("data  > ").strip()
        if not raw:
            break
        try:
            print("frame >", build_frame(raw))
        except ValueError as exc:
            print("error >", exc)
