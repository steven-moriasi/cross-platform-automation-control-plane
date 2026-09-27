variable "aws_region" {
  description = "AWS region for the managed control-plane dependencies."
  type        = string
}

variable "environment" {
  description = "Deployment environment name."
  type        = string

  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "environment must be staging or production."
  }
}

variable "vpc_id" {
  description = "Existing VPC used by the Kubernetes cluster and database."
  type        = string
}

variable "database_subnet_ids" {
  description = "Private subnet IDs spanning at least two availability zones."
  type        = list(string)

  validation {
    condition     = length(var.database_subnet_ids) >= 2
    error_message = "At least two database subnets are required."
  }
}

variable "database_client_cidr_blocks" {
  description = "Private Kubernetes node or pod CIDRs allowed to reach PostgreSQL."
  type        = list(string)

  validation {
    condition     = length(var.database_client_cidr_blocks) > 0
    error_message = "At least one private client CIDR is required."
  }
}

variable "database_instance_class" {
  description = "RDS instance class."
  type        = string
  default     = "db.t4g.small"
}

variable "database_multi_az" {
  description = "Whether RDS uses a synchronous standby in another availability zone."
  type        = bool
  default     = true
}

variable "database_backup_retention_days" {
  description = "Automated RDS backup retention."
  type        = number
  default     = 14

  validation {
    condition     = var.database_backup_retention_days >= 7 && var.database_backup_retention_days <= 35
    error_message = "Backup retention must be between 7 and 35 days."
  }
}
