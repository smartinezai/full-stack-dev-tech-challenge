import { Button, Card, CardContent, CardHeader, CardTitle } from "@repo/ui";

import type { PlacementRunState } from "../types";

interface PlacementPanelProps {
  status: PlacementRunState;
  onRunPlacement: () => Promise<void>;
}

const STATUS_COLOR_CLASS: Record<PlacementRunState["status"], string> = {
  idle: "text-slate-700",
  running: "text-teal-800",
  success: "text-emerald-800",
  error: "text-red-700",
};

export function PlacementPanel({
  status,
  onRunPlacement,
}: PlacementPanelProps) {
  return (
    <Card>
      <CardHeader className="p-3">
        <CardTitle>Placement</CardTitle>
      </CardHeader>

      <CardContent className="space-y-2 px-3 pb-3">
        <Button
          type="button"
          className="h-9 w-full"
          disabled={status.status === "running"}
          onClick={() => {
            void onRunPlacement();
          }}
        >
          {status.status === "running" ? "Running..." : "Run placement"}
        </Button>

        {status.message ? (
          <div className={`text-sm ${STATUS_COLOR_CLASS[status.status]}`}>
            {status.message}
          </div>
        ) : null}

        {status.diagnostics && status.diagnostics.length > 0 ? (
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">
              Diagnostics
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-slate-700">
              {status.diagnostics.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
