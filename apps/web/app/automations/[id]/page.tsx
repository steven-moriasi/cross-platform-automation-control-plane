import { ApplicationShell } from "../../../components/application-shell";
import { PlatformMark } from "../../../components/platform-mark";
import { requireSession } from "../../../lib/auth/session";
import {
  canViewCatalogAudit,
  navigationForPrincipal,
} from "../../../lib/authorization";
import {
  getAutomation,
  getAutomationAudit,
  getVerifiedPrincipal,
} from "../../../lib/control-plane";
import { formatPlatform } from "../../../lib/portfolio";

interface AutomationDetailPageProperties {
  readonly params: Promise<{ readonly id: string }>;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatSeconds(seconds: number): string {
  return seconds < 60
    ? `${seconds} seconds`
    : `${Math.round(seconds / 60)} minutes`;
}

function shortChecksum(checksum: string): string {
  return `${checksum.slice(0, 12)}…${checksum.slice(-12)}`;
}

export default async function AutomationDetailPage({
  params,
}: AutomationDetailPageProperties): Promise<React.JSX.Element> {
  const session = await requireSession();
  const { id } = await params;
  const [principal, automation] = await Promise.all([
    getVerifiedPrincipal(session.accessToken),
    getAutomation(session.accessToken, id),
  ]);
  const mayViewAudit = canViewCatalogAudit(principal);
  const audit = mayViewAudit
    ? await getAutomationAudit(session.accessToken, id)
    : [];

  return (
    <ApplicationShell
      activeNavigation="Automations"
      eyebrow="Automation catalog"
      navigation={navigationForPrincipal(principal)}
      principal={principal}
      title={automation.displayName}
    >
      <section className="detail-heading">
        <a className="text-link" href="/">
          ← Back to portfolio
        </a>
        <div className="detail-heading__identity">
          <PlatformMark platform={automation.platform} />
          <div>
            <p>
              {formatPlatform(automation.platform)} · {automation.id}
            </p>
            <span
              className={`status ${
                automation.checksumStatus === "MATCH"
                  ? "status--healthy"
                  : "status--degraded"
              }`}
            >
              Source checksum {automation.checksumStatus.toLowerCase()}
            </span>
          </div>
        </div>
      </section>

      {automation.checksumStatus === "MISMATCH" ? (
        <section className="notice notice--warning" role="alert">
          <span className="notice__icon" aria-hidden>
            !
          </span>
          <p>
            The native artifact no longer matches the approved manifest.
            Investigate the drift before promoting another release.
          </p>
        </section>
      ) : null}

      <section className="detail-grid">
        <article className="panel">
          <div className="panel__heading">
            <div>
              <p className="eyebrow">Accountability</p>
              <h2>Governance profile</h2>
            </div>
            <span className="status">{automation.riskTier} risk</span>
          </div>
          <dl className="metadata-grid">
            <div>
              <dt>Business capability</dt>
              <dd>{automation.businessCapability}</dd>
            </div>
            <div>
              <dt>Owner</dt>
              <dd>{automation.owner.email}</dd>
            </div>
            <div>
              <dt>Support group</dt>
              <dd>{automation.owner.supportGroup}</dd>
            </div>
            <div>
              <dt>Data classification</dt>
              <dd>{automation.dataClassification}</dd>
            </div>
            <div>
              <dt>Manifest version</dt>
              <dd>{automation.manifestVersion}</dd>
            </div>
            <div>
              <dt>Schema version</dt>
              <dd>{automation.schemaVersion}</dd>
            </div>
          </dl>
        </article>

        <article className="panel">
          <div className="panel__heading">
            <div>
              <p className="eyebrow">Service level</p>
              <h2>Trigger and response</h2>
            </div>
            <span className="status">{automation.trigger.type}</span>
          </div>
          <dl className="metadata-grid">
            <div>
              <dt>Expected SLA</dt>
              <dd>{formatSeconds(automation.trigger.expectedSlaSeconds)}</dd>
            </div>
            <div>
              <dt>Alert threshold</dt>
              <dd>{formatSeconds(automation.trigger.alertAfterSeconds)}</dd>
            </div>
            <div>
              <dt>Runbook</dt>
              <dd className="path-value">{automation.runbookPath}</dd>
            </div>
            <div>
              <dt>Recovery guide</dt>
              <dd className="path-value">{automation.recoveryPath}</dd>
            </div>
          </dl>
        </article>
      </section>

      <section className="panel detail-panel">
        <div className="panel__heading">
          <div>
            <p className="eyebrow">Integrity evidence</p>
            <h2>Source checksums</h2>
          </div>
          <span className="text-link">
            Synchronized {formatDate(automation.synchronizedAt)}
          </span>
        </div>
        <dl className="checksum-list">
          <div>
            <dt>Declared in manifest</dt>
            <dd title={automation.sourceChecksum}>
              {shortChecksum(automation.sourceChecksum)}
            </dd>
          </div>
          <div>
            <dt>Observed from native artifact</dt>
            <dd title={automation.observedSourceChecksum}>
              {shortChecksum(automation.observedSourceChecksum)}
            </dd>
          </div>
          <div>
            <dt>Native artifact</dt>
            <dd>{automation.nativeArtifactPath}</dd>
          </div>
        </dl>
      </section>

      <section className="detail-grid">
        <article className="panel">
          <div className="panel__heading">
            <div>
              <p className="eyebrow">Runtime topology</p>
              <h2>Dependencies</h2>
            </div>
            <span className="counter">{automation.dependencies.length}</span>
          </div>
          {automation.dependencies.length === 0 ? (
            <p className="empty-state">No external dependencies declared.</p>
          ) : (
            <ul className="definition-list">
              {automation.dependencies.map((dependency) => (
                <li key={dependency.name}>
                  <strong>{dependency.name}</strong>
                  <span>{dependency.type}</span>
                  <small>
                    {dependency.required ? "Required" : "Optional"} dependency
                  </small>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="panel">
          <div className="panel__heading">
            <div>
              <p className="eyebrow">Secret boundary</p>
              <h2>Logical credentials</h2>
            </div>
            <span className="counter">
              {automation.credentialReferences.length}
            </span>
          </div>
          <ul className="definition-list">
            {automation.credentialReferences.map((credential) => (
              <li key={credential.name}>
                <strong>{credential.name}</strong>
                <small>{credential.purpose}</small>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="panel detail-panel">
        <div className="panel__heading">
          <div>
            <p className="eyebrow">Promotion policy</p>
            <h2>Target environments</h2>
          </div>
        </div>
        <div className="target-list">
          {automation.targets.map((target) => (
            <div key={target.environment}>
              <strong>{target.environment}</strong>
              <span>{target.releaseStrategy}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="panel detail-panel">
        <div className="panel__heading">
          <div>
            <p className="eyebrow">Immutable history</p>
            <h2>Catalog audit</h2>
          </div>
          <span className="counter">{audit.length}</span>
        </div>
        {!mayViewAudit ? (
          <p className="empty-state">
            Audit history is available to automation owners and auditors.
          </p>
        ) : audit.length === 0 ? (
          <p className="empty-state">No catalog audit events recorded.</p>
        ) : (
          <ol className="audit-list">
            {audit.map((record) => (
              <li key={record.id}>
                <span
                  className={`status ${
                    record.eventType === "REGISTERED"
                      ? "status--healthy"
                      : "status--degraded"
                  }`}
                >
                  {record.eventType.replaceAll("_", " ").toLowerCase()}
                </span>
                <div>
                  <strong>{formatDate(record.recordedAt)}</strong>
                  <small>
                    Current source {shortChecksum(record.currentSourceChecksum)}
                  </small>
                  {record.previousSourceChecksum ? (
                    <small>
                      Previous source{" "}
                      {shortChecksum(record.previousSourceChecksum)}
                    </small>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </ApplicationShell>
  );
}
