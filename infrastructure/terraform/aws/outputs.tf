output "database_endpoint" {
  description = "Private PostgreSQL endpoint consumed by the external-secret workflow."
  value       = aws_db_instance.platform.address
}

output "database_master_secret_arn" {
  description = "AWS-managed RDS master credential secret."
  value       = aws_db_instance.platform.master_user_secret[0].secret_arn
}

output "image_repository_urls" {
  description = "Immutable ECR repositories for release workflows."
  value       = { for name, repository in aws_ecr_repository.images : name => repository.repository_url }
}

output "runtime_secret_arns" {
  description = "Secret metadata populated by a separately authorized provisioning workflow."
  value       = { for name, secret in aws_secretsmanager_secret.runtime : name => secret.arn }
}
