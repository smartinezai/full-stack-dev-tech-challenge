import { useState } from "react";

import type { SceneObject, SceneObjectVisualState } from "../types";

export function useSceneState() {
  const [objects, setObjects] = useState<SceneObject[]>([]);

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
