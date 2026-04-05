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


// Assembles a 4x4 transform from a Matrix3 rotation and translation vector
function assembleTransform(R: Matrix3, t: Vector3): Matrix4 {
  const e = R.elements; // column-major
  const m4 = new Matrix4();
  m4.set(
    e[0], e[3], e[6], t.x,
    e[1], e[4], e[7], t.y,
    e[2], e[5], e[8], t.z,
    0,    0,    0,    1,
  );
  return m4;
}


// --- ICP (Iterative Closest Point with full rotation + translation) ---

type Vec4 = [number, number, number, number];
type Mat4x4 = [Vec4, Vec4, Vec4, Vec4];

// For each crown vertex, finds the closest scan vertex by brute-force search.
function findClosestPoints(crownVerts: Vector3[], scanVerts: Vector3[]): [Vector3, Vector3][] {
  return crownVerts.map((cv) => {
    let minDist = Infinity;
    let closest = scanVerts[0]!;
    for (const sv of scanVerts) {
      const d = cv.distanceToSquared(sv);
      if (d < minDist) { minDist = d; closest = sv; }
    }
    return [cv, closest];
  });
}

// Jacobi eigenvalue solver for a 4x4 symmetric matrix.
// Returns the eigenvector with the largest eigenvalue (used for quaternion ICP).
function jacobiLargestEigen4(m: Mat4x4): Vec4 {
  const a: Mat4x4 = [
    [m[0][0], m[0][1], m[0][2], m[0][3]],
    [m[1][0], m[1][1], m[1][2], m[1][3]],
    [m[2][0], m[2][1], m[2][2], m[2][3]],
    [m[3][0], m[3][1], m[3][2], m[3][3]],
  ];
  const V: Mat4x4 = [[1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,1]];

  for (let iter = 0; iter < 100; iter++) {
    let maxVal = 0, p = 0, q = 1;
    for (let i = 0; i < 4; i++) {
      for (let j = i + 1; j < 4; j++) {
        const aij = a[i as 0|1|2|3][j as 0|1|2|3];
        if (Math.abs(aij) > maxVal) { maxVal = Math.abs(aij); p = i; q = j; }
      }
    }
    if (maxVal < 1e-10) break;
    const pi = p as 0|1|2|3, qi = q as 0|1|2|3;
    const app = a[pi][pi], aqq = a[qi][qi], apq = a[pi][qi];
    const theta = 0.5 * Math.atan2(2 * apq, app - aqq);
    const c = Math.cos(theta), s = Math.sin(theta);
    a[pi][pi] = c*c*app - 2*s*c*apq + s*s*aqq;
    a[qi][qi] = s*s*app + 2*s*c*apq + c*c*aqq;
    a[pi][qi] = 0; a[qi][pi] = 0;
    for (let r = 0; r < 4; r++) {
      if (r !== p && r !== q) {
        const ri = r as 0|1|2|3;
        const arp = a[ri][pi], arq = a[ri][qi];
        a[ri][pi] = c*arp - s*arq; a[pi][ri] = a[ri][pi];
        a[ri][qi] = s*arp + c*arq; a[qi][ri] = a[ri][qi];
      }
    }
    for (let r = 0; r < 4; r++) {
      const ri = r as 0|1|2|3;
      const vrp = V[ri][pi], vrq = V[ri][qi];
      V[ri][pi] = c*vrp - s*vrq;
      V[ri][qi] = s*vrp + c*vrq;
    }
  }

  // Return eigenvector of the largest eigenvalue
  const eigs: Vec4 = [a[0][0], a[1][1], a[2][2], a[3][3]];
  let maxIdx = 0;
  for (let i = 1; i < 4; i++) if (eigs[i as 0|1|2|3] > eigs[maxIdx as 0|1|2|3]) maxIdx = i;
  const mi = maxIdx as 0|1|2|3;
  return [V[0][mi], V[1][mi], V[2][mi], V[3][mi]];
}

