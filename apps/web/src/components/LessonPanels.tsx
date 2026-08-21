import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

const TINTS = {
  primary: "bg-primary text-primary-foreground",
  accent: "bg-accent text-accent-foreground",
  leaf: "bg-leaf text-leaf-foreground",
  berry: "bg-berry text-berry-foreground",
} as const;

export function Panel({
  icon: Icon,
  title,
  tint,
  children,
}: {
  icon: LucideIcon;
  title: string;
  tint: keyof typeof TINTS;
  children: ReactNode;
}) {
  return (
    <section className="paper-card print-block p-6">
      <div className="flex items-center gap-3">
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${TINTS[tint]}`}>
          <Icon className="h-5 w-5" />
        </span>
        <h3 className="text-2xl font-extrabold">{title}</h3>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function ActivityCard({
  activity,
}: {
  activity: { title: string; minutes: number; supplies: string; steps: string[] };
}) {
  return (
    <div className="rounded-xl border-2 border-border bg-muted/40 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h4 className="font-display text-lg font-bold">{activity.title}</h4>
        <span className="shrink-0 text-xs font-bold text-muted-foreground">
          {activity.minutes} min
        </span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">Supplies: {activity.supplies}</p>
      <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm">
        {activity.steps.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ol>
    </div>
  );
}
