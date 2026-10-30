"""Render the SIRI agent as a transparent, seamless hand-drawn GIF.

Run: python3 SIRI/tools/build_motivation_gif.py
Requires Pillow. The transparent GIF is generated from vector-like line strokes;
the contact sheet in /tmp is for checking every part of the loop before release.
"""

from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "static/images/motivation-agent.gif"
STILL = ROOT / "static/images/motivation-agent-still.png"
CONTACT = Path("/tmp/siri-motivation-gif-contact.png")
SIZE = 160
SCALE = 4
FRAMES = 72
INK = (78, 69, 62)
MUTED = (167, 151, 137)
CORAL = (181, 111, 90)
GREEN = (112, 137, 108)
GOLD = (187, 147, 80)


def smooth(a: float, b: float, t: float) -> float:
    x = min(1, max(0, (t - a) / (b - a)))
    return x * x * (3 - 2 * x)


def window(t: float, start: float, rise: float, fall: float, end: float) -> float:
    return smooth(start, rise, t) * (1 - smooth(fall, end, t))


def mix(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def alpha(color: tuple[int, int, int], opacity: float) -> tuple[int, int, int, int]:
    return (*color, round(255 * min(1, max(0, opacity))))


def bezier(points: list[tuple[float, float]], steps: int = 12) -> list[tuple[float, float]]:
    out = []
    for i in range(steps + 1):
        t = i / steps
        a, b, c, d = points
        x = (1 - t) ** 3 * a[0] + 3 * (1 - t) ** 2 * t * b[0] + 3 * (1 - t) * t * t * c[0] + t**3 * d[0]
        y = (1 - t) ** 3 * a[1] + 3 * (1 - t) ** 2 * t * b[1] + 3 * (1 - t) * t * t * c[1] + t**3 * d[1]
        out.append((x, y))
    return out


def draw_frame(t: float) -> Image.Image:
    im = Image.new("RGBA", (SIZE * SCALE, SIZE * SCALE), (0, 0, 0, 0))
    d = ImageDraw.Draw(im, "RGBA")

    def xy(points):
        return [(round(x * SCALE), round(y * SCALE)) for x, y in points]

    def stroke(points, color=INK, width=2.3, opacity=1):
        if opacity <= .01:
            return
        pts = xy(points)
        d.line(pts, fill=alpha(color, opacity), width=max(1, round(width * SCALE)), joint="curve")
        radius = max(1, round(width * SCALE / 2))
        for p in (pts[0], pts[-1]):
            d.ellipse((p[0] - radius, p[1] - radius, p[0] + radius, p[1] + radius), fill=alpha(color, opacity))

    def curve(a, b, c, e, color=INK, width=2.3, opacity=1):
        stroke(bezier([a, b, c, e]), color, width, opacity)

    def circle(box, color=INK, width=2.2, opacity=1):
        d.ellipse(tuple(round(v * SCALE) for v in box), outline=alpha(color, opacity), width=round(width * SCALE))

    # The same robot remains centered. Its outline and face carry the narrative.
    impact = window(t, .16, .20, .245, .30)
    discovery = window(t, .29, .34, .47, .53)
    checking = window(t, .49, .54, .65, .70)
    learning = window(t, .66, .72, .83, .88)
    acting = window(t, .77, .83, .91, .96)
    exploring = (1 - smooth(.28, .36, t)) * smooth(.0, .07, t) + smooth(.93, 1, t)

    # Hand-drawn environment: small marks appear and transform in place.
    wall = window(t, .03, .09, .26, .34)
    stroke([(121, 111), (122, 93), (129, 91), (135, 94), (135, 111)], MUTED, 1.7, wall)
    stroke([(119, 111), (138, 111)], MUTED, 1.4, wall)
    for a, b in [((122, 79), (126, 75)), ((129, 82), (136, 80)), ((130, 89), (137, 92))]:
        stroke([a, b], CORAL, 1.8, impact)

    route = window(t, .26, .33, .45, .53)
    start = (119, 112)
    success_path = bezier([start, (128, 106), (126, 88), (138, 85)], 16)
    shown = max(2, round(len(success_path) * smooth(.29, .40, t)))
    stroke(success_path[:shown], CORAL, 2.1, route)
    stroke([(135, 83), (138, 85), (140, 82)], CORAL, 1.6, route)

    # The successful route becomes a small skill note, which is checked then
    # curls back into the agent. All strokes are transparent outside the icon.
    note = window(t, .39, .46, .64, .76)
    fold = smooth(.64, .78, t)
    note_scale = mix(1, .16, fold)
    nx = mix(132, 91, fold)
    ny = mix(61, 68, fold)

    def note_point(x, y):
        return (nx + (x - 132) * note_scale, ny + (y - 61) * note_scale)

    note_points = [note_point(x, y) for x, y in [(119, 44), (141, 43), (145, 47), (145, 78), (120, 79), (119, 44)]]
    stroke(note_points, INK, 1.9, note)
    stroke([note_point(141, 43), note_point(141, 48), note_point(145, 47)], INK, 1.2, note)
    for y in (54, 61, 68):
        stroke([note_point(124, y), note_point(138 if y != 68 else 133, y - 1)], MUTED, 1.3, note)
    check_draw = checking * note
    stroke([note_point(128, 69), note_point(132, 73), note_point(140, 64)], GREEN, 2, check_draw)

    # The note's ink moves into the forehead instead of a hard replacement.
    internal_line = window(t, .65, .70, .80, .86)
    travel = smooth(.66, .80, t)
    curve((mix(121, 107, travel), mix(76, 65, travel)),
          (mix(112, 105, travel), mix(80, 61, travel)),
          (mix(105, 96, travel), mix(68, 54, travel)),
          (mix(88, 88, travel), mix(53, 51, travel)), GREEN, 1.8, internal_line)

    # Robot shape morphs: compression at impact and expansion while learning.
    sx = 1 + .075 * impact + .04 * (discovery + learning)
    sy = 1 - .13 * impact + .05 * (discovery + learning)
    lean = .035 * math.sin(2 * math.pi * t) - .075 * impact

    def face(x, y):
        x, y = 84 + (x - 84) * sx, 81 + (y - 81) * sy
        return (x + (y - 81) * lean, y)

    # Ears, helmet, and wobbling antenna preserve the supplied agent icon.
    stroke([face(55, 69), face(49, 67), face(47, 72), face(47, 91), face(50, 96), face(55, 94)], INK, 2.2)
    stroke([face(113, 68), face(119, 67), face(121, 73), face(121, 90), face(119, 96), face(113, 94)], INK, 2.2)

    outline = []
    for p in [
        [(67, 52), (74, 49), (94, 50), (104, 52)],
        [(104, 52), (112, 54), (114, 62), (114, 68)],
        [(114, 68), (115, 80), (114, 99), (114, 105)],
        [(114, 105), (113, 114), (107, 120), (98, 120)],
        [(98, 120), (90, 121), (72, 120), (66, 120)],
        [(66, 120), (57, 119), (54, 113), (54, 104)],
        [(54, 104), (53, 93), (54, 73), (54, 67)],
        [(54, 67), (54, 60), (59, 54), (67, 52)],
    ]:
        outline.extend(bezier([face(*a) for a in p], 9)[1:] if outline else bezier([face(*a) for a in p], 9))
    stroke(outline, INK, 2.7)
    stroke([face(62, 54), face(69, 51), face(78, 51)], MUTED, .9, .45)

    antenna_tip_x = mix(84, 76, impact) + 2 * discovery - 2 * learning
    stroke([face(84, 51), face(84, 40), (antenna_tip_x, 35)], INK, 2.2)
    circle((antenna_tip_x - 5, 27, antenna_tip_x + 5, 36), INK, 2.0)
    for a, b in [((84, 18), (84, 13)), ((72, 27), (67, 25)), ((96, 27), (101, 25))]:
        stroke([a, b], GOLD, 1.7, discovery)

    # Eyes scan, squeeze shut on impact, widen for a discovered skill, then
    # settle into a confident expression after internalization.
    scan = 2.1 * math.sin(2 * math.pi * t * 2) * exploring
    eye_open = mix(1, .25, impact)
    eye_open = mix(eye_open, 1.32, discovery)
    for ex in (70, 98):
        x = ex + scan
        a = face(x, 77 - 3 * (eye_open - 1))
        b = face(x, 85 + 3 * (eye_open - 1))
        stroke([a, b], INK, 2.4, 1 - impact)
        stroke([face(ex - 4, 80), face(ex, 78), face(ex + 4, 81)], INK, 2.2, impact)
    mouth_smile = max(discovery, checking, learning, acting)
    mouth_y = 99 - 2 * impact
    mouth_left = mix(70, 75, impact)
    mouth_right = mix(99, 94, impact)
    mouth_depth = 1 + 10 * mouth_smile - 10 * impact
    mouth = bezier([face(mouth_left, mouth_y), face(78, mouth_y + mouth_depth),
                    face(90, mouth_y + mouth_depth), face(mouth_right, mouth_y)], 18)
    stroke(mouth, INK, 2.25)
    for a, b in [((61, 93), (65, 95)), ((103, 95), (107, 93))]:
        stroke([face(*a), face(*b)], CORAL, 1.45, discovery * .65 + learning * .35)

    # A line is now part of the agent, rather than a paper carried at inference.
    memory = max(learning, acting)
    spiral = bezier([face(76, 62), face(80, 56), face(92, 58), face(91, 66)], 12)
    spiral += bezier([face(91, 66), face(86, 66), face(84, 63), face(87, 61)], 8)[1:]
    stroke(spiral, GREEN, 1.55, memory)
    circle((89, 60, 92, 63), GREEN, 1.2, memory)

    # At inference the same Agent acts without a visible skill note.
    act_curve = bezier([(116, 106), (125, 100), (132, 98), (143, 94)], 14)
    act_shown = max(2, round(len(act_curve) * smooth(.82, .92, t)))
    stroke(act_curve[:act_shown], GREEN, 2.0, acting)
    cx, cy = 145, 91
    star = [(cx, cy - 7), (cx + 2, cy - 2), (cx + 8, cy), (cx + 2, cy + 2),
            (cx, cy + 8), (cx - 2, cy + 2), (cx - 7, cy), (cx - 2, cy - 2), (cx, cy - 7)]
    stroke(star, GOLD, 1.6, window(t, .85, .89, .92, .96))

    return im.resize((SIZE, SIZE), Image.Resampling.LANCZOS)


def save_gif(frames: list[Image.Image]) -> None:
    # One palette for all frames prevents color flicker. Index zero is reserved
    # for transparency; visible edge pixels are matted to the white hero page.
    montage = Image.new("RGB", (SIZE * 12, SIZE * 6), "white")
    for i, frame in enumerate(frames):
        base = Image.new("RGB", frame.size, "white")
        base.paste(frame, mask=frame.getchannel("A"))
        montage.paste(base, ((i % 12) * SIZE, (i // 12) * SIZE))
    palette = montage.quantize(colors=120, method=Image.Quantize.MEDIANCUT)
    source_colors = palette.getpalette()[:120 * 3]
    full_palette = [0, 0, 0] + source_colors + [255, 255, 255] * (255 - 120)
    indexed = []
    for frame in frames:
        white = Image.new("RGB", frame.size, "white")
        white.paste(frame, mask=frame.getchannel("A"))
        q = white.quantize(palette=palette, dither=Image.Dither.NONE)
        values = bytearray(q.tobytes())
        mask = frame.getchannel("A").tobytes()
        for j, a in enumerate(mask):
            values[j] = values[j] + 1 if a >= 12 else 0
        out = Image.frombytes("P", frame.size, bytes(values))
        out.putpalette(full_palette)
        out.info["transparency"] = 0
        indexed.append(out)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    indexed[0].save(OUT, save_all=True, append_images=indexed[1:], duration=83,
                    loop=0, disposal=2, transparency=0, optimize=False)
    frames[63].save(STILL)

    selected = [0, 12, 16, 26, 36, 47, 57, 66]
    sheet = Image.new("RGB", (SIZE * 4, SIZE * 2), "#f7f7f7")
    for i, n in enumerate(selected):
        sheet.paste(frames[n], ((i % 4) * SIZE, (i // 4) * SIZE), frames[n])
    sheet.save(CONTACT)
    print(f"GIF: {OUT} ({OUT.stat().st_size:,} bytes, {len(indexed)} frames)")
    print(f"Reduced-motion still: {STILL}")
    print(f"Contact sheet: {CONTACT}")


if __name__ == "__main__":
    save_gif([draw_frame(i / (FRAMES - 1)) for i in range(FRAMES)])
