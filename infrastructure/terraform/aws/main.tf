locals {
  name = "automation-control-plane-${var.environment}"
  tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
    Project     = "cross-platform-automation-control-plane"
  }
}

resource "aws_kms_key" "platform" {
  description             = "Encryption key for ${local.name} managed dependencies"
  deletion_window_in_days = 30
  enable_key_rotation     = true
}

resource "aws_kms_alias" "platform" {
  name          = "alias/${local.name}"
  target_key_id = aws_kms_key.platform.key_id
}

resource "aws_ecr_repository" "images" {
  for_each = toset([
    "api",
    "synthetic-api",
    "web",
  ])

  name                 = "${local.name}-${each.key}"
  image_tag_mutability = "IMMUTABLE"

  encryption_configuration {
    encryption_type = "KMS"
    kms_key         = aws_kms_key.platform.arn
  }

  image_scanning_configuration {
    scan_on_push = true
  }
}

resource "aws_ecr_lifecycle_policy" "images" {
  for_each = aws_ecr_repository.images

  repository = each.value.name
  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Retain the latest 30 release images"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["sha-", "v"]
          countType     = "imageCountMoreThan"
          countNumber   = 30
        }
        action = {
          type = "expire"
        }
      },
      {
        rulePriority = 2
        description  = "Remove untagged images after seven days"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 7
        }
        action = {
          type = "expire"
        }
      },
    ]
  })
}

resource "aws_db_subnet_group" "platform" {
  name       = local.name
  subnet_ids = var.database_subnet_ids
}

resource "aws_security_group" "database" {
  name        = "${local.name}-database"
  description = "PostgreSQL access from approved private Kubernetes networks"
  vpc_id      = var.vpc_id

  ingress {
    description = "PostgreSQL from Kubernetes workloads"
    protocol    = "tcp"
    from_port   = 5432
    to_port     = 5432
    cidr_blocks = var.database_client_cidr_blocks
  }
}

resource "aws_db_parameter_group" "platform" {
  name   = local.name
  family = "postgres17"

  parameter {
    name  = "rds.force_ssl"
    value = "1"
  }
}

resource "aws_db_instance" "platform" {
  identifier = local.name

  engine         = "postgres"
  engine_version = "17.6"
  instance_class = var.database_instance_class

  allocated_storage     = 20
  max_allocated_storage = 100
  storage_type          = "gp3"
  storage_encrypted     = true
  kms_key_id            = aws_kms_key.platform.arn

  db_name                       = "automation_control_plane"
  username                      = "automation_control_plane"
  manage_master_user_password   = true
  master_user_secret_kms_key_id = aws_kms_key.platform.arn

  db_subnet_group_name                = aws_db_subnet_group.platform.name
  enabled_cloudwatch_logs_exports     = ["postgresql", "upgrade"]
  iam_database_authentication_enabled = true
  parameter_group_name                = aws_db_parameter_group.platform.name
  publicly_accessible                 = false
  vpc_security_group_ids              = [aws_security_group.database.id]

  backup_retention_period               = var.database_backup_retention_days
  backup_window                         = "01:00-02:00"
  maintenance_window                    = "sun:03:00-sun:04:00"
  copy_tags_to_snapshot                 = true
  multi_az                              = var.database_multi_az
  performance_insights_enabled          = true
  performance_insights_kms_key_id       = aws_kms_key.platform.arn
  performance_insights_retention_period = 7

  auto_minor_version_upgrade = true
  deletion_protection        = true
  final_snapshot_identifier  = "${local.name}-final"
  skip_final_snapshot        = false

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_secretsmanager_secret" "runtime" {
  for_each = toset([
    "oidc-client",
    "session",
    "synthetic-callback",
    "telemetry-signing",
  ])

  name                    = "${local.name}/${each.key}"
  description             = "${each.key} runtime secret metadata for ${local.name}"
  kms_key_id              = aws_kms_key.platform.arn
  recovery_window_in_days = 30
}

resource "aws_cloudwatch_log_group" "workloads" {
  for_each = toset([
    "api",
    "synthetic-api",
    "web",
    "worker",
  ])

  name              = "/platform/${local.name}/${each.key}"
  retention_in_days = 30
  kms_key_id        = aws_kms_key.platform.arn
}
