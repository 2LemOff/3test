import { useEffect, useState } from "react";

// Only bare #tokens survive in an Artifact link, so routes are single tokens like #fields-beam.
const read = () => window.location.hash.replace(/^#/, "") || "home";

export function useRoute(): string {
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const on = () => {
      setRoute(read());
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return route;
}

export function go(route: string) {
  window.location.hash = route === "home" ? "" : route;
}
