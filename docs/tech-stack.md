# Tech stack: every layer, the choices, and what this project uses

★ = recommended for this project.

### A. Platform and foundation
| Layer | Choices (summary) | Recommendation |
|---|---|---|
| **1. Delivery** | **PWA web app**: one codebase, installable, works offline · **Published Artifacts**: hosted claude.ai pages you can share, no server · **Native** (React Native/Expo, Flutter): app store, heavier · **Desktop** (Electron/Tauri) · **LMS plug-in** (LTI/SCORM): runs inside Moodle or Canvas | ★ PWA web app. Artifacts for prototypes and sharing now. |
| **2. Language** | **JavaScript**: no build step · **TypeScript**: JavaScript with types, catches unit and argument mistakes · **Rust/C++ → WASM**: near-native speed for heavy solvers · **Python in the browser** (Pyodide): NumPy/SciPy, but a slow first load | ★ TypeScript. WASM only if a solver is too slow. |
| **3. Build tool** | **None** (single HTML file) · **Vite**: fast, minimal setup · **Webpack/Parcel**: older · (the frameworks in layer 4 include their own) | ★ Vite. A plugin that bundles everything into one HTML file lets each demo also be published as an Artifact. |
| **4. UI framework** | **Vanilla JavaScript**: simplest, gets messy at scale · **React**: largest ecosystem (3D, graphs, flow diagrams) · **Svelte**: less code, smaller ecosystem · **Vue** · **Solid** · **Angular**: enterprise, heavy | ★ React |
| **5. App framework** | **Next.js**: React plus server and API, built for full platforms · **Astro**: content-first, interactive parts embedded in static pages, great for lessons · **SvelteKit / Nuxt / Remix** | ★ Plain Vite + React now. Next.js at project 7 (the full platform). |
| **6. Styling and UI kit** | **Plain CSS / CSS modules** · **Tailwind**: utility classes · **shadcn/ui** (Radix): accessible components you own · **MUI / Chakra**: complete kits, generic look | ★ CSS modules with design tokens now. Add shadcn/ui when the app grows. |

### B. Visualization and simulation
| Layer | Choices (summary) | Recommendation |
|---|---|---|
| **7. 2D rendering** | **Canvas 2D**: fast, handles thousands of shapes · **SVG**: sharp, easy to style and click, for diagrams · **PixiJS**: graphics-card 2D for many particles · **p5.js**: friendly for teaching, less structured · **Konva / Paper.js**: drawing-editor style | ★ Canvas 2D for simulations, SVG for diagrams |
| **7b. Realism** | **Real-time realistic materials** (Three.js metal, glass and roughness, generated environment lighting, ACES tone mapping) · **Post-processing**: glow, ambient shading, depth of field · **three-gpu-pathtracer**: path tracing in the browser that refines into near-photo stills · **Blender Cycles**: true photorealism, offline video only | ★ Realistic materials + post-processing for interaction, and three-gpu-pathtracer for a "photo mode" when paused |
| **8. 3D rendering** | **Three.js**: the standard · **react-three-fiber + drei**: Three.js as React components · **Babylon.js**: full engine, VR built in · **PlayCanvas** · **Unity/Godot web export**: big downloads · **raw WebGL/WebGPU**: maximum control | ★ react-three-fiber (Three.js) |
| **9. Graphics-card compute** | **WebGL shader tricks**: works everywhere · **WebGPU compute**: modern and fast, newer browsers only · **gpu.js**: easy, aging | ★ WebGPU with a WebGL fallback, later (fields, quantum, fluids) |
| **10. Physics engine** | **Custom integrators** (RK4, Verlet, symplectic): exact, transparent, testable · **Rapier** (2D/3D, WASM): fast, deterministic · **Matter.js**: easy 2D, inaccurate · **Planck.js / Box2D**: solid 2D · **cannon-es / Ammo.js**: 3D | ★ Custom integrators for teaching simulations: game engines fake the physics, so numbers drift. Rapier for the sandbox lab. |
| **11. Numerics** | **Your own small modules** · **math.js**: symbolic and units · **fft.js**: wave and quantum work · **glMatrix**: vectors · **Pyodide**: full SciPy | ★ Own modules + fft.js. math.js units for checking answers. |
| **12. Math display and input** | **KaTeX**: fast display · **MathJax**: more complete, slower · **MathLive**: an editable equation box for typed answers | ★ KaTeX + MathLive |
| **13. Graphs and plots** | **Mafs**: interactive React math graphs with draggable points · **JSXGraph**: interactive geometry · **uPlot**: very fast live plots · **Observable Plot / D3**: custom charts · **Plotly**: heavy · **Recharts**: dashboards · **Desmos / GeoGebra embeds**: polished, licensing restrictions | ★ Mafs for interactive graphs, uPlot for live simulation data, D3 for custom ones |
| **14. Sketch input** (for "predict") | **Own pointer capture on canvas** · **perfect-freehand**: smooth strokes · **tldraw / Excalidraw**: full whiteboards, overkill | ★ Own pointer capture + perfect-freehand |
| **15. Diagrams and mind maps** | **React Flow (xyflow)**: interactive node maps · **Cytoscape.js**: large graphs · **markmap**: mind map from Markdown · **Mermaid**: diagrams written as text · **D3-force** | ★ React Flow for the concept and prerequisite map. markmap/Mermaid for printable mind maps. |
| **16. Animation** | **CSS** · **Motion** (formerly Framer Motion): React UI animation · **GSAP**: timeline animation · **Lottie / Rive**: designer-made animations · **Theatre.js**: animation sequencing | ★ Motion for the interface. Simulations animate themselves frame by frame. |
| **17. Video production** | **Manim Community**: 3Blue1Brown-style maths animation in Python · **ManimGL**: 3Blue1Brown's own fork, less stable · **Motion Canvas**: Manim-like in TypeScript, so it can reuse the app's code · **Remotion**: React → MP4 · **Recording simulations** with Playwright + ffmpeg | ★ Record the app's own Three.js scenes frame by frame (Playwright + ffmpeg): photoreal, and reuses the simulation code. Manim stays an option for flat explainer videos. |
| **18. Narration** | **On-screen captions** · **Offline text-to-speech** (Piper): free, robotic · **Cloud text-to-speech** (ElevenLabs/OpenAI/Google): natural, needs an API key · **Your own recording** | ★ Captions now. Cloud text-to-speech once you have a key. |

