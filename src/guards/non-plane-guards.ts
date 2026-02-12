import type { SurfacePhase } from "../state/types";

export function assertSurfaceCanAcceptIntent(phase: SurfacePhase): void {
  if (phase === "submitted" || phase === "observing") {
    throw new Error("Interaction Surface is closed for current intent lifecycle; only read-only observation is allowed.");
  }
}

export function assertInteractionSurfaceTrigger(trigger: "interaction_surface" | "outer_scheduler"): void {
  if (trigger !== "interaction_surface") {
    throw new Error("CLI Non-Plane module cannot emulate Outer Scheduler trigger.");
  }
}
