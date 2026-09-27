#!/bin/sh
set -eu

n8n import:workflow --input=/workflows/error-workflow.json
n8n import:workflow --input=/workflows/workflow.json
n8n publish:workflow --id=claims-intake-error
n8n publish:workflow --id=claims-intake-n8n
