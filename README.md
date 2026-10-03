# Physics Lab Showcase

Photoreal, interactive physics demonstrations for a learning app, built with React, Three.js (react-three-fiber) and a tested physics core.

**Phase 1 (this commit):**

| Demo | Route | What it shows |
|---|---|---|
| Story | `#story` | All the demos in one guided sequence: ten chapters from a cannonball to an orbit, each with a live scene, narration and a link to the full demo. Autoplays; arrow keys and space work too |
| 3D fields and waves | `#fields-electric`, `#fields-magnet`, `#fields-beam`, `#fields-waves`, `#fields-orbits` | Electric field lines between chrome spheres, 50,000 iron filings oriented by the graphics card, a fine-beam tube (Lorentz force), double slit and standing waves, a gravitational slingshot |
| Guided lesson | `#lesson` | Lesson text beside a live cannon, questions generated from the scene, mastery per skill, PDF worksheet |
| Predict, then watch | `#predict` | Sketch the path and the vᵧ–t graph, fire, get misconception feedback |
| Flashcards | `#flashcards` | Ten card styles, typed-answer checking, FSRS scheduling, a 30-day simulation |
| Film | `#film` | A captioned film composed from the scenes; `scripts/record.mjs` renders it to MP4 |

Phases 2 and 3 are listed on the gallery page. Background: [docs/tech-stack.md](docs/tech-stack.md) (every layer, the options and the choices made) and [docs/active-recall.md](docs/active-recall.md).

## Run it

```sh
npm install
npm run dev        # http://localhost:5173
npm test           # physics and scheduling tests
npm run lint
npm run build      # single self-contained dist/index.html
```

Add `?still` to the URL for settled, deterministic frames (screenshots), or `?record&fps=24` to step the film one frame at a time.

## Scripts

- `node scripts/screenshots.mjs <url> <dir> <routes> [--mobile] [--dark]`: screenshots in software-rendered Chromium
- `node scripts/e2e-predict.mjs <url> <dir>`: draws a sketch, fires, reads the feedback
- `node scripts/record.mjs <url> <framesDir> <out.mp4>`: renders `#film` frame by frame and encodes it with ffmpeg
- `node scripts/printables.mjs <url> [seed]`: saves the lesson worksheet PDF to `media/`
- `node scripts/thumbs.mjs <url> <tmpDir>`: regenerates the gallery thumbnails
- `node scripts/artifact.mjs`: turns `dist/index.html` into a page for a claude.ai Artifact

## Physics checks

`src/physics/*.test.ts` compare every simulation with known results: RK4 projectile against the exact solution, range peak at 45°, energy conservation, inverse-square fields and field lines ending on charges, the Boris pusher's constant speed and radius m v / qB, double-slit fringe positions, harmonics n v / 2L, Kepler's third law and slingshot energy in the planet's frame.

## Honest limits

- Real-time scenes look like product renders, not photographs. **Photo mode** path-traces a still frame and gets closest.
- Field lines, graphs and labels have no real-world look; they are drawn as glowing filaments and glass panels.
- Iron filings and the orbit scene skip photo mode (their motion is computed in shaders or on a timeline).
- VR is not included yet.
