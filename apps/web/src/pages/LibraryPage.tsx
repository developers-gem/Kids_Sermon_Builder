import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { storiesApi } from "@/api/endpoints";
import { STORY_IMAGES } from "@/assets/storyImages";

export function LibraryPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["stories"],
    queryFn: () => storiesApi.list(),
  });
  const stories = data?.stories ?? [];

  return (
    <main className="mx-auto max-w-5xl px-4 pb-20 pt-8 sm:px-6">
      <h1 className="text-4xl font-extrabold">Story library</h1>
      <p className="mt-2 max-w-xl text-muted-foreground">
        Everything in the kit at a glance. Pick one and build the full run sheet on the{" "}
        <Link to="/" className="font-bold text-accent underline">
          builder
        </Link>
        .
      </p>

      {isError && (
        <p className="mt-8 rounded-xl border-2 border-destructive/40 bg-destructive/10 px-4 py-3 text-sm font-bold text-destructive">
          Couldn't load stories from the server. Is the backend running?
        </p>
      )}

      <div className="mt-8 space-y-5">
        {isLoading &&
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="paper-card h-40 animate-pulse bg-secondary/50" />
          ))}
        {stories.map((s) => (
          <article key={s.id} className="paper-card grid gap-5 p-5 sm:grid-cols-[220px_1fr]">
            <img
              src={STORY_IMAGES[s.slug] ?? s.image}
              alt={s.imageAlt}
              width={1024}
              height={768}
              loading="lazy"
              className="h-40 w-full rounded-xl bg-secondary object-cover"
            />
            <div>
              <h2 className="text-2xl font-extrabold">{s.title}</h2>
              <p className="text-sm font-bold text-muted-foreground">
                {s.reference} · {s.ageRange} · {s.theme}
              </p>
              <p className="mt-2">{s.bigIdea}</p>
              <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="font-bold">Memory verse</dt>
                  <dd className="text-muted-foreground">{s.memoryVerse.reference}</dd>
                </div>
                <div>
                  <dt className="font-bold">Object lesson</dt>
                  <dd className="text-muted-foreground">{s.objectLesson.title}</dd>
                </div>
                <div>
                  <dt className="font-bold">Games</dt>
                  <dd className="text-muted-foreground">
                    {s.games.map((g) => g.title).join(" · ")}
                  </dd>
                </div>
                <div>
                  <dt className="font-bold">Coloring page</dt>
                  <dd className="text-muted-foreground">Printable line art included</dd>
                </div>
              </dl>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
