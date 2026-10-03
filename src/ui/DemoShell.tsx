import { type ReactNode, useState } from "react";
import { go } from "../router";

export interface PhotoState {
  photo: boolean;
  onPhotoSamples: (n: number) => void;
}

interface Props {
  title: string;
  /** Render the 3D viewport. Receives photo-mode state when the scene supports it. */
  viewport: (photo: PhotoState) => ReactNode;
  panel: ReactNode;
  photoSafe?: boolean;
  /** Extra chips on the viewport (scene tabs etc.). */
  overlay?: ReactNode;
}

export function DemoShell({ title, viewport, panel, photoSafe = true, overlay }: Props) {
  const [photo, setPhoto] = useState(false);
  const [samples, setSamples] = useState(0);
  return (
    <div className="demo">
      <div className="viewport">
        {viewport({ photo: photo && photoSafe, onPhotoSamples: setSamples })}
        <div className="topbar">
          <button
            type="button"
            className="chip"
            onClick={() => go("home")}
            aria-label="Back to the gallery"
          >
            ← Gallery
          </button>
          <span className="chip title">{title}</span>
          <span className="spacer" />
          {photoSafe && (
            <button
              type="button"
              className="chip"
              aria-pressed={photo}
              onClick={() => {
                setSamples(0);
                setPhoto((p) => !p);
              }}
              title="Path-traced render that refines while you wait"
            >
              {photo ? "Exit photo mode" : "Photo mode"}
            </button>
          )}
        </div>
        {photo && photoSafe && (
          <div className="photo-status chip" role="status">
            Path tracing · {samples} samples{samples < 64 ? " · refining" : " · converged"}
          </div>
        )}
        {overlay}
      </div>
      <aside className="panel">{panel}</aside>
    </div>
  );
}
