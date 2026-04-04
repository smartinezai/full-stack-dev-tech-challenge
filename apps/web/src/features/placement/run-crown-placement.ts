import { BufferGeometry, Matrix3, Matrix4, Vector3 } from "three";
import { PLYLoader } from "three/addons/loaders/PLYLoader.js";
import { STLLoader } from "three/addons/loaders/STLLoader.js";

import type { CrownPlacementInput, CrownPlacementResult } from "./types";

// Typed tuple aliases to fix noUncheckedIndexedAccess bug
type Vec3 = [number, number, number];
type Mat3 = [Vec3, Vec3, Vec3];

// fetch and parse mesh file
async function loadGeometry(url: string, fileName: string) {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (ext === "ply") return new PLYLoader().loadAsync(url);
  return new STLLoader().loadAsync(url);
}

// Extracts vertex positions, at most maxCount for speed, use buffergeometry to store mesh in memory
function sampleVertices(geometry: BufferGeometry, maxCount = 5000): Vector3[] {
  const pos = geometry.attributes.position;
  // STL/PLY files must have a pos attr
  if (!pos) throw new Error("Geometry has no position attribute");
  const step = Math.max(1, Math.floor(pos.count / maxCount)); //pick the nth vertex for speed (instead of taking all vertices)
  const verts: Vector3[] = [];
  for (let i = 0; i < pos.count; i += step) {
    verts.push(new Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)));
  }
  return verts;
}

//avg pos. (sum vertices, divide by count to get centre of mass)
function computeCentroid(verts: Vector3[]): Vector3 {
  const sum = new Vector3();
  for (const v of verts) sum.add(v);
  return sum.divideScalar(verts.length);
}

// Returns  3x3 covmat as typed 3x3 tuple
function computeCovariance(verts: Vector3[], centroid: Vector3): Mat3 {
  let cxx = 0, cxy = 0, cxz = 0, cyy = 0, cyz = 0, czz = 0;
  //for each vertex calculate distance to ccentroid along each axis
  for (const v of verts) {
    const dx = v.x - centroid.x;
    const dy = v.y - centroid.y;
    const dz = v.z - centroid.z;
    cxx += dx * dx; cxy += dx * dy; cxz += dx * dz;
    cyy += dy * dy; cyz += dy * dz; czz += dz * dz;
  }
  const n = verts.length;
  return [
    [cxx / n, cxy / n, cxz / n],
    [cxy / n, cyy / n, cyz / n],
    [cxz / n, cyz / n, czz / n],
  ];
}

// Jacobi eigenvalue algo. for 3x3 symmetric mat
// Returns eigenvectors (as Vector3) sorted by descending eigenvalue.
function jacobiEigen(cov: Mat3): { vectors: [Vector3, Vector3, Vector3]; values: Vec3 } {
  // use type Mat3 so the tuple is fixed length and there are no errors
  const a: Mat3 = [
    [cov[0][0], cov[0][1], cov[0][2]],
    [cov[1][0], cov[1][1], cov[1][2]],
    [cov[2][0], cov[2][1], cov[2][2]],
  ];
  // V accumulates rotations — its columns become the eigenvectors
  const V: Mat3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];

  for (let iter = 0; iter < 100; iter++) {
    // Find largest non-diagonal element (to find the Principal component)
    let maxVal = 0, p = 0, q = 1;
    for (let i = 0; i < 3; i++) {
      for (let j = i + 1; j < 3; j++) {
        const aij = a[i as 0|1|2][j as 0|1|2]; //i is only ever 0,1 or 2
        if (Math.abs(aij) > maxVal) { maxVal = Math.abs(aij); p = i; q = j; }
      }
    }
    if (maxVal < 1e-10) break;

    // Jacobi rotation angle to zero out a[p][q]
    const pi = p as 0|1|2, qi = q as 0|1|2;
    const app = a[pi][pi], aqq = a[qi][qi], apq = a[pi][qi];
    const theta = 0.5 * Math.atan2(2 * apq, app - aqq);
    const c = Math.cos(theta), s = Math.sin(theta); 

    // Update diagonal (apply rotation)
    a[pi][pi] = c * c * app - 2 * s * c * apq + s * s * aqq;
    a[qi][qi] = s * s * app + 2 * s * c * apq + c * c * aqq;
    a[pi][qi] = 0; a[qi][pi] = 0;

    // Update non-diagonal elements (apply rotation)
    for (let r = 0; r < 3; r++) {
      if (r !== p && r !== q) {
        const ri = r as 0|1|2;
        const arp = a[ri][pi], arq = a[ri][qi];
        a[ri][pi] = c * arp - s * arq; a[pi][ri] = a[ri][pi];
        a[ri][qi] = s * arp + c * arq; a[qi][ri] = a[ri][qi];
      }
    }

    // Accumulate into eigenvector mat, repeat until convergence towards 0
    for (let r = 0; r < 3; r++) {
      const ri = r as 0|1|2;
      const vrp = V[ri][pi], vrq = V[ri][qi];
      V[ri][pi] = c * vrp - s * vrq;
      V[ri][qi] = s * vrp + c * vrq;
    }
  }

  // Sort eigenvectors by descending eigenvalue
  const eigenvalues: Vec3 = [a[0][0], a[1][1], a[2][2]];
  const idx: Vec3 = [0, 1, 2];
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  idx.sort((i, j) => eigenvalues[j]! - eigenvalues[i]!);

  const [i0, i1, i2] = idx;
  return {
    // Non-null assertions are safe: i0/i1/i2 are always 0, 1, or 2
    values: [eigenvalues[i0]!, eigenvalues[i1]!, eigenvalues[i2]!],
    vectors: [
      new Vector3(V[0][i0]!, V[1][i0]!, V[2][i0]!).normalize(),
      new Vector3(V[0][i1]!, V[1][i1]!, V[2][i1]!).normalize(),
      new Vector3(V[0][i2]!, V[1][i2]!, V[2][i2]!).normalize(),
    ],
  };
}

