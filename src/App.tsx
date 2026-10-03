import { lazy, Suspense } from "react";
import { FIELD_SCENES, FieldsDemo } from "./demos/fields/FieldsDemo";
import { Hub } from "./hub/Hub";
import { useRoute } from "./router";

const Lesson = lazy(() => import("./demos/lesson/Lesson").then((m) => ({ default: m.Lesson })));
const Predict = lazy(() => import("./demos/predict/Predict").then((m) => ({ default: m.Predict })));
const Film = lazy(() => import("./demos/film/Film").then((m) => ({ default: m.Film })));
const Flashcards = lazy(() =>
  import("./demos/flashcards/Flashcards").then((m) => ({ default: m.Flashcards })),
);

export function App() {
  const route = useRoute();
  let page: React.ReactNode;
  const scene = FIELD_SCENES.find((s) => route === `fields-${s.id}`);
  if (scene) page = <FieldsDemo key={scene.id} scene={scene.id} />;
  else if (route === "fields") page = <FieldsDemo scene="electric" />;
  else if (route === "lesson") page = <Lesson />;
  else if (route === "predict") page = <Predict />;
  else if (route === "flashcards") page = <Flashcards />;
  else if (route === "film") page = <Film />;
  else page = <Hub />;
  return (
    <Suspense fallback={<div style={{ padding: 24, color: "var(--fg-2)" }}>Loading the lab…</div>}>
      {page}
    </Suspense>
  );
}
