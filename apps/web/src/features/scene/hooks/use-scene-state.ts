import { useState } from "react";

import type { SceneObject, SceneObjectVisualState } from "../types";

// Temporary seed data to test viewer and controls. REMEMBER TO DELETE once upload is ready.
const SEED_OBJECTS: SceneObject[] = [
  {
    id: "scan-04",
    name: "Scan 04",
    fileName: "scan-04.stl",
    kind: "scan",
    source: "dataset",
    url: "/data/cases/case-04/scan-04.stl",
    textureUrl: null,
    sizeBytes: null,
    visual: { visible: true, opacity: 1, color: "#e0d0c0" },
    transform: { translationMm: [0, 0, 0], rotationDeg: [0, 0, 0] },
  },
  {
    id: "crown-04",
    name: "Crown 04",
    fileName: "crown-04.stl",
    kind: "crown",
    source: "dataset",
    url: "/data/cases/case-04/crown-04.stl",
    textureUrl: null,
    sizeBytes: null,
    visual: { visible: true, opacity: 1, color: "#a8d8ea" },
    transform: { translationMm: [0, 0, 0], rotationDeg: [0, 0, 0] },
  },
];

export function useSceneState() {
  const [objects, setObjects] = useState<SceneObject[]>(SEED_OBJECTS);

  // Updates visual properties (visible, opacity, color) of a single obj by id.
  // Partial<> means just pass fields you want to change.
  function updateObjectVisual(id: string, visual: Partial<SceneObjectVisualState>) {
    setObjects((prev) =>
      prev.map((obj) =>
        obj.id === id ? { ...obj, visual: { ...obj.visual, ...visual } } : obj,
      ), //loop through all objs and return the updated one when id match 
    );
  }

  return {
    objects,
    setObjects,
    updateObjectVisual,
  };
}
