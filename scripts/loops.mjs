// Cut short silent loops from the rendered film, as MP4 and GIF.
// Usage: node scripts/loops.mjs media/physics-lab-film.mp4

import { execFileSync } from "node:child_process";

const [film] = process.argv.slice(2);
// [name, start s, duration s]: times follow the shot list in src/demos/film/Film.tsx.
const loops = [
  ["loop-cannon-strobe", 1.2, 6],
  ["loop-iron-filings", 27.5, 6],
  ["loop-electron-beam", 38.5, 5.5],
  ["loop-slingshot", 57, 7],
];
const ff = (args) => execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...args]);
for (const [name, ss, t] of loops) {
  // Drop the burned-in captions by cropping to the upper part of the frame.
  const crop = "crop=1280:600:0:0";
  ff(["-ss", String(ss), "-t", String(t), "-i", film, "-vf", crop, "-an", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "22", "-movflags", "+faststart", `media/${name}.mp4`]);
  ff([
    "-ss", String(ss), "-t", String(t), "-i", film,
    "-vf", `${crop},fps=15,scale=480:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=sierra2_4a`,
    "-loop", "0", `media/${name}.gif`,
  ]);
  console.log(name);
}
