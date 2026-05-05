#ifndef GNSS_NMEA_H
#define GNSS_NMEA_H

#include <stdbool.h>
#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

typedef struct {
  int32_t lat_e7;
  int32_t lon_e7;
  int16_t alt_m;
  /** GGA fix quality: 1=GPS, 2=DGPS, etc. 0 = invalid */
  int fix_q;
  bool ok;
  /** UTC time-of-day from GGA field 1 (HHMMSS[.sss]); valid if have_utc_time */
  uint8_t utc_h;
  uint8_t utc_m;
  uint8_t utc_s;
  bool have_utc_time;
} gnss_fix_t;

/**
 * Parse a single NMEA line (mutable buffer; will be clobbered by strtok).
 * Supports `$xxGGA` (e.g. GPGGA, GNGGA, GAGGA). Returns true if fix_q > 0.
 * When true, may set have_utc_time from field 1 (GPS NMEA time is UTC).
 */
bool gnss_try_parse_gga(char *line, gnss_fix_t *out);

/**
 * `$xxRMC` with status **A**, valid UTC time (field 1) and date ddmmyy (field 9).
 * Fills calendar fields and **unix_utc**. Mutable buffer (strtok).
 */
typedef struct {
  uint32_t unix_utc;
  int year;
  int month;
  int day;
} gnss_rmc_nav_t;

bool gnss_try_parse_rmc_nav(char *line, gnss_rmc_nav_t *out);

/** Calendar UTC → unix seconds; returns 0 if out of range / invalid date. */
uint32_t gnss_unix_from_utc_ymdhms(int year, int month, int day, int hour, int min, int sec);

#ifdef __cplusplus
}
#endif

#endif
