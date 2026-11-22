# Copper Canyon Karts

**Play it:** https://kart-attack-three.vercel.app

A 3D kart racer that runs in the browser, built with three.js, with a poster-style homepage wrapped around it.

Open `index.html` in a browser, or serve the folder with any static server.

## What is in it

- Grand Prix against five computer rivals, with items
- Time trial with a ghost of your best lap
- Two-player split screen on one keyboard
- Two circuits: Canyon Loop and Rattlesnake Pass
- Best times saved in the browser

Online racing uses a live room that only exists when the page is opened as a Claude artifact. From `index.html` the Online option says it is unavailable; split screen works anywhere.

## Controls

| | One player | Split screen P1 | Split screen P2 |
|---|---|---|---|
| Drive | W A S D or arrows | W A S D | Arrows |
| Drift | Space | Left Shift | Right Shift |
| Item | E | E | / |

R restarts, Esc opens the menu.

## Layout

- `src/home.html` the homepage
- `src/game.js`, `src/game.css`, `src/game.html` the game
- `src/extra.css`, `src/extra.js` page additions
- `src/build.py` joins them into `index.html` and `canyon-karts-home.html` (the artifact version, without the document wrapper)
- `canyon-karts.html` the first standalone version of the game

Rebuild with `python src/build.py`.
