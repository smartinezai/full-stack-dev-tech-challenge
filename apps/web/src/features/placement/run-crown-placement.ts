import type { CrownPlacementInput, CrownPlacementResult } from "./types";

export async function runCrownPlacement(
  input: CrownPlacementInput,
): Promise<CrownPlacementResult> {
  void input;

  // TODO:
  // Implement an automated crown placement method that generalizes across all
  // challenge cases without per-case hardcoding.
  //
  // Suggested path:
  // 1) Parse STL geometry for scan and crown
  // 2) Compute coarse alignment
  // 3) Refine with iterative registration / geometric heuristics
  // 4) Return transform + diagnostics for UI verification
  throw new Error(
    "TODO: Automated crown placement is not implemented yet.",
  );
}
