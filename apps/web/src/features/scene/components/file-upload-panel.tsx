import type { Dispatch, SetStateAction } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui";
import type { SceneObject } from "../types";

interface FileUploadPanelProps {
  setObjects: Dispatch<SetStateAction<SceneObject[]>>;
}

export function FileUploadPanel({ setObjects: _setObjects }: FileUploadPanelProps) {
  return (
    <Card>
      <CardHeader className="p-3">
        <CardTitle>Files</CardTitle>
      </CardHeader>

      <CardContent className="space-y-3 px-3 pb-3">
        {/* TODO:
            Implement your file upload field here.
            Expected scope: drag-and-drop + manual selection for STL files.
        */}
        <div className="rounded-md border-2 border-dashed border-slate-300 bg-slate-50/70 p-4">
          <p className="text-sm font-medium text-slate-900">
            Your File Upload Field
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
