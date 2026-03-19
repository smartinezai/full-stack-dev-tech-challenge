import type { SceneObject } from "../scene/types";

export interface CrownPlacementInput {
  scanObject: SceneObject;
  crownObject: SceneObject;
  sceneObjects: SceneObject[];
}

export interface CrownPlacementResult {
  crownObjectId: string;
  transformMatrix: number[];
  diagnostics: string[];
}

export type PlacementRunState =
  | {
      status: "idle" | "running" | "error";
      message: string;
      diagnostics?: string[];
    }
  | {
      status: "success";
      message: string;
      diagnostics: string[];
    };
