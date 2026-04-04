export type SceneObjectId = string;
export type SceneObjectKind = "scan" | "crown" | "auxiliary";
export type SceneObjectSource = "dataset" | "upload";

export interface SceneObjectVisualState {
  visible: boolean;
  opacity: number;
  color: string;
}

export interface SceneObjectTransform {
  translationMm: [number, number, number];
  rotationDeg: [number, number, number];
}

export interface SceneObject {
  id: SceneObjectId;
  name: string;
  fileName: string;
  kind: SceneObjectKind;
  source: SceneObjectSource;
  url: string;
  textureUrl: string | null;
  sizeBytes: number | null;
  visual: SceneObjectVisualState;
  transform: SceneObjectTransform;
  // Raw 4x4 mat set by the placement algo.
  // if transform mat is present (placement has been called), use instead of transform (defaults to zeros) in viewer.
  transformMatrix?: number[];
}
