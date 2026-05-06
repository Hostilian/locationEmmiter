#include <Arduino.h>
#include <lep_mesh.h>
#include <lep_v1.h>
#include <lora_radio.h>

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

void setup() {
  Serial.begin(115200);
  delay(300);
  Serial.println("location-emitter: LEP receiver (LRM1 + full decode) — match TX LoRa params in lora_config.h");

  if (!lora_radio_ensure_init()) {
    Serial.println("LoRa init failed");
  }
}

void loop() {
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

  lep_full_hdr_t hdr {};
  char text[40];
  if (!lep_decode_full(lep, lep_len, &hdr, text, sizeof(text))) {
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
}

#elif defined(LEP_GPS_BEACON) && LEP_GPS_BEACON

void setup() {
  gps_beacon_setup();
}

void loop() {
  gps_beacon_loop();
}

#else

#ifndef LEP_DEMO_TX
#define LEP_DEMO_TX 0
#endif

void setup() {
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
  Serial.print("Full LEP (");
  Serial.print(n);
  Serial.println(" bytes):");
  printHex(full, n);

  uint8_t mesh[128];
  const uint8_t hop = lep_mesh_initial_hop(hdr.flags);
  const size_t nm = lep_mesh_wrap(full, n, hop, mesh, sizeof(mesh));
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
#else
  Serial.println("Demo TX disabled (set -D LEP_DEMO_TX=1 to enable sample beacon output).");
#endif
}

void loop() {
  delay(10000);
}

#endif
