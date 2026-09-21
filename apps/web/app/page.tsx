import { MetricCard } from "../components/metric-card";
import { PlatformMark } from "../components/platform-mark";
import {
  canApproveReleases,
  navigationForPrincipal,
} from "../lib/authorization";
import { requireSession } from "../lib/auth/session";
import { getVerifiedPrincipal } from "../lib/control-plane";
import {
  automationPortfolio,
  countHealthy,
  countHostedPending,
  formatPlatform,
} from "../lib/portfolio";

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

export default async function OverviewPage(): Promise<React.JSX.Element> {
  const session = await requireSession();
  const principal = await getVerifiedPrincipal(session.accessToken);
  const navigation = navigationForPrincipal(principal);
  const mayApproveReleases = canApproveReleases(principal);
  const healthyCount = countHealthy(automationPortfolio);
  const hostedPendingCount = countHostedPending(automationPortfolio);

  return (
    <main className="application">
      <aside className="sidebar">
        <a
          className="brand"
          href="#overview"
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
                    index === 0
                      ? "navigation__link is-active"
                      : "navigation__link"
                  }
                  href={`#${item.toLowerCase()}`}
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

      <section className="workspace" id="overview">
        <header className="topbar">
          <div>
            <p className="eyebrow">Operations portfolio</p>
            <h1>Good morning, {principal.displayName.split(" ")[0]}.</h1>
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

        <div className="notice" role="status">
          <span className="notice__icon" aria-hidden>
            i
          </span>
          <p>
            This reference environment uses synthetic records. Hosted execution
            evidence remains pending until each vendor account is connected.
          </p>
        </div>

        <section className="metrics" aria-label="Portfolio metrics">
          <MetricCard
            label="Registered automations"
            value={String(automationPortfolio.length)}
            detail="Across four platform packages"
          />
          <MetricCard
            label="Healthy"
            value={`${healthyCount}/${automationPortfolio.length}`}
            detail="Based on current evidence"
            tone="success"
          />
          <MetricCard
            label="Hosted verification"
            value={String(hostedPendingCount)}
            detail="Packages awaiting account-backed proof"
          />
          <MetricCard
            label="Open incidents"
            value="1"
            detail="One synthetic recovery exercise"
            tone="alert"
          />
        </section>

        <section className="panel" id="automations">
          <div className="panel__heading">
            <div>
              <p className="eyebrow">Governed inventory</p>
              <h2>Automation health</h2>
            </div>
            <a className="text-link" href="#releases">
              Review release gates <span aria-hidden>→</span>
            </a>
          </div>

          <div
            className="automation-table"
            role="table"
            aria-label="Automation health"
          >
            <div className="automation-table__header" role="row">
              <span role="columnheader">Automation</span>
              <span role="columnheader">Owner</span>
              <span role="columnheader">Evidence</span>
              <span role="columnheader">Health</span>
            </div>
            {automationPortfolio.map((automation) => (
              <article
                className="automation-row"
                role="row"
                key={automation.id}
              >
                <div className="automation-name" role="cell">
                  <PlatformMark platform={automation.platform} />
                  <span>
                    <strong>{automation.name}</strong>
                    <small>
                      {formatPlatform(automation.platform)} ·{" "}
                      {automation.lastExecution}
                    </small>
                  </span>
                </div>
                <span role="cell">{automation.owner}</span>
                <span role="cell">
                  {automation.evidence === "locally-verified"
                    ? "Locally verified"
                    : "Hosted pending"}
                </span>
                <span role="cell">
                  <span className={`status status--${automation.health}`}>
                    {automation.health}
                  </span>
                </span>
              </article>
            ))}
          </div>
        </section>

        <section className="lower-grid">
          <article className="panel" id="releases">
            <div className="panel__heading">
              <div>
                <p className="eyebrow">Release governance</p>
                <h2>Approval queue</h2>
              </div>
              <span className="counter">2</span>
            </div>
            <div className="release-item">
              <span className="release-item__risk">High</span>
              <div>
                <strong>Claims intake · 1.3.0</strong>
                <p>Checksum changed after dependency update</p>
              </div>
              {mayApproveReleases ? (
                <button type="button">Review</button>
              ) : (
                <span className="access-note">View only</span>
              )}
            </div>
            <div className="release-item">
              <span className="release-item__risk release-item__risk--medium">
                Medium
              </span>
              <div>
                <strong>Partner onboarding · 0.4.0</strong>
                <p>Local contract evidence is complete</p>
              </div>
              {mayApproveReleases ? (
                <button type="button">Review</button>
              ) : (
                <span className="access-note">View only</span>
              )}
            </div>
          </article>

          <article className="panel" id="incidents">
            <div className="panel__heading">
              <div>
                <p className="eyebrow">Operations</p>
                <h2>Active incident</h2>
              </div>
              <span className="status status--degraded">investigating</span>
            </div>
            <div className="incident">
              <span className="incident__severity">SEV-3</span>
              <h3>Refund reconciliation delayed</h3>
              <p>
                The synthetic commerce dependency timed out twice. No duplicate
                refund was issued; reconciliation remains safe to retry.
              </p>
              <dl>
                <div>
                  <dt>Owner</dt>
                  <dd>Commerce Operations</dd>
                </div>
                <div>
                  <dt>Opened</dt>
                  <dd>18 minutes ago</dd>
                </div>
              </dl>
            </div>
          </article>
        </section>
      </section>
    </main>
  );
}
