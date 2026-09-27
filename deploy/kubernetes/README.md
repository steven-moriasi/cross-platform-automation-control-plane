# Hardened Kubernetes target

This Kustomize base packages the web application, control-plane API and worker,
database migration job, and synthetic operations API. It is a reviewable target
for a Kubernetes 1.30+ cluster, not proof that a cluster has been provisioned.

```bash
kubectl kustomize deploy/kubernetes
kubectl apply --server-side --dry-run=server -k deploy/kubernetes
```

Before deployment:

1. replace the example hosts and OIDC URLs in `configuration.yaml`;
2. replace image tags with immutable release tags or digests;
3. provision TLS secrets referenced by the ingress resources;
4. create `control-plane-runtime` through the cluster's external-secret
   integration with these keys:
   - `database-url`;
   - `oidc-client-secret`;
   - `session-secret`;
   - `synthetic-callback-secret`;
   - `telemetry-signing-secret`;
5. ensure the `ingress-nginx`, `monitoring`, and platform namespaces carry the
   labels expected by the network policies;
6. run the migration job before rolling out the API and worker.

## Managed boundaries

The target deliberately does not deploy PostgreSQL, an identity provider, a
secret manager, TLS certificates, DNS, ingress controller, metrics server, or
the observability backend. Production deployments should consume managed or
independently operated versions of those dependencies. Standard Kubernetes
network policy cannot constrain egress by DNS name, so the broad 443 and 5432
egress rules must be narrowed with cloud firewall rules or a CNI that supports
FQDN policies.

The synthetic API is demonstration infrastructure. Remove it and its ingress
route from a real control-plane deployment that integrates actual business
systems.
