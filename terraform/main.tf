terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  required_version = ">= 1.2.0"
}

provider "aws" {
  region = var.aws_region
}

# VPC and Networking
resource "aws_vpc" "mesh_vpc" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  tags = {
    Name        = "location-emitter-vpc"
    Environment = var.environment
    Project     = "location-emitter"
  }
}

resource "aws_internet_gateway" "gw" {
  vpc_id = aws_vpc.mesh_vpc.id
}

resource "aws_subnet" "public_subnet" {
  vpc_id                  = aws_vpc.mesh_vpc.id
  cidr_block              = "10.0.1.0/24"
  map_public_ip_on_launch = true
  availability_zone       = "${var.aws_region}a"
}

resource "aws_route_table" "public_rt" {
  vpc_id = aws_vpc.mesh_vpc.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.gw.id
  }
}

resource "aws_route_table_association" "public_rta" {
  subnet_id      = aws_subnet.public_subnet.id
  route_table_id = aws_route_table.public_rt.id
}

# Security Group for Cloud Relay Server
resource "aws_security_group" "relay_sg" {
  name        = "mesh-relay-sg"
  description = "Allow inbound traffic for mesh relay services (MQTT, WebSockets, HTTP)"
  vpc_id      = aws_vpc.mesh_vpc.id

  ingress {
    description = "HTTP (Dashboard)"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "MQTT (IoT Core/Broker)"
    from_port   = 1883
    to_port     = 1883
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "WebSockets"
    from_port   = 8080
    to_port     = 8080
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "SSH (Admin)"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.admin_ip]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# EC2 Instance: Cloud Mesh Relay Server
resource "aws_instance" "mesh_relay" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = var.instance_type
  subnet_id     = aws_subnet.public_subnet.id
  vpc_security_group_ids = [aws_security_group.relay_sg.id]

  user_data = <<-EOF
              #!/bin/bash
              apt-get update
              apt-get install -y docker.io docker-compose mosquitto mosquitto-clients nodejs npm
              systemctl enable docker
              systemctl start docker
              
              # Setup a basic Mosquitto config allowing anonymous for demo/thesis
              echo "allow_anonymous true" > /etc/mosquitto/conf.d/default.conf
              echo "listener 1883" >> /etc/mosquitto/conf.d/default.conf
              systemctl restart mosquitto
              
              # Ready for locationEmmiter backend deployment
              echo "Cloud Relay Bootstrap Complete"
              EOF

  tags = {
    Name        = "Mesh-Cloud-Relay-${var.environment}"
    Environment = var.environment
  }
}

data "aws_ami" "ubuntu" {
  most_recent = true
  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }
  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
  owners = ["099720109477"] # Canonical
}
