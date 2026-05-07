/**
 * Terraform: RDS PostgreSQL Database for Location Emitter Todo Tracker
 * Provisioning a managed PostgreSQL instance with multi-AZ backup
 */

# RDS PostgreSQL Instance
resource "aws_db_instance" "location_emitter_db" {
  identifier              = "location-emitter-${var.environment}"
  engine                  = "postgres"
  engine_version          = "16.1"
  instance_class          = var.db_instance_class
  allocated_storage       = var.db_allocated_storage
  storage_type            = "gp3"
  storage_encrypted       = true
  deletion_protection     = var.environment == "production" ? true : false
  skip_final_snapshot     = var.environment != "production"
  final_snapshot_identifier = "location-emitter-${var.environment}-final-snapshot-${formatdate("YYYY-MM-DD-hhmm", timestamp())}"

  # Backup and HA
  backup_retention_period = var.environment == "production" ? 30 : 7
  backup_window           = "03:00-04:00"
  maintenance_window      = "sun:04:00-sun:05:00"
  multi_az                = var.environment == "production" ? true : false

  # Database Configuration
  db_name  = var.db_name
  username = var.db_username
  password = var.db_password # Use AWS Secrets Manager in production!

  # Network
  db_subnet_group_name   = aws_db_subnet_group.location_emitter.name
  publicly_accessible    = false
  vpc_security_group_ids = [aws_security_group.rds.id]

  # Monitoring
  monitoring_interval             = 60
  monitoring_role_arn             = aws_iam_role.rds_monitoring.arn
  enabled_cloudwatch_logs_exports = ["postgresql"]

  # Tags
  tags = {
    Name        = "location-emitter-db"
    Environment = var.environment
    Project     = "location-emitter"
  }

  depends_on = [
    aws_db_subnet_group.location_emitter,
    aws_security_group.rds,
  ]
}

# DB Subnet Group
resource "aws_db_subnet_group" "location_emitter" {
  name       = "location-emitter-${var.environment}"
  subnet_ids = aws_subnet.private[*].id

  tags = {
    Name        = "location-emitter-subnet-group"
    Environment = var.environment
    Project     = "location-emitter"
  }
}

# Security Group for RDS
resource "aws_security_group" "rds" {
  name        = "location-emitter-rds-${var.environment}"
  description = "Security group for Location Emitter RDS instance"
  vpc_id      = aws_vpc.mesh_vpc.id

  tags = {
    Name        = "location-emitter-rds-sg"
    Environment = var.environment
    Project     = "location-emitter"
  }
}

# Allow backend to access RDS
resource "aws_security_group_rule" "rds_from_backend" {
  type              = "ingress"
  from_port         = 5432
  to_port           = 5432
  protocol          = "tcp"
  cidr_blocks       = [aws_subnet.public_subnet.cidr_block]
  security_group_id = aws_security_group.rds.id
  description       = "Allow backend to access RDS"
}

# IAM Role for RDS Monitoring
resource "aws_iam_role" "rds_monitoring" {
  name = "location-emitter-rds-monitoring-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "monitoring.rds.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Environment = var.environment
    Project     = "location-emitter"
  }
}

resource "aws_iam_role_policy_attachment" "rds_monitoring_policy" {
  role       = aws_iam_role.rds_monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

# Outputs
output "rds_endpoint" {
  description = "RDS endpoint address"
  value       = aws_db_instance.location_emitter_db.endpoint
}

output "rds_address" {
  description = "RDS database address"
  value       = aws_db_instance.location_emitter_db.address
}

output "rds_port" {
  description = "RDS database port"
  value       = aws_db_instance.location_emitter_db.port
}

output "rds_database_name" {
  description = "RDS database name"
  value       = aws_db_instance.location_emitter_db.db_name
}

output "rds_master_username" {
  description = "RDS master username"
  value       = aws_db_instance.location_emitter_db.username
  sensitive   = true
}

# Private Subnets for RDS (if not already defined)
resource "aws_subnet" "private" {
  count             = 2
  vpc_id            = aws_vpc.mesh_vpc.id
  cidr_block        = "10.0.${count.index + 2}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name        = "location-emitter-private-${count.index + 1}"
    Environment = var.environment
    Project     = "location-emitter"
  }
}

# Data source for availability zones
data "aws_availability_zones" "available" {
  state = "available"
}