### C. Learning, content and data
| Layer | Choices (summary) | Recommendation |
|---|---|---|
| **19. Lesson content** | **MDX**: Markdown with live components inside · **Markdown/YAML in the repo** · **Headless CMS** (Sanity, Payload, Strapi): editors without git | ★ MDX in the repo. A CMS only if non-developers write lessons. |
| **20. State and lesson flow** | **React state** · **Zustand**: tiny shared store · **Redux Toolkit**: heavy · **Jotai** · **XState**: explicit step-by-step flows | ★ Zustand. XState for the predict → watch → reflect flow. |
| **21. Spaced-repetition engine** | **Leitner boxes**: simple · **SM-2**: Anki's original algorithm · **FSRS** (ts-fsrs): current best, now Anki's default · **Half-life regression**: Duolingo's · **Knowledge tracing**: tracks how well a skill is mastered, for problem practice | ★ FSRS for cards. Knowledge tracing later, for problem skills. |
| **22. Local storage and offline** | **localStorage**: small · **IndexedDB via Dexie**: structured data · **PWA service worker** (Workbox) | ★ Dexie + PWA. localStorage is enough for the demos. |
| **23. Backend** | **None** · **Supabase**: Postgres, auth, realtime and storage · **Firebase** · **PocketBase**: single binary · **Convex** · **Custom server** (Hono/Fastify/FastAPI) | ★ None now. Supabase for project 7. |
| **24. Database and ORM** | **Postgres** · **SQLite** · **MongoDB**; **Drizzle / Prisma** (code-to-database layers) | ★ Postgres + Drizzle |
| **25. Login** | **Supabase Auth** · **Clerk** · **Auth.js** · school SSO (Google/Microsoft) · **LTI 1.3** for LMS logins | ★ Supabase Auth with Google sign-in |
| **26. Realtime** (teacher-led sessions) | **Supabase Realtime** · **Liveblocks / PartyKit** · **Yjs**: shared editing · **Socket.IO** | ★ Supabase Realtime |
| **27. AI tutor** | **Claude API via your backend** with tools that let it change the simulation · **Artifact "ask Claude" feature**: no API key, prototypes only · **Agent SDK** | ★ Artifact feature to prototype. Claude API + tools for the real app. |

### D. Quality and operations
| Layer | Choices (summary) | Recommendation |
|---|---|---|
| **28. Tests** | **Vitest**: unit tests · **fast-check**: tests on randomized inputs, ideal for physics rules like energy conservation · **Playwright**: end-to-end tests and screenshots · **Storybook**: catalogue of components | ★ Vitest + fast-check + Playwright |
| **29. Code quality** | **ESLint + Prettier** · **Biome**: both in one, fast · **strict TypeScript** · **axe-core**: accessibility checks | ★ Biome + strict TypeScript + axe |
| **30. Hosting and CI** | **GitHub Pages** · **Vercel** · **Netlify** · **Cloudflare Pages** · **GitHub Actions** | ★ Cloudflare Pages or Vercel + GitHub Actions. Artifacts until then. |
| **31. Analytics** | **PostHog**: usage events and experiments · **Plausible**: privacy-friendly page views · **xAPI/LRS**: learning-record standard | ★ PostHog later. xAPI if schools ask. |
| **32. App-store wrapper** | **Capacitor**: wraps the PWA · **Expo/React Native**: rewrite · **Tauri**: desktop | ★ Capacitor only if app stores are required |

**Stack for this showcase:** TypeScript + Vite + React, react-three-fiber/Three.js with post-processing and three-gpu-pathtracer, a custom physics core with Vitest/fast-check tests, Canvas/SVG, KaTeX, React Flow, ts-fsrs, and Playwright + ffmpeg for video.
**Added later:** Rapier, Mafs, Supabase, Next.js and the Claude API.
