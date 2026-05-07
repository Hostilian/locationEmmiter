#include "ota.h"
#include <Arduino.h>

#if defined(ESP32)
#include <WiFi.h>
#include <ESPmDNS.h>
#include <WiFiUdp.h>
#include <ArduinoOTA.h>

static bool ota_initialized = false;

void ota_setup(const char* ssid, const char* password) {
  if (ssid == nullptr || strlen(ssid) == 0) {
    Serial.println("OTA: No WiFi credentials provided, skipping OTA setup.");
    return;
  }

  Serial.printf("OTA: Connecting to WiFi: %s\n", ssid);
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  // Wait up to 10 seconds for connection
  uint32_t start_time = millis();
  while (WiFi.waitForConnectResult() != WL_CONNECTED) {
    if (millis() - start_time > 10000) {
      Serial.println("OTA: WiFi Connection Failed! OTA will not be available.");
      return;
    }
    delay(500);
  }

  Serial.println("OTA: WiFi Connected.");
  Serial.print("OTA: IP address: ");
  Serial.println(WiFi.localIP());

  // Set OTA Port
  ArduinoOTA.setPort(3232);
  
  // Set Hostname
  ArduinoOTA.setHostname("location-emitter-node");

  // Authentication
  // ArduinoOTA.setPassword("admin");

  ArduinoOTA
    .onStart([]() {
      String type;
      if (ArduinoOTA.getCommand() == U_FLASH)
        type = "sketch";
      else // U_SPIFFS
        type = "filesystem";

      // NOTE: if updating SPIFFS this would be the place to unmount SPIFFS using SPIFFS.end()
      Serial.println("OTA: Start updating " + type);
    })
    .onEnd([]() {
      Serial.println("\nOTA: End");
    })
    .onProgress([](unsigned int progress, unsigned int total) {
      Serial.printf("OTA: Progress: %u%%\r", (progress / (total / 100)));
    })
    .onError([](ota_error_t error) {
      Serial.printf("OTA: Error[%u]: ", error);
      if (error == OTA_AUTH_ERROR) Serial.println("Auth Failed");
      else if (error == OTA_BEGIN_ERROR) Serial.println("Begin Failed");
      else if (error == OTA_CONNECT_ERROR) Serial.println("Connect Failed");
      else if (error == OTA_RECEIVE_ERROR) Serial.println("Receive Failed");
      else if (error == OTA_END_ERROR) Serial.println("End Failed");
    });

  ArduinoOTA.begin();
  ota_initialized = true;
  Serial.println("OTA: Ready");
}

void ota_loop() {
  if (ota_initialized) {
    ArduinoOTA.handle();
  }
}

#else

// Mock for non-ESP32 platforms
void ota_setup(const char* ssid, const char* password) {}
void ota_loop() {}

#endif
