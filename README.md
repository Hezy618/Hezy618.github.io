# Zhongyu He's Homepage

My pixel-art themed personal academic homepage, live at **[hezy618.github.io](https://hezy618.github.io)**.

Built with vanilla HTML/CSS/JS — no framework, no build step. All personal content lives in a single data file, so the site doubles as a reusable template.

## Features

**🌙 Day / Night themes**
- Click the moon/sun (top right) to switch; choice persists via `localStorage`
- Night: starfield with shooting stars, parallax moon and mountains, stardust mouse trail
- Day: a full Super-Mario-style scene as the page background
- Theme switches are animated with a pixel binary-rain wipe

**🍄 Interactive Mario scene (day mode)**
- Mario runs across the bottom of the page on his own
- **Click Mario** to make him jump — hit a `?` block with his head to earn coins
- The middle block spawns a mushroom; catch it and Mario grows (and stays grown)
- Pipes block his path — click him to rescue him with a "HELP ME!" bubble

**🃏 Tarot hero card**
- 3D tilt on hover, click to flip (quote on the back)
- Links (GitHub / Google Scholar) rendered with their official logos

**🐱 Pixel cats everywhere**
- Each section has its own cat — sleeping on the tarot card, patrolling the publications panel, typing at the experience panel, and more
- Cats react to clicks and change behavior with the theme (e.g. the tarot cat sleeps at night and wakes up during the day)

**📄 Academic sections**
- Publications with venue badges (CCF / CORE / CAS ranks), keywords, review status and links
- Experience, education, awards, hobbies — all data-driven

## Customizing (use it as your own template)

Everything personal is in **[`data.js`](data.js)** — name, bio, links, publications, awards, hobbies. Edit that one file and the page updates itself; you never need to touch the HTML/CSS/JS logic.

```
index.html   page structure
style.css    all styles (night theme is the default; day rules are scoped under html.day)
script.js    all rendering and interaction logic
data.js      ★ your content — edit me ★
```

## Running locally

It's a static site — open `index.html` directly, or serve it:

```bash
python3 -m http.server 8000
# → http://localhost:8000
```

## Deployment

Hosted on GitHub Pages from the `main` branch — push and it's live.

## License

Feel free to fork and adapt for your own homepage. Attribution appreciated but not required.
