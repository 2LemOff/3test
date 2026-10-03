// Everything in the showcase, ready or planned, in one list.

export interface Entry {
  id: string;
  title: string;
  format: string;
  blurb: string;
  route?: string;
  scenes?: { label: string; route: string }[];
  phase: 1 | 2 | 3;
  /** Thumbnail file name in src/hub/thumbs (ready entries only). */
  thumb?: string;
}

export const CATALOG: Entry[] = [
  {
    id: "fields",
    title: "3D fields and waves",
    format: "3D visualizer",
    blurb:
      "Charged spheres, 50,000 iron filings, a fine-beam tube, a double slit, standing waves and a gravitational slingshot.",
    route: "fields-electric",
    scenes: [
      { label: "Electric", route: "fields-electric" },
      { label: "Magnetic", route: "fields-magnet" },
      { label: "Lorentz", route: "fields-beam" },
      { label: "Waves", route: "fields-waves" },
      { label: "Orbits", route: "fields-orbits" },
    ],
    phase: 1,
    thumb: "fields",
  },
  {
    id: "lesson",
    title: "Projectile motion lesson",
    format: "Guided curriculum",
    blurb:
      "Explanations beside a live cannon, questions generated from the scene, mastery per skill and a PDF worksheet.",
    route: "lesson",
    phase: 1,
    thumb: "lesson",
  },
  {
    id: "predict",
    title: "Predict, then watch",
    format: "Prediction",
    blurb:
      "Sketch the path and the velocity graph, fire the cannon, and see which misconception your sketch showed.",
    route: "predict",
    phase: 1,
    thumb: "predict",
  },
  {
    id: "flashcards",
    title: "Flashcards",
    format: "Spaced repetition",
    blurb:
      "Ten card styles, typed answers checked automatically and FSRS scheduling, on a real index-card deck.",
    route: "flashcards",
    phase: 1,
    thumb: "flashcards",
  },
  {
    id: "video",
    title: "Photoreal explainer video",
    format: "Video, recordings and loops",
    blurb:
      "A captioned film recorded frame by frame from these scenes, plus short silent loops. Sent as MP4 files.",
    phase: 1,
    thumb: "video",
  },
  {
    id: "linked",
    title: "Linked views",
    format: "Phase 2",
    blurb:
      "A brass pendulum with live position, velocity and acceleration graphs that move together.",
    phase: 2,
  },
  {
    id: "fbd",
    title: "Draw the forces",
    format: "Phase 2",
    blurb: "Draw force arrows on a block on a wooden ramp and get each one checked.",
    phase: 2,
  },
  {
    id: "worked",
    title: "Step-through worked example",
    format: "Phase 2",
    blurb: "An incline problem where each step lights up its part of the scene.",
    phase: 2,
  },
  {
    id: "mistake",
    title: "Spot the mistake",
    format: "Phase 2",
    blurb: "A typical wrong force diagram beside the correct one.",
    phase: 2,
  },
  {
    id: "formula",
    title: "Formula cards",
    format: "Phase 2",
    blurb: "Tap any symbol for its meaning, unit and a small animation.",
    phase: 2,
  },
  {
    id: "flow",
    title: "Which equation?",
    format: "Phase 2",
    blurb: "A tappable decision tree that ends in the right demo.",
    phase: 2,
  },
  {
    id: "maps",
    title: "Concept and prerequisite maps",
    format: "Phase 3",
    blurb: "A cork board of ideas joined by string, with your own map and your progress.",
    phase: 3,
  },
  {
    id: "mind",
    title: "Mind maps",
    format: "Phase 3",
    blurb: "One printable map per topic.",
    phase: 3,
  },
  {
    id: "motor",
    title: "Exploded motor",
    format: "Phase 3",
    blurb: "A DC motor that comes apart with a slider.",
    phase: 3,
  },
  {
    id: "scale",
    title: "Scale explorer",
    format: "Phase 3",
    blurb: "Zoom from an atom to a galaxy.",
    phase: 3,
  },
  {
    id: "history",
    title: "Experiments that changed physics",
    format: "Phase 3",
    blurb: "Five historic experiments rebuilt in 3D.",
    phase: 3,
  },
  {
    id: "print",
    title: "Posters and equation sheets",
    format: "Phase 3",
    blurb: "Revision posters and equation sheets as PDFs.",
    phase: 3,
  },
];
