variable "aws_region" {
  description = "AWS region for deployment"
  type        = string
  default     = "eu-central-1"
}

variable "environment" {
  description = "Deployment environment (e.g., dev, staging, prod)"
  type        = string
  default     = "staging"
}

variable "instance_type" {
  description = "EC2 instance type for the relay server"
  type        = string
  default     = "t3.micro"
}

variable "admin_ip" {
  description = "IP address allowed to SSH into the relay server (CIDR format)"
  type        = string
  default     = "0.0.0.0/0" # WARNING: Restrict this in production
}

# Database Configuration
variable "db_instance_class" {
  description = "RDS instance class (e.g., db.t3.micro, db.t3.small)"
  type        = string
  default     = "db.t3.micro"
}

variable "db_allocated_storage" {
  description = "Allocated storage for RDS in GB"
  type        = number
  default     = 20
}

variable "db_name" {
  description = "PostgreSQL database name"
  type        = string
  default     = "location_emitter"
  sensitive   = true
}

variable "db_username" {
  description = "PostgreSQL master username"
  type        = string
  default     = "postgres"
  sensitive   = true
}

variable "db_password" {
  description = "PostgreSQL master password (use AWS Secrets Manager in production)"
  type        = string
  sensitive   = true
  default     = "ChangeMe123!" # Change this!
}

