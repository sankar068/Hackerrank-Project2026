import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useMemo, useCallback, type ChangeEvent } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Upload,
  X,
  Image as ImageIcon,
  Play,
  AlertTriangle,
} from "lucide-react";
import type {
  ClaimInput,
  ClaimObject,
  ConversationMessage,
  ClaimImage,
  UserHistory,
} from "@/types/claim";
import { OBJECT_LABEL, OBJECT_DESCRIPTION } from "@/lib/labels";
import { reviewService } from "@/services/reviewService";
import { upsertClaim, appendAudit } from "@/lib/storage";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/new-claim")({
  head: () => ({ meta: [{ title: "New Claim Review · EvidenceLens AI" }] }),
  component: NewClaim,
});

const STEPS = [
  "Claim Details",
  "Conversation",
  "Image Evidence",
  "User History",
  "Review & Analyse",
];

function newClaimId() {
  return `CLM-${Math.floor(10000 + Math.random() * 89999)}`;
}

function NewClaim() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [input, setInput] = useState<ClaimInput>(() => ({
    claimId: newClaimId(),
    userId: "",
    userName: "",
    claimObject: "car",
    claimTitle: "",
    submittedAt: new Date().toISOString(),
    conversation: [{ role: "customer", text: "" }],
    images: [],
    history: {
      totalClaims: 0,
      accepted: 0,
      rejected: 0,
      manualReview: 0,
      recentClaims: 0,
      riskNotes: "",
    },
  }));
  const [running, setRunning] = useState(false);
  const [stageText, setStageText] = useState("");
  const [progress, setProgress] = useState(0);

  const onRun = useCallback(async () => {
    const pendingClaim = { ...input, claimStatus: "pending" as const };
    upsertClaim(pendingClaim);
    appendAudit({
      claimId: input.claimId,
      actor: "system",
      action: "Claim submitted",
      previousValue: "—",
      newValue: "pending",
      reason: "User requested review",
      status: "ok",
    });

    setRunning(true);
    setProgress(0);
    setStageText("Connecting to production backend...");
    try {
      await reviewService.reviewClaim(input);
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Review failed");
      upsertClaim({ ...pendingClaim, claimStatus: "failed" as const });
      appendAudit({
        claimId: input.claimId,
        actor: "system",
        action: "Review failed",
        previousValue: "pending",
        newValue: "failed",
        reason: e instanceof Error ? e.message : "Review failed",
        status: "error",
      });
    } finally {
      setRunning(false);
      navigate({ to: "/result/$claimId", params: { claimId: input.claimId } });
    }
  }, [input, navigate]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Stepper step={step} setStep={setStep} />

      {step === 0 && <StepDetails input={input} setInput={setInput} />}
      {step === 1 && <StepConversation input={input} setInput={setInput} />}
      {step === 2 && <StepImages input={input} setInput={setInput} />}
      {step === 3 && <StepHistory input={input} setInput={setInput} />}
      {step === 4 && (
        <StepReview
          input={input}
          running={running}
          stageText={stageText}
          progress={progress}
          onRun={onRun}
        />
      )}

      <div className="flex items-center justify-between pt-2">
        <Button
          variant="outline"
          disabled={step === 0 || running}
          onClick={() => setStep((s) => s - 1)}
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep((s) => s + 1)}>
            Next <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={onRun}
            disabled={running}
            className="bg-ai hover:bg-ai/90"
            style={{ backgroundColor: "var(--ai)" }}
          >
            <Play className="mr-1.5 h-4 w-4" /> {running ? "Analysing…" : "Run AI Evidence Review"}
          </Button>
        )}
      </div>
    </div>
  );
}

