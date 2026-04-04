import { OrbitControls } from "@react-three/drei"; //mouse controls for panning and zooming

import { Canvas, useLoader } from "@react-three/fiber";

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
          <Canvas camera={{ position: [0, 0, 50], fov: 50 }}>
            <ambientLight intensity={0.4} />
            <directionalLight position={[10, 20, 10]} intensity={1.2} />
            <directionalLight position={[-10, -10, -5]} intensity={0.3} />
            <ScanMesh />
            <OrbitControls />
          </Canvas>
        </div>
      </CardContent>
    </Card>
  );
}
