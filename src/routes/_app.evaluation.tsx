import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Database } from "lucide-react";

export const Route = createFileRoute("/_app/evaluation")({
  head: () => ({ meta: [{ title: "Evaluation · EvidenceLens AI" }] }),
  component: EvalPage,
});

function EvalPage() {
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">System Evaluation</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <Database className="mb-2 h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm font-medium text-muted-foreground">No evaluation data available.</p>
        </CardContent>
      </Card>
    </div>
  );
}
