import { createFileRoute, Link } from "@tanstack/react-router";
import { Eye, ArrowRight, Layers3, ShieldCheck, AlertTriangle, ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EvidenceLens AI — Visual evidence. Explainable decisions." },
      { name: "description", content: "EvidenceLens AI helps claim-review teams inspect visual evidence, identify risk signals and generate structured, explainable decisions." },
      { property: "og:title", content: "EvidenceLens AI" },
      { property: "og:description", content: "Multi-modal damage-claim review for insurance, logistics and warranty teams." },
    ],
  }),
  component: Welcome,
});

const FEATURES = [
  { icon: Layers3, title: "Multi-Modal Review", desc: "Understand conversations and inspect multiple images side-by-side." },
  { icon: ShieldCheck, title: "Evidence Validation", desc: "Check whether the correct object part is visible at the right angle." },
  { icon: AlertTriangle, title: "Risk Detection", desc: "Flag image-quality, authenticity and user-history risks early." },
  { icon: ScrollText, title: "Explainable Decisions", desc: "Produce short, image-grounded justifications you can audit." },
];

function Welcome() {
  return (
    <div className="min-h-dvh bg-gradient-to-b from-background to-secondary/50">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-sidebar text-primary-foreground">
            <Eye className="h-4.5 w-4.5" />
          </div>
          <span className="font-semibold tracking-tight">EvidenceLens AI</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden rounded-md border border-ai/40 px-2 py-1 text-[11px] font-medium sm:inline" style={{ color: "var(--ai)" }}>Demo Mode</span>
          <Button asChild size="sm">
            <Link to="/overview">Open Console <ArrowRight className="ml-1 h-4 w-4" /></Link>
          </Button>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 pt-10 pb-16 md:pt-16 md:pb-24">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground shadow-soft">
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "var(--ai)" }} />
            Multi-modal claim review · cars · laptops · packages
          </span>
          <h1 className="mt-5 text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
            Review damage claims using conversation, images and evidence intelligence.
          </h1>
          <p className="mt-5 max-w-2xl text-base text-muted-foreground md:text-lg">
            EvidenceLens AI helps claim-review teams inspect visual evidence, understand user claims,
            identify risk signals and generate structured, explainable decisions.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/new-claim">Open Review Console <ArrowRight className="ml-1.5 h-4 w-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/claims">View Demo Claims</Link>
            </Button>
          </div>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border border-border bg-card p-5 shadow-soft">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <div className="mt-4 font-semibold">{f.title}</div>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-14 rounded-2xl border border-border bg-card p-6 shadow-soft md:p-8">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Review workflow</h2>
            <span className="text-xs text-muted-foreground">End-to-end, fully auditable</span>
          </div>
          <ol className="grid gap-3 md:grid-cols-5">
            {["Claim conversation", "Image evidence", "Evidence requirements", "Risk & history review", "Final decision"].map((step, i) => (
              <li key={step} className="rounded-xl border border-border bg-background p-4">
                <div className="text-xs font-medium text-primary">Step {i + 1}</div>
                <div className="mt-1 text-sm font-medium">{step}</div>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </div>
  );
}
