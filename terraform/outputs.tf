output "relay_server_public_ip" {
  description = "Public IP of the Cloud Mesh Relay Server"
  value       = aws_instance.mesh_relay.public_ip
}

output "mqtt_broker_endpoint" {
  description = "MQTT Connection Endpoint"
  value       = "mqtt://${aws_instance.mesh_relay.public_ip}:1883"
}

output "websocket_endpoint" {
  description = "WebSockets Connection Endpoint"
  value       = "ws://${aws_instance.mesh_relay.public_ip}:8080"
}
