import { createRoot } from "react-dom/client";
import "katex/dist/katex.min.css";
import "./styles.css";
import { App } from "./App";

const root = document.getElementById("root");
if (root) {
  // No StrictMode: its double-mounting breaks drei's HTML labels inside the 3D canvas.
  createRoot(root).render(<App />);
}
