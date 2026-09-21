import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./styles.css";

export const metadata: Metadata = {
  title: {
    default: "Automation Control Plane",
    template: "%s | Automation Control Plane",
  },
  description:
    "Govern automation ownership, releases, execution evidence, and incidents across n8n, Zapier, Make, and Power Platform.",
};

interface RootLayoutProperties {
  readonly children: ReactNode;
}

export default function RootLayout({
  children,
}: RootLayoutProperties): React.JSX.Element {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
