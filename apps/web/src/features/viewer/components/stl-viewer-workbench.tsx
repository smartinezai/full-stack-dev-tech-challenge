import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui";

export function StlViewerWorkbench() {
  return (
    <Card className="h-full">
      <CardHeader className="p-3">
        <CardTitle>Viewer Workbench</CardTitle>
      </CardHeader>

      <CardContent className="px-3 pb-3">
        <div className="grid min-h-[60vh] place-items-center rounded-md border border-dashed border-slate-400 bg-slate-100/70 p-4 text-center">
          {/* TODO:
              Replace this placeholder area with the full custom STL viewer.
          */}
          <p className="text-sm font-medium text-slate-700">
            Your Mesh Viewer Field
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
