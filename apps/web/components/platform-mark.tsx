import type { Platform } from "../lib/portfolio";

interface PlatformMarkProperties {
  readonly platform: Platform;
}

const abbreviations: Record<Platform, string> = {
  make: "Mk",
  n8n: "n8n",
  "power-platform": "PP",
  zapier: "Za",
};

export function PlatformMark({
  platform,
}: PlatformMarkProperties): React.JSX.Element {
  return (
    <span className={`platform-mark platform-mark--${platform}`} aria-hidden>
      {abbreviations[platform]}
    </span>
  );
}
