import { useState } from "react";

import type { SceneObject } from "../types";

export function useSceneState() {
  const [objects, setObjects] = useState<SceneObject[]>([]);

  return {
    objects,
    setObjects,
  };
}
