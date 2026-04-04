import { Html, OrbitControls, OrthographicCamera } from "@react-three/drei";

import { Canvas, useLoader } from "@react-three/fiber";

import { Suspense } from "react";

import { STLLoader } from "three/addons/loaders/STLLoader.js";

import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui";
import type { SceneObject } from "../../scene/types";

interface StlViewerWorkbenchProps {
  // The list of 3D objects in the scene (scans, crowns...)
  objects: SceneObject[];
}

function ScanMesh() {
  // Loads and renders a single STL mesh.
  const geometry = useLoader(STLLoader, "/data/cases/case-04/scan-04.stl");
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color="#e0d0c0" />
    </mesh>
  );
}

export function StlViewerWorkbench({ objects: _objects }: StlViewerWorkbenchProps) {
  return (
    <Card className="h-full">
      <CardHeader className="p-3">
        <CardTitle>Viewer Workbench</CardTitle>
      </CardHeader>

      <CardContent className="px-3 pb-3">
        <div className="rounded-md overflow-hidden" style={{ height: "60vh" }}>
          <Canvas>
            {/* Orthographic camera to avoid distortion of parallel lines,
                makeDefault to use as the active camera. */}
            <OrthographicCamera makeDefault position={[0, 0, 100]} zoom={4} />
            <ambientLight intensity={0.4} />
            <directionalLight position={[10, 20, 10]} intensity={1.2} />
            <directionalLight position={[-10, -10, -5]} intensity={0.3} />
            {/* fallback while stl still loading so it doesn't look weird or broken. */}
            <Suspense fallback={<Html center><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" /></Html>}>
              <ScanMesh />
            </Suspense>
            <OrbitControls />
          </Canvas>
        </div>
      </CardContent>
    </Card>
  );
}
