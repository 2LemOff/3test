import { go } from "../router";
import { CATALOG, type Entry } from "./catalog";

const thumbs = import.meta.glob("./thumbs/*.webp", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;
const thumbFor = (name?: string) => (name ? thumbs[`./thumbs/${name}.webp`] : undefined);

export function Hub() {
  const ready = CATALOG.filter((e) => e.phase === 1);
  const later = CATALOG.filter((e) => e.phase > 1);
  return (
    <main className="hub">
      <header className="hub-head">
        <div className="eyebrow">Physics lab · showcase</div>
        <h1>See it, predict it, remember it</h1>
        <p>
          Photoreal simulations you can change, with lessons, predictions and flashcards built
          around them. Every scene runs on exact physics, tested against known results.
        </p>
        <button type="button" className="btn primary hub-cta" onClick={() => go("story")}>
          Start the story: all the demos in one sequence
        </button>
      </header>
      <section aria-labelledby="ready" className="hub-section">
        <h2 id="ready" className="eyebrow">
          Ready now
        </h2>
        <div className="tiles">
          {ready.map((e) => (
            <Tile key={e.id} e={e} />
          ))}
        </div>
      </section>
      <section aria-labelledby="next" className="hub-section">
        <h2 id="next" className="eyebrow">
          Coming next
        </h2>
        <ul className="planned">
          {later.map((e) => (
            <li key={e.id}>
              <span className="mono planned-phase">{e.format}</span>
              <span className="planned-title">{e.title}</span>
              <span className="planned-blurb">{e.blurb}</span>
            </li>
          ))}
        </ul>
      </section>
      <footer className="hub-foot">
        Rendered live in your browser with WebGL. Phones get a lighter version of the effects
        automatically.
      </footer>
    </main>
  );
}

function Tile({ e }: { e: Entry }) {
  const src = thumbFor(e.thumb);
  const inner = (
    <>
      <div className="tile-img">{src ? <img src={src} alt="" loading="lazy" /> : null}</div>
      <div className="tile-body">
        <div className="eyebrow">{e.format}</div>
        <h3>{e.title}</h3>
        <p>{e.blurb}</p>
      </div>
    </>
  );
  return (
    <article className={`tile${e.route ? "" : " static"}`}>
      {e.route ? (
        <a
          href={`#${e.route}`}
          onClick={(ev) => {
            ev.preventDefault();
            go(e.route as string);
          }}
          className="tile-link"
        >
          {inner}
        </a>
      ) : (
        <div className="tile-link">{inner}</div>
      )}
      {e.scenes && (
        <div className="tile-scenes">
          {e.scenes.map((s) => (
            <button key={s.route} type="button" className="btn" onClick={() => go(s.route)}>
              {s.label}
            </button>
          ))}
        </div>
      )}
    </article>
  );
}
