import type { Dispatch, DragEvent, SetStateAction } from "react";
import { useRef, useState } from "react";

import { Button, Card, CardContent, CardHeader, CardTitle } from "@repo/ui";
import type { SceneObject } from "../types";

interface FileUploadPanelProps {
  setObjects: Dispatch<SetStateAction<SceneObject[]>>;
}

// Detects if file is a scan or crown based on filename
function detectKind(fileName: string): SceneObject["kind"] {
  const lower = fileName.toLowerCase();
  if (lower.includes("crown")) return "crown";
  if (lower.includes("scan")) return "scan";
  return "auxiliary";
}

// Color each kind so they're visually distinct in viewer
const KIND_COLORS: Record<SceneObject["kind"], string> = {
  scan: "#e0d0c0",   // warm bone
  crown: "#a8d8ea",  // light blue
  auxiliary: "#c8e6c9", // light green
};

// Creates SceneObject from File, using blob URL loader can fetch it
function fileToSceneObject(file: File): SceneObject {
  const kind = detectKind(file.name);
  return {
    id: `${file.name}-${Date.now()}`,
    name: file.name.replace(/\.(stl|ply)$/i, ""),
    fileName: file.name,
    kind,
    source: "upload",
    url: URL.createObjectURL(file), // temp in-memory URL
    textureUrl: null,
    sizeBytes: file.size,
    visual: { visible: true, opacity: 1, color: KIND_COLORS[kind] },
    transform: { translationMm: [0, 0, 0], rotationDeg: [0, 0, 0] },
  };
}

export function FileUploadPanel({ setObjects }: FileUploadPanelProps) {
  // Tracks whether file is being dragged over the drop zone
  const [isDragging, setIsDragging] = useState(false);
  // Hidden file input — triggered when "Browse" is clicked
  const fileInputRef = useRef<HTMLInputElement>(null);

  function addFiles(files: FileList | File[]) {
    const valid = Array.from(files).filter((f) =>
      /\.(stl|ply)$/i.test(f.name),
    );
    if (valid.length === 0) return;
    // Append new ojbs to scene without replacing existing objs
    setObjects((prev) => [...prev, ...valid.map(fileToSceneObject)]);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault(); // required to allow drop
    setIsDragging(true);
  }

  return (
    <Card>
      <CardHeader className="p-3">
        <CardTitle>Files</CardTitle>
      </CardHeader>

      <CardContent className="space-y-3 px-3 pb-3">
        {/* Drop zone — highlights when file is dragged over */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={() => setIsDragging(false)}
          className={`rounded-md border-2 border-dashed p-6 text-center transition-colors ${
            isDragging
              ? "border-teal-500 bg-teal-50"
              : "border-slate-300 bg-slate-50/70"
          }`}
        >
          <p className="text-sm text-slate-500">
            Drop STL or PLY files here
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => fileInputRef.current?.click()}
          >
            Browse files
          </Button>
        </div>

        {/* Hidden file input for manual selection */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".stl,.ply"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && addFiles(e.target.files)}
        />
      </CardContent>
    </Card>
  );
}
