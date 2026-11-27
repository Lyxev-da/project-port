import { createFileRoute } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const Arcade = lazy(() => import("@/arcade/GameShell"));

// The home route ships no og:image, so serve-time hosting can inject the
// project's social preview (explicit og:image or latest screenshot).
export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "One in a Zillion — Pixel Number Arcade" },
    { name: "description", content: "Roll a number, uncover stacking patterns, collect rare tiers, and chase the worldwide leaderboard in Standard or Hardcore mode." },
    { property: "og:title", content: "One in a Zillion — Pixel Number Arcade" },
    { property: "og:description", content: "Every digit could be the start of your rarest roll. Play the original pixel-art number-pattern game." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Index,
});

// IMPORTANT: Replace this placeholder. See ./README.md for routing conventions.
function Index() {
  return (
    <ClientOnly fallback={<ArcadeLoading />}>
      <Suspense fallback={<ArcadeLoading />}><Arcade /></Suspense>
    </ClientOnly>
  );
}

function ArcadeLoading() { return <main className="arcade-loading" aria-busy="true"><h1>ONE IN A ZILLION</h1><p>OPENING THE ARCADE…</p></main>; }
