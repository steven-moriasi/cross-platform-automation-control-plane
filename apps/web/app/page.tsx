import { requireSession } from "../lib/auth/session";
import {
  canApproveReleases,
  navigationForPrincipal,
} from "../lib/authorization";
import {
  getAutomationCatalog,
  getVerifiedPrincipal,
} from "../lib/control-plane";
import {
  countHighRisk,
  countMatchingChecksums,
  formatPlatform,
} from "../lib/portfolio";
import { ApplicationShell } from "../components/application-shell";
import { PlatformMark } from "../components/platform-mark";

const pendingReleases = [
  {
    automation: "Claims Intake & Triage",
    environment: "production",
    submitted: "Synthetic request · 14 minutes ago",
    version: "2.4.1",
  },
  {
    automation: "Commerce Returns",
    environment: "staging",
    submitted: "Synthetic request · 1 hour ago",
    version: "1.9.0",
  },
] as const;

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatDuration(seconds: number): string {
  return seconds < 60 ? `${seconds}s` : `${Math.round(seconds / 60)} min`;
}

export default async function HomePage(): Promise<React.JSX.Element> {
  const session = await requireSession();
  const [principal, catalog] = await Promise.all([
    getVerifiedPrincipal(session.accessToken),
    getAutomationCatalog(session.accessToken),
  ]);
  const navigation = navigationForPrincipal(principal);
  const canApprove = canApproveReleases(principal);
  const matchingChecksums = countMatchingChecksums(catalog);
  const highRisk = countHighRisk(catalog);

  return (
    <ApplicationShell
      activeNavigation="Overview"
      eyebrow="Operations workspace"
      navigation={navigation}
      principal={principal}
      title="Portfolio overview"
    >
      <section className="notice" aria-label="Data scope notice">
        <span className="notice__icon" aria-hidden>
          i
        </span>
        <p>
          This reference environment uses synthetic automation definitions. No
          customer records or vendor credentials are stored.
        </p>
      </section>

      <section className="metrics" aria-label="Portfolio metrics">
        <article className="metric">
          <p className="metric__label">Registered automations</p>
          <p className="metric__value">{catalog.length}</p>
          <p className="metric__detail">Governed across four platforms</p>
        </article>
        <article className="metric metric--success">
          <p className="metric__label">Checksum verified</p>
          <p className="metric__value">{matchingChecksums}</p>
          <p className="metric__detail">Native source matches its manifest</p>
        </article>
        <article className="metric">
          <p className="metric__label">High-risk workflows</p>
          <p className="metric__value">{highRisk}</p>
          <p className="metric__detail">High or critical governance tier</p>
        </article>
        <article className="metric metric--alert">
          <p className="metric__label">Pending releases</p>
          <p className="metric__value">{pendingReleases.length}</p>
          <p className="metric__detail">Synthetic approvals awaiting action</p>
        </article>
      </section>

      <section className="panel" aria-labelledby="portfolio-heading">
        <div className="panel__heading">
          <div>
            <p className="eyebrow">Governed inventory</p>
            <h2 id="portfolio-heading">Automation catalog</h2>
          </div>
          <span className="text-link">{catalog.length} records</span>
        </div>

        <div className="automation-table" role="table">
          <div className="automation-table__header" role="row">
            <span>Automation</span>
            <span>Governance</span>
            <span>Expected SLA</span>
            <span>Checksum</span>
          </div>
          {catalog.map((automation) => (
            <a
              className="automation-row automation-row--link"
              href={`/automations/${automation.id}`}
              key={automation.id}
              role="row"
            >
              <span className="automation-name">
                <PlatformMark platform={automation.platform} />
                <span>
                  <strong>{automation.displayName}</strong>
                  <small>
                    {formatPlatform(automation.platform)} ·{" "}
                    {automation.owner.supportGroup}
                  </small>
                </span>
              </span>
              <span>
                <strong>{automation.riskTier}</strong>
                <small className="table-detail">
                  {automation.dataClassification}
                </small>
              </span>
              <span>
                <strong>
                  {formatDuration(automation.trigger.expectedSlaSeconds)}
                </strong>
                <small className="table-detail">
                  Alert at{" "}
                  {formatDuration(automation.trigger.alertAfterSeconds)}
                </small>
              </span>
              <span
                className={`status ${
                  automation.checksumStatus === "MATCH"
                    ? "status--healthy"
                    : "status--degraded"
                }`}
              >
                {automation.checksumStatus.toLowerCase()}
              </span>
            </a>
          ))}
        </div>
      </section>

      <section className="lower-grid" aria-label="Operational queues">
        <article className="panel">
          <div className="panel__heading">
            <div>
              <p className="eyebrow">Change control</p>
              <h2>Release approval queue</h2>
            </div>
            <span className="counter">{pendingReleases.length}</span>
          </div>
          <div>
            {pendingReleases.map((release) => (
              <article className="release-item" key={release.automation}>
                <span className="release-item__risk">Review</span>
                <div>
                  <strong>{release.automation}</strong>
                  <p>
                    v{release.version} · {release.environment}
                  </p>
                  <p>{release.submitted}</p>
                </div>
                <button type="button" disabled={!canApprove}>
                  {canApprove ? "Review" : "Approval role required"}
                </button>
              </article>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panel__heading">
            <div>
              <p className="eyebrow">Evidence freshness</p>
              <h2>Catalog synchronization</h2>
            </div>
            <span
              className={`status ${
                matchingChecksums === catalog.length
                  ? "status--healthy"
                  : "status--degraded"
              }`}
            >
              {matchingChecksums === catalog.length
                ? "Verified"
                : "Drift found"}
            </span>
          </div>
          <div className="incident">
            <p className="incident__description">
              Native automation artifacts are hashed at API startup and compared
              with their governed manifest checksums.
            </p>
            <dl className="incident__facts">
              <div>
                <dt>Latest sync</dt>
                <dd>
                  {catalog[0]
                    ? formatDate(catalog[0].synchronizedAt)
                    : "Unavailable"}
                </dd>
              </div>
              <div>
                <dt>Verified</dt>
                <dd>
                  {matchingChecksums} of {catalog.length}
                </dd>
              </div>
              <div>
                <dt>Control</dt>
                <dd>SHA-256 source integrity</dd>
              </div>
            </dl>
          </div>
        </article>
      </section>
    </ApplicationShell>
  );
}