// Builds a 4x4 transform that coarsely aligns the crown to the scan:
// 1. Rotate crown so its principal axes align with the scan's principal axes
// 2. Translate crown centroid to scan centroid
function buildPcaTransform(scanVerts: Vector3[], crownVerts: Vector3[]): Matrix4 {
  const scanCentroid = computeCentroid(scanVerts);
  const crownCentroid = computeCentroid(crownVerts);

  const { vectors: sv } = jacobiEigen(computeCovariance(scanVerts, scanCentroid));
  const { vectors: cv } = jacobiEigen(computeCovariance(crownVerts, crownCentroid));

  //goal: find rotation R that maps crown axes onto scan axes
  // R = Q_scan * Q_crown^T maps crown principal axes onto scan principal axes
  // where q_scan  and q_crown are mats where the cols are the eigenvectors 
  const Qs = new Matrix3().set(
    sv[0].x, sv[1].x, sv[2].x,
    sv[0].y, sv[1].y, sv[2].y,
    sv[0].z, sv[1].z, sv[2].z,
  );
  const QcT = new Matrix3().set(
    cv[0].x, cv[1].x, cv[2].x,
    cv[0].y, cv[1].y, cv[2].y,
    cv[0].z, cv[1].z, cv[2].z,
  ).transpose();
  const R = Qs.clone().multiply(QcT);

  // move crown centroid to scan centroid (after rotation)
  const rotatedCrown = crownCentroid.clone().applyMatrix3(R);
  const t = scanCentroid.clone().sub(rotatedCrown);

  // Assemble 4x4 mat 
  const e = R.elements;
  const m4 = new Matrix4();
  m4.set(
    e[0], e[3], e[6], t.x,
    e[1], e[4], e[7], t.y,
    e[2], e[5], e[8], t.z,
    0,    0,    0,    1,
  );
  return m4;
}

//called when app calls run placement
export async function runCrownPlacement(
  input: CrownPlacementInput,
): Promise<CrownPlacementResult> {
  const { scanObject, crownObject } = input; //pull scan and crown sceneobject instances

  //run both promises in parallel for speed
  const [scanGeom, crownGeom] = await Promise.all([
    loadGeometry(scanObject.url, scanObject.fileName),
    loadGeometry(crownObject.url, crownObject.fileName),
  ]);

  const scanVerts = sampleVertices(scanGeom);
  const crownVerts = sampleVertices(crownGeom);

  const transform = buildPcaTransform(scanVerts, crownVerts);
  const e = transform.elements; 

  return {
    crownObjectId: crownObject.id, //which obj to move (apply transform to)
    transformMatrix: Array.from(transform.elements),
    diagnostics: [
      `Scan: ${scanVerts.length} vertices sampled`,
      `Crown: ${crownVerts.length} vertices sampled`,
      `Translation: [${e[12].toFixed(2)}, ${e[13].toFixed(2)}, ${e[14].toFixed(2)}] mm`,
      "PCA coarse alignment complete",
    ],
  };
}
