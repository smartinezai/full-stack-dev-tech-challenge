import { Html, OrbitControls, OrthographicCamera } from "@react-three/drei";
import { Canvas, useLoader } from "@react-three/fiber";
import { Matrix4 } from "three";
import { Suspense } from "react";
import { PLYLoader } from "three/addons/loaders/PLYLoader.js";
import { STLLoader } from "three/addons/loaders/STLLoader.js";

import { Badge, Button, Slider } from "@repo/ui";
import type { SceneObject, SceneObjectVisualState } from "../../scene/types";

interface StlViewerWorkbenchProps {
  objects: SceneObject[];
  // Callback to update a single object's visual state (visibility, opacity, color)
  onUpdateObject: (id: string, visual: Partial<SceneObjectVisualState>) => void;
}

// Renders an STL file as a 3D mesh
function StlMesh({ url, color, opacity }: { url: string; color: string; opacity: number }) {
  const geometry = useLoader(STLLoader, url);
  return (
    <mesh geometry={geometry}>
      {/* roughness=1 -> fully matte, metalness=0 -> non-metallic (bone/ceramic).
          goal: make concave areas shade naturally */}
      <meshStandardMaterial color={color} opacity={opacity} transparent={true} roughness={1} metalness={0} />
    </mesh>
  );
}

// Renders a PLY file as a 3D mesh (cases 1-3 use PLY for scans)
function PlyMesh({ url, color, opacity }: { url: string; color: string; opacity: number }) {
  const geometry = useLoader(PLYLoader, url);
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color={color} opacity={opacity} transparent={true} roughness={1} metalness={0} />
    </mesh>
  );
}

// Picks right mesh component based on file ext. (stlmesh or plymesh) and applies placement transform if present
function SceneMesh({ object }: { object: SceneObject }) {
  // Use fileName (not url) because blob URLs have no extension
  const ext = object.fileName.split(".").pop()?.toLowerCase();
  const { color, opacity } = object.visual;

  // Build transform mat — use placement result if available, otherwise identity mat
  const matrix = object.transformMatrix
    ? new Matrix4().fromArray(object.transformMatrix)
    : new Matrix4();

  const mesh = ext === "ply"
    ? <PlyMesh url={object.url} color={color} opacity={opacity} />
    : <StlMesh url={object.url} color={color} opacity={opacity} />;

  // Wrap in a group and apply the mat so the mesh moves to the correct position
  return <group matrix={matrix} matrixAutoUpdate={false}>{mesh}</group>;
}

export function StlViewerWorkbench({ objects, onUpdateObject }: StlViewerWorkbenchProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-md overflow-hidden" style={{ height: "60vh" }}>
        <Canvas>
          {/* Orthographic camera to avoid distortion of parallel lines,
              makeDefault to use as the active camera. */}
          <OrthographicCamera makeDefault position={[0, 0, 100]} zoom={4} />
          <ambientLight intensity={0.4} />
          <directionalLight position={[10, 20, 10]} intensity={1.2} />
          <directionalLight position={[-10, -10, -5]} intensity={0.3} />
          {/* Suspense per object so they load independently */}
          {objects
            .filter((obj) => obj.visual.visible)
            .map((obj) => (
              <Suspense
                key={obj.id}
                fallback={<Html center><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" /></Html>}
              >
                <SceneMesh object={obj} />
              </Suspense>
            ))}
          <OrbitControls />
        </Canvas>
      </div>

      {/* object ctrl: visibility toggle + opacity slider */}
      <div className="flex flex-col gap-2">
        {objects.map((obj) => (
          <div key={obj.id} className="flex items-center gap-3 rounded-md border border-slate-200 bg-white px-3 py-2">
            {/* Color swatch */}
            <div className="h-4 w-4 rounded-sm shrink-0" style={{ backgroundColor: obj.visual.color }} />

            {/* Object name + kind badge */}
            <span className="flex-1 text-sm font-medium text-slate-700">{obj.name}</span>
            <Badge variant="outline" className="text-xs">{obj.kind}</Badge>

            {/* Opacity slider (0–100%) */}
            <div className="flex items-center gap-2 w-32">
              <span className="text-xs text-slate-500 shrink-0">Opacity</span>
              <Slider
                min={0}
                max={1}
                step={0.01}
                value={obj.visual.opacity}
                onValueChange={(val) => onUpdateObject(obj.id, { opacity: val })}
              />
            </div>

            {/* Visibility toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onUpdateObject(obj.id, { visible: !obj.visual.visible })}
            >
              {obj.visual.visible ? "Hide" : "Show"}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
