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
