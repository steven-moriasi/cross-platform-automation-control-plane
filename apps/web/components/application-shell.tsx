import type { AuthenticatedPrincipal } from "@automation-control-plane/contracts";

interface ApplicationShellProperties {
  readonly activeNavigation: string;
  readonly children: React.ReactNode;
  readonly eyebrow: string;
  readonly navigation: readonly string[];
  readonly principal: AuthenticatedPrincipal;
  readonly title: string;
}

function formatRole(role: string | undefined): string {
  return (role ?? "VIEWER")
    .toLowerCase()
    .split("_")
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
    .join(" ");
}

function initials(displayName: string): string {
  return displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function navigationHref(label: string): string {
  return label === "Overview" ? "/" : `/#${label.toLowerCase()}`;
}

export function ApplicationShell({
  activeNavigation,
  children,
  eyebrow,
  navigation,
  principal,
  title,
}: ApplicationShellProperties): React.JSX.Element {
  return (
    <main className="application">
      <aside className="sidebar">
        <a
          className="brand"
          href="/"
          aria-label="Automation Control Plane home"
        >
          <span className="brand__mark">A</span>
          <span>
            <strong>Automation</strong>
            <small>Control Plane</small>
          </span>
        </a>
        <nav aria-label="Primary navigation">
          <ul className="navigation">
            {navigation.map((item, index) => (
              <li key={item}>
                <a
                  className={
                    item === activeNavigation
                      ? "navigation__link is-active"
                      : "navigation__link"
                  }
                  href={navigationHref(item)}
                >
                  <span className="navigation__icon" aria-hidden>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {item}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="sidebar__footer">
          <span className="environment-dot" aria-hidden />
          <span>
            <strong>Demo environment</strong>
            <small>Synthetic data only</small>
          </span>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h1>{title}</h1>
          </div>
          <div className="identity">
            <span className="identity__avatar" aria-hidden>
              {initials(principal.displayName)}
            </span>
            <span>
              <strong>{principal.displayName}</strong>
              <small>{formatRole(principal.roles[0])}</small>
            </span>
            <form action="/api/auth/logout" method="post">
              <button className="identity__logout" type="submit">
                Sign out
              </button>
            </form>
          </div>
        </header>
        {children}
      </section>
    </main>
  );
}