// One ICP step using the quaternion method (Horn 1987).
// Finds the optimal rotation+translation for the given closest-point pairs.
function icpStep(pairs: [Vector3, Vector3][]): Matrix4 {
  const crownC = computeCentroid(pairs.map(([c]) => c));
  const scanC  = computeCentroid(pairs.map(([, s]) => s));

  // Build 3x3 cross-covariance matrix H
  const H: Mat3 = [[0,0,0],[0,0,0],[0,0,0]];
  for (const [c, s] of pairs) {
    const dc = c.clone().sub(crownC);
    const ds = s.clone().sub(scanC);
    const cx = [dc.x, dc.y, dc.z] as Vec3;
    const sx = [ds.x, ds.y, ds.z] as Vec3;
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++)
        H[i as 0|1|2][j as 0|1|2] += cx[i as 0|1|2] * sx[j as 0|1|2];
  }

  // Build the 4x4 symmetric N matrix from H — its largest eigenvector is the optimal quaternion
  const [H00,H01,H02] = H[0]; const [H10,H11,H12] = H[1]; const [H20,H21,H22] = H[2];
  const N: Mat4x4 = [
    [H00+H11+H22,  H21-H12,     H02-H20,     H10-H01    ],
    [H21-H12,      H00-H11-H22, H01+H10,     H20+H02    ],
    [H02-H20,      H01+H10,    -H00+H11-H22, H12+H21    ],
    [H10-H01,      H20+H02,     H12+H21,    -H00-H11+H22],
  ];

  // Largest eigenvector = optimal rotation quaternion [w, x, y, z]
  const [qw, qx, qy, qz] = jacobiLargestEigen4(N);

  // Convert quaternion to 3x3 rotation matrix
  const R = new Matrix3().set(
    1-2*(qy*qy+qz*qz),  2*(qx*qy-qw*qz),   2*(qx*qz+qw*qy),
    2*(qx*qy+qw*qz),    1-2*(qx*qx+qz*qz), 2*(qy*qz-qw*qx),
    2*(qx*qz-qw*qy),    2*(qy*qz+qw*qx),   1-2*(qx*qx+qy*qy),
  );

  // Translation: t = scanCentroid - R * crownCentroid
  const t = scanC.clone().sub(crownC.clone().applyMatrix3(R));
  return assembleTransform(R, t);
}

