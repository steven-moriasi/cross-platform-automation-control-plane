export const serviceStates = ["degraded", "healthy"] as const;

export type ServiceState = (typeof serviceStates)[number];

export interface DependencyHealth {
  readonly latencyMilliseconds?: number;
  readonly name: string;
  readonly state: ServiceState;
}

export interface ServiceHealth {
  readonly dependencies: readonly DependencyHealth[];
  readonly service: string;
  readonly state: ServiceState;
  readonly timestamp: string;
  readonly version: string;
}

export function deriveServiceState(
  dependencies: readonly DependencyHealth[],
): ServiceState {
  return dependencies.every(({ state }) => state === "healthy")
    ? "healthy"
    : "degraded";
}
