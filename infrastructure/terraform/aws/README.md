# AWS managed-dependency target

This Terraform root defines the managed dependencies consumed by a Kubernetes
deployment:

- a private, encrypted, Multi-AZ PostgreSQL 17 database with managed master
  credentials, forced TLS, backups, deletion protection, and final snapshots;
- immutable, encrypted ECR repositories with scanning and retention policies;
- KMS-encrypted Secrets Manager metadata for application secrets;
- encrypted workload log groups.

It intentionally consumes an existing VPC, private subnets, Kubernetes cluster,
DNS zone, OIDC provider, ingress, certificate management, secret
synchronization, and observability platform. Those systems have
organization-specific ownership and are explicit inputs or deployment
prerequisites rather than hidden mock resources.

Terraform creates secret metadata but no application secret values. A separate,
least-privilege provisioning workflow must populate and rotate the secrets
without placing their values in Terraform state.

```bash
terraform init -backend=false
terraform fmt -check -recursive
terraform validate
```

Validation proves that the definitions are internally valid. It does not prove
an AWS plan or apply, because no cloud credentials or target account are
required for repository verification.
