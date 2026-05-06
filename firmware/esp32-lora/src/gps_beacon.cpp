#if defined(LEP_GPS_BEACON) && LEP_GPS_BEACON && defined(LEP_HAS_ONBOARD_GPS)

#include <Arduino.h>
#include <cstring>
#include <gnss_nmea.h>
#include <gps_beacon.h>
#include <duty_cycle.h>
#include <lep_mesh.h>
#include <lep_v1.h>
#include <lora_config.h>
#include <lora_radio.h>

#ifndef LEP_GPS_BEACON_PERIOD_MS
#define LEP_GPS_BEACON_PERIOD_MS 30000u
#endif

#ifndef LEP_GPS_NMEA_LINE_MAX
#define LEP_GPS_NMEA_LINE_MAX 120
#endif

static HardwareSerial *gps_serial = nullptr;
static char nmea_buf[LEP_GPS_NMEA_LINE_MAX];
static size_t nmea_len = 0;
static uint32_t last_tx_ms = 0;
static uint32_t last_tx_ok_ms = 0;
static lep_full_hdr_t last_hdr {};
static bool have_fix = false;
static uint8_t device_id[8] = {0, 0, 0, 0, 0, 0, 0, 1};
static int gps_date_y = 0;
static int gps_date_m = 0;
static int gps_date_d = 0;
static bool have_gps_date = false;
static uint32_t last_rmc_utc = 0;
static uint32_t last_rmc_ms = 0;

#ifndef LEP_GPS_RMC_UNIX_MAX_AGE_MS
#define LEP_GPS_RMC_UNIX_MAX_AGE_MS 3000u
#endif

static void print_hex_line(const uint8_t *d, size_t len) {
  for (size_t i = 0; i < len; i++) {
    Serial.printf("%02X ", d[i]);
  }
  Serial.println();
}

static void fill_device_id(void) {
  const uint64_t mac = ESP.getEfuseMac();
  for (int i = 0; i < 6; i++) {
    device_id[i] = (uint8_t)(mac >> (i * 8));
  }
  device_id[6] = 0;
  device_id[7] = 1;
}

static bool build_and_send(const lep_full_hdr_t *hdr) {
  uint8_t full[96];
  const size_t n = lep_encode_full(full, sizeof(full), hdr, "");
  if (n == 0) {
    return false;
  }
  uint8_t mesh[128];
  const uint8_t hop = lep_mesh_initial_hop(hdr->flags);
  const size_t nm = lep_mesh_wrap(full, n, hop, mesh, sizeof(mesh));
  if (nm == 0) {
    return false;
  }
  const uint32_t now = millis();
  const uint32_t min_gap = duty_min_gap_ms(nm);
  if (last_tx_ok_ms != 0 && (uint32_t)(now - last_tx_ok_ms) < min_gap) {
    return false;
  }
  if (lora_send(mesh, nm)) {
    Serial.printf("GPS beacon TX ok (%u B mesh, hop=%u)\n", (unsigned)nm, (unsigned)hop);
    print_hex_line(mesh, nm);
    last_tx_ok_ms = now;
    return true;
  }
  Serial.println("GPS beacon TX failed");
  return false;
}

void gps_beacon_setup(void) {
  Serial.begin(115200);
  delay(300);
  fill_device_id();
  Serial.println("location-emitter: GPS → LEP mesh beacon (T-Beam onboard UART)");
  gps_serial = &Serial1;
  gps_serial->begin(GPS_UART_BAUD, SERIAL_8N1, GPS_UART_RX, GPS_UART_TX);
  nmea_len = 0;
  if (!lora_radio_ensure_init()) {
    Serial.println("LoRa init failed — check board env (SX1276 vs SX1262)");
  }
}

void gps_beacon_loop(void) {
  while (gps_serial->available() && nmea_len + 1 < sizeof(nmea_buf)) {
    const int c = gps_serial->read();
    if (c < 0) {
      break;
    }
    if (c == '\r') {
      continue;
    }
    if (c == '\n') {
      nmea_buf[nmea_len] = '\0';
      if (nmea_len > 0) {
        char wrk[LEP_GPS_NMEA_LINE_MAX];
        strncpy(wrk, nmea_buf, sizeof(wrk) - 1);
        wrk[sizeof(wrk) - 1] = '\0';
        gnss_rmc_nav_t rmc {};
        if (gnss_try_parse_rmc_nav(wrk, &rmc)) {
          gps_date_y = rmc.year;
          gps_date_m = rmc.month;
          gps_date_d = rmc.day;
          have_gps_date = true;
          last_rmc_utc = rmc.unix_utc;
          last_rmc_ms = millis();
        }
        strncpy(wrk, nmea_buf, sizeof(wrk) - 1);
        wrk[sizeof(wrk) - 1] = '\0';
        gnss_fix_t fix {};
        if (gnss_try_parse_gga(wrk, &fix)) {
          memset(&last_hdr, 0, sizeof(last_hdr));
          last_hdr.flags = LEP_FLAG_RELAY_ELIGIBLE;
          uint32_t ut = 0;
          const uint32_t age = (uint32_t)(millis() - last_rmc_ms);
          if (last_rmc_utc != 0 && age <= LEP_GPS_RMC_UNIX_MAX_AGE_MS) {
            ut = last_rmc_utc;
          } else if (fix.have_utc_time && have_gps_date) {
            ut = gnss_unix_from_utc_ymdhms(gps_date_y, gps_date_m, gps_date_d, fix.utc_h, fix.utc_m,
                                           fix.utc_s);
          }
          last_hdr.unix_time = ut != 0 ? ut : (uint32_t)(millis() / 1000u);
          last_hdr.lat_e7 = fix.lat_e7;
          last_hdr.lon_e7 = fix.lon_e7;
          last_hdr.alt_m = fix.alt_m;
          last_hdr.h_accuracy_m = 15;
          last_hdr.battery_pct = 255;
          memcpy(last_hdr.device_id, device_id, 8);
          have_fix = true;
          Serial.printf("GNSS fix lat=%.7f lon=%.7f alt=%d\n", fix.lat_e7 / 1e7, fix.lon_e7 / 1e7,
                        (int)fix.alt_m);
        }
      }
      nmea_len = 0;
    } else {
      nmea_buf[nmea_len++] = (char)c;
    }
  }

  const uint32_t now = millis();
  if (have_fix && (now - last_tx_ms >= LEP_GPS_BEACON_PERIOD_MS)) {
    last_tx_ms = now;
    build_and_send(&last_hdr);
  }
  lora_radio_sleep_hint();
  delay(5);
}

#else

#include <gps_beacon.h>

void gps_beacon_setup(void) {}
void gps_beacon_loop(void) {}

#endif
