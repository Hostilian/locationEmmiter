#include <Arduino.h>
#include <lep_mesh.h>
#include <lep_v1.h>
#include <lep_v2.h>
#include <lep_relay.h>
#include <lora_radio.h>
#include "ota.h"
#include "ble_manager.h"
#include <esp_task_wdt.h>

#define WDT_TIMEOUT_SECONDS 15

#if defined(LEP_RECEIVER) && LEP_RECEIVER
#include <lep_decode.h>
#endif
#if defined(LEP_GPS_BEACON) && LEP_GPS_BEACON
#include <gps_beacon.h>
#endif

namespace {

void printHex(const uint8_t *data, size_t len) {
  for (size_t i = 0; i < len; i++) {
    Serial.printf("%02X ", data[i]);
  }
  Serial.println();
}

void fill_demo_device_id(uint8_t out[8]) {
  const uint64_t mac = ESP.getEfuseMac();
  for (int i = 0; i < 8; i++) {
    out[i] = (uint8_t)(mac >> (i * 8));
  }
}

} // namespace

#if defined(LEP_RECEIVER) && LEP_RECEIVER

static lep_relay_state_t g_relay_state;

void setup() {
  Serial.begin(115200);
  delay(300);
  Serial.println("location-emitter: LEP receiver (LRM1 + full decode) — match TX LoRa params in lora_config.h");

  lep_relay_init(&g_relay_state);

  if (!lora_radio_ensure_init()) {
    Serial.println("LoRa init failed");
  }
  
  // Initialize Watchdog Timer
  esp_task_wdt_init(WDT_TIMEOUT_SECONDS, true);
  esp_task_wdt_add(NULL);
  
  // Set up OTA update over WiFi (Demo credentials for now)
  ota_setup("YOUR_WIFI_SSID", "YOUR_WIFI_PASSWORD");
}

void loop() {
  esp_task_wdt_reset();
  ota_loop();
  
  uint8_t buf[256];
  size_t n = 0;
  if (!lora_try_receive(buf, sizeof(buf), &n) || n < LEP_MESH_HEADER_LEN + 36) {
    delay(5);
    return;
  }

  uint8_t hop = 0;
  uint8_t res = 0;
  const uint8_t *lep = nullptr;
  size_t lep_len = 0;
  if (!lep_mesh_unwrap(buf, n, &hop, &res, &lep, &lep_len)) {
    Serial.println("Not LRM1 mesh frame");
    printHex(buf, n);
    delay(50);
    return;
  }

  uint8_t static_key[32] = { 
    0x01,0x23,0x45,0x67,0x89,0xAB,0xCD,0xEF,0x01,0x23,0x45,0x67,0x89,0xAB,0xCD,0xEF,
    0x01,0x23,0x45,0x67,0x89,0xAB,0xCD,0xEF,0x01,0x23,0x45,0x67,0x89,0xAB,0xCD,0xEF 
  };
  
  // Try to decrypt if it's v2
  uint8_t decrypted[256];
  const uint8_t *payload_to_decode = lep;
  size_t payload_len_to_decode = lep_len;
  
  if (lep_len > 8 && lep[4] == LEP_VERSION_2) {
    size_t dec_len = lep_v2_decrypt(decrypted, sizeof(decrypted), lep, lep_len, static_key);
    if (dec_len == 0) {
      Serial.println("LEP v2 decrypt failed (invalid MAC or key)");
      delay(50);
      return;
    }
    payload_to_decode = decrypted;
    payload_len_to_decode = dec_len;
  }

  lep_full_hdr_t hdr {};
  char text[40];
  if (!lep_decode_full(payload_to_decode, payload_len_to_decode, &hdr, text, sizeof(text))) {
    Serial.println("LEP decode failed (CRC/length)");
    printHex(buf, n);
    delay(50);
    return;
  }

  const double lat = hdr.lat_e7 / 1e7;
  const double lon = hdr.lon_e7 / 1e7;
  Serial.printf("RX hop=%u unix=%lu lat=%.7f lon=%.7f alt=%d acc=%u bat=%u flags=0x%02x text=\"%s\"\n", hop,
                (unsigned long)hdr.unix_time, lat, lon, (int)hdr.alt_m, (unsigned)hdr.h_accuracy_m,
                (unsigned)hdr.battery_pct, (unsigned)hdr.flags, text);
  printHex(buf, n);

  // Relay logic
  uint8_t new_hop = 0;
  bool is_duplicate = false;
  if (lep_relay_process(&g_relay_state, lep, lep_len, hop, &new_hop, &is_duplicate)) {
    uint8_t relay_buf[256];
    size_t relay_len = lep_mesh_wrap(lep, lep_len, new_hop, relay_buf, sizeof(relay_buf));
    if (relay_len > 0) {
      // Jittered relay to avoid collisions
      delay(random(50, 500));
      if (lora_send(relay_buf, relay_len)) {
        Serial.printf("RELAYED: hop %u -> %u\n", hop, new_hop);
      }
    }
  } else if (is_duplicate) {
    Serial.println("Dropped: Duplicate packet");
  }
}