// Runs full ICP (rotation + translation) for up to maxIter iterations.
function runIcp(
  scanVerts: Vector3[],
  crownVerts: Vector3[],
  initialTransform: Matrix4,
  maxIter = 100,
  tolerance = 0.0001,
): { transform: Matrix4; iterations: number; finalError: number } {
  let current = crownVerts.map((v) => v.clone().applyMatrix4(initialTransform));
  let cumulative = initialTransform.clone();
  let iterations = 0;
  let finalError = Infinity;

  for (let iter = 0; iter < maxIter; iter++) {
    const step = Math.max(1, Math.floor(current.length / 1000));
    const sample = current.filter((_, i) => i % step === 0);
    const pairs = findClosestPoints(sample, scanVerts);

    finalError = Math.sqrt(
      pairs.reduce((s, [c, sv]) => s + c.distanceToSquared(sv), 0) / pairs.length
    );

    const delta = icpStep(pairs);
    const deltaT = new Vector3(delta.elements[12]!, delta.elements[13]!, delta.elements[14]!);
    if (deltaT.length() < tolerance) { iterations = iter + 1; break; }

    current = current.map((v) => v.clone().applyMatrix4(delta));
    cumulative = delta.clone().multiply(cumulative);
    iterations = iter + 1;
  }

  return { transform: cumulative, iterations, finalError };
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

  const crownCentroid = computeCentroid(crownVerts);
  const scanCentroid = computeCentroid(scanVerts);

  // Detect whether the crown is pre-positioned in scene space or centered at the origin.
  const crownAtOrigin = crownCentroid.length() < 3;

  type GridResult = { shortT: Matrix4; err: number; crownY: number };
  const allGridResults: GridResult[] = [];

  if (crownAtOrigin) {
    // At-origin crowns (cases 1-3): XZ fixed to scan centroid, Y-grid search.
    // Try 8 orientations (all 180° flip combos) × each Y step.
    // Using scan centroid XZ as the anchor ensures ICP starts near the correct XZ region.
    const orientations = [
      new Matrix4(),
      new Matrix4().makeRotationX(Math.PI),
      new Matrix4().makeRotationY(Math.PI),
      new Matrix4().makeRotationZ(Math.PI),
      new Matrix4().makeRotationX(Math.PI).multiply(new Matrix4().makeRotationY(Math.PI)),
      new Matrix4().makeRotationX(Math.PI).multiply(new Matrix4().makeRotationZ(Math.PI)),
      new Matrix4().makeRotationY(Math.PI).multiply(new Matrix4().makeRotationZ(Math.PI)),
      new Matrix4().makeRotationX(Math.PI).multiply(new Matrix4().makeRotationY(Math.PI)).multiply(new Matrix4().makeRotationZ(Math.PI)),
    ];
    const scanMinY = Math.min(...scanVerts.map(v => v.y));
    const scanMaxY = Math.max(...scanVerts.map(v => v.y));
    for (const rot of orientations) {
      const rotatedCentroid = crownCentroid.clone().applyMatrix4(rot);
      for (let yOffset = scanMinY; yOffset <= scanMaxY; yOffset += 3) {
        // Fix XZ to scan centroid, vary Y
        const t = new Matrix4().makeTranslation(
          scanCentroid.x - rotatedCentroid.x,
          yOffset - rotatedCentroid.y,
          scanCentroid.z - rotatedCentroid.z,
        ).multiply(rot);
        const tc = crownCentroid.clone().applyMatrix4(t);
        const local = scanVerts.filter(v => v.distanceTo(tc) < 12);
        const localVerts = local.length > 50 ? local : scanVerts;
        const { transform: shortT, finalError: err } = runIcp(localVerts, crownVerts, t, 50, 0.01);
        const crownY = crownCentroid.clone().applyMatrix4(shortT).y;
        allGridResults.push({ shortT, err, crownY });
      }
    }
  } else {
    // Pre-positioned crowns (cases 4-5): crown is already near the scan in scene space.
    // Y-grid search: slide in Y only, run short ICP at each position.
    const scanMinY = Math.min(...scanVerts.map(v => v.y));
    const scanMaxY = Math.max(...scanVerts.map(v => v.y));
    for (let yOffset = scanMinY; yOffset <= scanMaxY; yOffset += 3) {
      const t = new Matrix4().makeTranslation(0, yOffset - crownCentroid.y, 0);
      const tc = crownCentroid.clone().applyMatrix4(t);
      const local = scanVerts.filter(v => v.distanceTo(tc) < 12);
      const localVerts = local.length > 50 ? local : scanVerts;
      const { transform: shortT, finalError: err } = runIcp(localVerts, crownVerts, t, 50, 0.01);
      const crownY = crownCentroid.clone().applyMatrix4(shortT).y;
      allGridResults.push({ shortT, err, crownY });
    }
  }

  // Adaptive threshold: keep results within 30% of the best error seen.
  const minErr = Math.min(...allGridResults.map(r => r.err));
  const validResults = allGridResults.filter(r => r.err <= minErr * 1.3);

  const candidateLog = validResults
    .map(r => `Y=${r.crownY.toFixed(1)} err=${r.err.toFixed(3)}`)
    .join(', ');

  // Pick the candidate closest to scan centroid Y.
  validResults.sort((a, b) =>
    Math.abs(a.crownY - scanCentroid.y) - Math.abs(b.crownY - scanCentroid.y),
  );
  const best: GridResult = validResults[0] ?? allGridResults.reduce((a, b) => (a.err < b.err ? a : b));

  const bestInitial = best.shortT;
  const gridBestErr = best.err;
  const lowestCrownY = best.crownY;

  const bestCrownCent = crownCentroid.clone().applyMatrix4(bestInitial);
  const localScan = scanVerts.filter(v => v.distanceTo(bestCrownCent) < 12);
  const icpScanVerts = localScan.length > 100 ? localScan : scanVerts;
  const localScanCentroid = computeCentroid(icpScanVerts);

  const { transform, iterations, finalError } = runIcp(icpScanVerts, crownVerts, bestInitial, 200, 0.00001);

  const finalTransform = transform;
  const fe = finalTransform.elements;
  const lift = 0;

  return {
    crownObjectId: crownObject.id,
    transformMatrix: Array.from(finalTransform.elements),
    diagnostics: [
      `Scan: ${scanVerts.length} vertices sampled`,
      `Crown: ${crownVerts.length} vertices sampled`,
      `Crown centroid: [${crownCentroid.x.toFixed(2)}, ${crownCentroid.y.toFixed(2)}, ${crownCentroid.z.toFixed(2)}]`,
      `Scan centroid: [${scanCentroid.x.toFixed(2)}, ${scanCentroid.y.toFixed(2)}, ${scanCentroid.z.toFixed(2)}]`,
      `Grid candidates: ${candidateLog}`,
      `Mode: ${crownAtOrigin ? "at-origin (lowest-err)" : "pre-positioned (closest-to-centroid)"}`,
      `Grid: picked crown Y = ${lowestCrownY.toFixed(2)} mm (ICP error ${gridBestErr.toFixed(3)} mm)`,
      `Local scan verts: ${icpScanVerts.length} (centroid: [${localScanCentroid.x.toFixed(2)}, ${localScanCentroid.y.toFixed(2)}, ${localScanCentroid.z.toFixed(2)}])`,
      `Post-ICP lift: ${lift.toFixed(2)} mm`,
      `Translation: [${fe[12]!.toFixed(2)}, ${fe[13]!.toFixed(2)}, ${fe[14]!.toFixed(2)}] mm`,
      `ICP converged in ${iterations} iterations`,
      `Final mean error: ${finalError.toFixed(3)} mm`,
    ],
  };
}
