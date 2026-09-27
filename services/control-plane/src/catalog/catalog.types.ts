import type {
  AutomationManifest,
  ChecksumStatus,
} from "@automation-control-plane/contracts";

export interface LoadedCatalogAutomation {
  readonly checksumStatus: ChecksumStatus;
  readonly manifest: AutomationManifest;
  readonly manifestChecksum: string;
  readonly observedSourceChecksum: string;
}