#elif defined(LEP_GPS_BEACON) && LEP_GPS_BEACON

void setup() {
  esp_task_wdt_init(WDT_TIMEOUT_SECONDS, true);
  esp_task_wdt_add(NULL);
  
  gps_beacon_setup();
  ota_setup("YOUR_WIFI_SSID", "YOUR_WIFI_PASSWORD");
}

void loop() {
  esp_task_wdt_reset();
  ota_loop();
  gps_beacon_loop();
}

#else

#ifndef LEP_DEMO_TX
#define LEP_DEMO_TX 0
#endif

void setup() {
  esp_task_wdt_init(WDT_TIMEOUT_SECONDS, true);
  esp_task_wdt_add(NULL);
  
  Serial.begin(115200);
  delay(500);
  Serial.println("location-emitter: LEP v1 + mesh wrapper (LoRa optional — env esp32dev_lora / tbeam_lora)");
#if LEP_DEMO_TX
  lep_full_hdr_t hdr{};
  hdr.flags = static_cast<uint8_t>(LEP_FLAG_SOS | LEP_FLAG_RELAY_ELIGIBLE);
  hdr.unix_time = 1700000000ul;
  hdr.lat_e7 = 488583700;
  hdr.lon_e7 = 22948100;
  hdr.alt_m = 35;
  hdr.h_accuracy_m = 12;
  hdr.battery_pct = 87;
  uint8_t did[8];
  fill_demo_device_id(did);
  memcpy(hdr.device_id, did, sizeof(did));

  uint8_t full[80];
  const size_t n = lep_encode_full(full, sizeof(full), &hdr, "SOS");
  if (n == 0) {
    Serial.println("lep_encode_full failed");
    return;
  }
  Serial.print("Full LEP v1 (");
  Serial.print(n);
  Serial.println(" bytes):");
  printHex(full, n);

  // v2 Encryption Phase
  uint8_t static_key[32] = { 
    0x01,0x23,0x45,0x67,0x89,0xAB,0xCD,0xEF,0x01,0x23,0x45,0x67,0x89,0xAB,0xCD,0xEF,
    0x01,0x23,0x45,0x67,0x89,0xAB,0xCD,0xEF,0x01,0x23,0x45,0x67,0x89,0xAB,0xCD,0xEF 
  };
  
  uint8_t full_v2[128];
  const size_t n_v2 = lep_v2_encrypt(full_v2, sizeof(full_v2), full, n, static_key);
  if (n_v2 == 0) {
    Serial.println("lep_v2_encrypt failed");
    return;
  }
  
  Serial.print("Encrypted LEP v2 (");
  Serial.print(n_v2);
  Serial.println(" bytes):");
  printHex(full_v2, n_v2);

  uint8_t mesh[256];
  const uint8_t hop = lep_mesh_initial_hop(hdr.flags);
  // Wrap the encrypted v2 payload
  const size_t nm = lep_mesh_wrap(full_v2, n_v2, hop, mesh, sizeof(mesh));
  if (nm == 0) {
    Serial.println("lep_mesh_wrap failed");
    return;
  }
  Serial.print("Mesh LoRa frame (");
  Serial.print(nm);
  Serial.print(" bytes), hop=");
  Serial.println(hop);
  printHex(mesh, nm);

  if (lora_send(mesh, nm)) {
    Serial.println("LoRa TX reported success");
  } else {
    Serial.println("LoRa TX not available or failed (use lora env + wiring)");
  }

  ble_manager_setup(did);

  uint8_t ble[32];
  const size_t nb = lep_encode_ble_short(ble, sizeof(ble), &hdr);
  if (nb == 0) {
    Serial.println("lep_encode_ble_short failed");
    return;
  }
  Serial.print("BLE short (");
  Serial.print(nb);
  Serial.println(" bytes):");
  printHex(ble, nb);
  
  ble_manager_update_payload(ble, nb);
#else
  Serial.println("Demo TX disabled (set -D LEP_DEMO_TX=1 to enable sample beacon output).");
#endif
  
  ota_setup("YOUR_WIFI_SSID", "YOUR_WIFI_PASSWORD");
}

void loop() {
  esp_task_wdt_reset();
  ota_loop();
  delay(10000);
}

#endif
