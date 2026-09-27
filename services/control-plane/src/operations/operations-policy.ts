import type {
  IncidentAction,
  IncidentStatus,
} from "@automation-control-plane/contracts";

export function requiresIndependentApproval(
  riskTier: "CRITICAL" | "HIGH" | "LOW" | "MEDIUM",
  proposerSubject: string,
  approverSubject: string,
): boolean {
  return (
    (riskTier === "HIGH" || riskTier === "CRITICAL") &&
    proposerSubject === approverSubject
  );
}

export function isIncidentActionAllowed(
  status: IncidentStatus,
  action: IncidentAction["action"],
): boolean {
  if (action === "CLOSE") {
    return status === "RESOLVED";
  }
  if (action === "ACKNOWLEDGE") {
    return status === "OPEN";
  }
  return status === "OPEN" || status === "ACKNOWLEDGED";
}