function Stepper({ step, setStep }: { step: number; setStep: (n: number) => void }) {
  return (
    <ol className="grid grid-cols-2 gap-2 md:grid-cols-5">
      {STEPS.map((label, i) => {
        const state = i < step ? "done" : i === step ? "active" : "todo";
        return (
          <li key={label}>
            <button
              type="button"
              onClick={() => i <= step && setStep(i)}
              className={cn(
                "w-full rounded-xl border p-3 text-left transition",
                state === "active" && "border-primary bg-primary/5",
                state === "done" && "border-success/40 bg-success/5",
                state === "todo" && "border-border bg-card opacity-70",
              )}
            >
              <div
                className="flex items-center gap-2 text-xs font-medium"
                style={{
                  color:
                    state === "active"
                      ? "var(--primary)"
                      : state === "done"
                        ? "var(--success)"
                        : "var(--muted-foreground)",
                }}
              >
                <span
                  className="grid h-5 w-5 place-items-center rounded-full border text-[10px]"
                  style={{ borderColor: "currentColor" }}
                >
                  {i + 1}
                </span>
                Step {i + 1}
              </div>
              <div className="mt-1 text-sm font-semibold">{label}</div>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function StepDetails({
  input,
  setInput,
}: {
  input: ClaimInput;
  setInput: (i: ClaimInput) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Claim Details</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-5 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Claim ID</Label>
          <Input value={input.claimId} readOnly className="font-mono" />
        </div>
        <div className="space-y-1.5">
          <Label>Submitted</Label>
          <Input value={new Date(input.submittedAt).toLocaleString()} readOnly />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="uid">User ID</Label>
          <Input
            id="uid"
            value={input.userId}
            onChange={(e) => setInput({ ...input, userId: e.target.value })}
            placeholder="USR-1234"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="uname">User name</Label>
          <Input
            id="uname"
            value={input.userName}
            onChange={(e) => setInput({ ...input, userName: e.target.value })}
            placeholder="Jane Doe"
          />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label>Claim object</Label>
          <div className="grid gap-3 md:grid-cols-3">
            {(["car", "laptop", "package"] as ClaimObject[]).map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => setInput({ ...input, claimObject: o })}
                className={cn(
                  "rounded-xl border p-4 text-left transition",
                  input.claimObject === o
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:border-primary/40",
                )}
              >
                <div className="text-sm font-semibold">{OBJECT_LABEL[o]}</div>
                <p className="mt-1 text-xs text-muted-foreground">{OBJECT_DESCRIPTION[o]}</p>
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label htmlFor="title">Claim title</Label>
          <Input
            id="title"
            value={input.claimTitle}
            onChange={(e) => setInput({ ...input, claimTitle: e.target.value })}
            placeholder="Rear bumper dent after parking incident"
          />
        </div>
      </CardContent>
    </Card>
  );
}

function StepConversation({
  input,
  setInput,
}: {
  input: ClaimInput;
  setInput: (i: ClaimInput) => void;
}) {
  const [pasted, setPasted] = useState("");

  const update = (i: number, patch: Partial<ConversationMessage>) => {
    const next = [...input.conversation];
    next[i] = { ...next[i], ...patch };
    setInput({ ...input, conversation: next });
  };
  const add = (role: ConversationMessage["role"]) =>
    setInput({ ...input, conversation: [...input.conversation, { role, text: "" }] });
  const remove = (i: number) =>
    setInput({ ...input, conversation: input.conversation.filter((_, idx) => idx !== i) });
  const importPasted = () => {
    const lines = pasted
      .split(/\n+/)
      .map((l) => l.trim())
      .filter(Boolean);
    const parsed: ConversationMessage[] = lines.map((l) => {
      const m = /^(customer|agent|support agent)\s*:?\s*(.*)$/i.exec(l);
      if (m) return { role: /agent/i.test(m[1]) ? "agent" : "customer", text: m[2] };
      return { role: "customer", text: l };
    });
    setInput({ ...input, conversation: parsed });
    toast.success(`Imported ${parsed.length} messages`);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Conversation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {input.conversation.map((m, i) => (
            <div
              key={i}
              className={cn("flex gap-2", m.role === "agent" ? "flex-row-reverse" : "flex-row")}
            >
              <div
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[10px] font-semibold uppercase"
                style={{
                  backgroundColor: m.role === "agent" ? "var(--primary)" : "var(--muted)",
                  color: m.role === "agent" ? "var(--primary-foreground)" : "var(--foreground)",
                }}
              >
                {m.role === "agent" ? "AG" : "CU"}
              </div>
              <div
                className={cn(
                  "flex-1 rounded-2xl border p-3",
                  m.role === "agent" ? "bg-primary/5 border-primary/20" : "bg-card border-border",
                )}
              >
                <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
                  <Select
                    value={m.role}
                    onValueChange={(v) => update(i, { role: v as ConversationMessage["role"] })}
                  >
                    <SelectTrigger className="h-6 w-32 text-[11px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="customer">Customer</SelectItem>
                      <SelectItem value="agent">Support Agent</SelectItem>
                    </SelectContent>
                  </Select>
                  <button
                    onClick={() => remove(i)}
                    aria-label="Remove"
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <Textarea
                  rows={2}
                  value={m.text}
                  onChange={(e) => update(i, { text: e.target.value })}
                  placeholder="Write the message…"
                />
              </div>
            </div>
          ))}
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => add("customer")}>
              + Customer
            </Button>
            <Button size="sm" variant="outline" onClick={() => add("agent")}>
              + Agent
            </Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Paste complete conversation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            rows={10}
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            placeholder={`Customer: My car was hit while parked.\nAgent: Which part is damaged?\nCustomer: The rear bumper has a dent.`}
          />
          <Button size="sm" onClick={importPasted} disabled={!pasted.trim()}>
            Import
          </Button>
          <p className="rounded-md bg-muted p-2.5 text-[11px] text-muted-foreground">
            The AI should extract the actual damage claim and ignore unrelated conversation details.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function StepImages({ input, setInput }: { input: ClaimInput; setInput: (i: ClaimInput) => void }) {
  const onFiles = (files: FileList | null) => {
    if (!files) return;
    Promise.all(
      Array.from(files).map(
        (f) =>
          new Promise<ClaimImage>((resolve) => {
            resolve({
              id: crypto.randomUUID(),
              name: f.name,
              size: f.size,
              dataUrl: URL.createObjectURL(f),
            });
          }),
      ),
    ).then((imgs) => setInput({ ...input, images: [...input.images, ...imgs] }));
  };

  const remove = (id: string) => {
    setInput({ ...input, images: input.images.filter((i) => i.id !== id) });
  };

  const setPrimary = (id: string) => {
    setInput({
      ...input,
      images: input.images.map((i) => ({ ...i, primary: i.id === id })),
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Provide Evidence</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <Input type="file" multiple accept="image/*" onChange={(e) => onFiles(e.target.files)} />
        </div>

        {input.images.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {input.images.map((img) => (
              <div
                key={img.id}
                className={cn(
                  "rounded-xl border bg-card p-3",
                  img.primary ? "border-primary" : "border-border",
                )}
              >
                <div className="aspect-video overflow-hidden rounded-lg bg-muted">
                  <img src={img.dataUrl} alt={img.name} className="h-full w-full object-cover" />
                </div>
                <div className="mt-2 text-xs">
                  <div className="font-medium truncate">{img.name}</div>
                  <div className="text-muted-foreground">
                    {(img.size / 1024).toFixed(1)} KB ·{" "}
                    <span className="font-mono">{img.id.slice(0, 8)}</span>
                  </div>
                </div>
                <div className="mt-2 flex justify-between gap-2">
                  <Button
                    size="sm"
                    variant={img.primary ? "default" : "outline"}
                    onClick={() => setPrimary(img.id)}
                    className="flex-1 text-xs"
                  >
                    {img.primary ? "Primary" : "Mark primary"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => remove(img.id)}
                    aria-label="Remove"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
          Images are the primary source of truth in the final production system.
        </p>
      </CardContent>
    </Card>
  );
}

function StepHistory({
  input,
  setInput,
}: {
  input: ClaimInput;
  setInput: (i: ClaimInput) => void;
}) {
  const risk = useMemo(() => {
    const { rejected, recentClaims, manualReview } = input.history;
    if (rejected >= 3 || recentClaims >= 4) return "High";
    if (rejected >= 1 || manualReview >= 1 || recentClaims >= 2) return "Medium";
    return "Low";
  }, [input.history]);

  const field = (k: keyof UserHistory, label: string) => (
    <div key={k} className="space-y-1.5">
      <Label>{label}</Label>
      {k === "riskNotes" ? (
        <Textarea
          rows={2}
          value={String(input.history[k])}
          onChange={(e) =>
            setInput({ ...input, history: { ...input.history, [k]: e.target.value } })
          }
        />
      ) : (
        <Input
          type="number"
          min={0}
          value={Number(input.history[k])}
          onChange={(e) =>
            setInput({ ...input, history: { ...input.history, [k]: Number(e.target.value || 0) } })
          }
        />
      )}
    </div>
  );

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">User History</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {field("totalClaims", "Total previous claims")}
          {field("accepted", "Accepted claims")}
          {field("rejected", "Rejected claims")}
          {field("manualReview", "Manually reviewed claims")}
          {field("recentClaims", "Claims in last 30 days")}
          <div className="md:col-span-2">{field("riskNotes", "Existing risk notes")}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">History-risk indicator</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div
            className="text-3xl font-semibold"
            style={{
              color:
                risk === "High"
                  ? "var(--destructive)"
                  : risk === "Medium"
                    ? "var(--warning)"
                    : "var(--success)",
            }}
          >
            {risk}
          </div>
          <p className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
            User history provides risk context, but it must not override clear image evidence.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function StepReview({
  input,
  running,
  stageText,
  progress,
  onRun,
}: {
  input: ClaimInput;
  running: boolean;
  stageText: string;
  progress: number;
  onRun: () => void;
}) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Review summary</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Summary label="Claim ID" value={input.claimId} mono />
          <Summary label="Object" value={OBJECT_LABEL[input.claimObject]} />
          <Summary label="User" value={`${input.userName || "—"} · ${input.userId || "—"}`} />
          <Summary label="Title" value={input.claimTitle || "—"} />
          <Summary label="Messages" value={String(input.conversation.length)} />
          <Summary label="Images" value={String(input.images.length)} />
          <Summary label="Prior claims" value={String(input.history.totalClaims)} />
          <Summary label="Recent claims (30d)" value={String(input.history.recentClaims)} />
          <div className="md:col-span-2">
            <Separator />
            <p className="mt-3 rounded-md bg-muted p-3 text-xs text-muted-foreground flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Production image analysis is not connected yet. Submitting will save the claim as
              pending.
            </p>
          </div>
        </CardContent>
      </Card>

      {running && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Running simulated analysis…</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Progress value={progress} />
            <div className="text-sm text-muted-foreground">{stageText}</div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button
          onClick={onRun}
          disabled={running}
          size="lg"
          style={{ backgroundColor: "var(--ai)", color: "white" }}
        >
          <Play className="mr-1.5 h-4 w-4" /> {running ? "Analysing…" : "Run AI Evidence Review"}
        </Button>
      </div>
    </div>
  );
}

function Summary({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={cn("mt-0.5 text-sm font-medium", mono && "font-mono")}>{value}</div>
    </div>
  );
}
