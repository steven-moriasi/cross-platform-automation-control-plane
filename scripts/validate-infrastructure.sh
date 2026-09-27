#!/usr/bin/env bash
set -euo pipefail

repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repository_root"

docker run --rm \
  --volume "$repository_root:/workspace" \
  --workdir /workspace \
  registry.k8s.io/kubectl:v1.34.1 \
  kustomize deploy/kubernetes >/dev/null

docker run --rm \
  --volume "$repository_root:/workspace" \
  --workdir /workspace/infrastructure/terraform/aws \
  hashicorp/terraform:1.13.3 \
  fmt -check

docker run --rm \
  --volume "$repository_root:/workspace" \
  --workdir /workspace/infrastructure/terraform/aws \
  hashicorp/terraform:1.13.3 \
  init -backend=false -input=false

docker run --rm \
  --volume "$repository_root:/workspace" \
  --workdir /workspace/infrastructure/terraform/aws \
  hashicorp/terraform:1.13.3 \
  validate
