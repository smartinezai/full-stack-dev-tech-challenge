import { useState } from "react";

import { PlacementPanel } from "../features/placement/components/placement-panel";
import { runCrownPlacement } from "../features/placement/run-crown-placement";
import type { PlacementRunState } from "../features/placement/types";
import { FileUploadPanel } from "../features/scene/components/file-upload-panel";
import { useSceneState } from "../features/scene/hooks/use-scene-state";
import { StlViewerWorkbench } from "../features/viewer/components/stl-viewer-workbench";

const IDLE_PLACEMENT_STATE: PlacementRunState = {
  status: "idle",
  message: "",
};

export function App() {
  const [placementState, setPlacementState] =
    useState<PlacementRunState>(IDLE_PLACEMENT_STATE);

  const { objects, setObjects, updateObjectVisual } = useSceneState();

  const handleRunPlacement = async () => {
    const scanObject = objects.find((object) => object.kind === "scan");
    const crownObject = objects.find((object) => object.kind === "crown");

    if (!scanObject || !crownObject) {
      setPlacementState({
        status: "error",
        message:
          "A scan and a crown object must both be present before running placement.",
      });
      return;
    }

    setPlacementState({
      status: "running",
      message: "Running automated placement...",
    });

    try {
      const result = await runCrownPlacement({
        scanObject,
        crownObject,
        sceneObjects: objects,
      });

      // Apply transform mat to crown object in scene state
      setObjects((prev) =>
        prev.map((obj) =>
          obj.id === result.crownObjectId
            ? { ...obj, transformMatrix: result.transformMatrix }
            : obj,
        ),
      );

      setPlacementState({
        status: "success",
        message:
          "Placement completed. Verify geometric fit in the viewer and controls.",
        diagnostics: result.diagnostics,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Placement failed unexpectedly.";

      setPlacementState({
        status: "error",
        message,
      });
    }
  };

  return (
    <div className="min-h-screen text-slate-900">
      <header className="border-b border-slate-300/70 bg-white/85 backdrop-blur">
        <div className="w-full px-4 py-3 sm:px-6">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Dental Crown Placement and 3D Viewer
          </h1>
        </div>
      </header>

      <main className="w-full space-y-3 px-4 py-3 sm:px-6">
        <section className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_280px]">
          <FileUploadPanel objects={objects} setObjects={setObjects} />

          <PlacementPanel
            status={placementState}
            onRunPlacement={handleRunPlacement}
          />
        </section>

        <section>
          <StlViewerWorkbench objects={objects} onUpdateObject={updateObjectVisual} />
        </section>
      </main>
    </div>
  );
}
