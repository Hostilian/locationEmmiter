#include "gnss_nmea.h"

#include <ctype.h>
#include <stdlib.h>
#include <string.h>

static bool is_leap_year(int y) {
  return (y % 4 == 0 && y % 100 != 0) || (y % 400 == 0);
}

static bool parse_hhmmss_field(const char *s, uint8_t *h, uint8_t *mi, uint8_t *sec) {
  if (!s || !s[0]) {
    return false;
  }
  size_t k = 0;
  while (s[k] && s[k] != '.' && k < 6) {
    if (!isdigit((unsigned char)s[k])) {
      return false;
    }
    k++;
  }
  if (k < 6) {
    return false;
  }
  *h = (uint8_t)((s[0] - '0') * 10 + (s[1] - '0'));
  *mi = (uint8_t)((s[2] - '0') * 10 + (s[3] - '0'));
  *sec = (uint8_t)((s[4] - '0') * 10 + (s[5] - '0'));
  if (*h > 23u || *mi > 59u || *sec > 59u) {
    return false;
  }
  return true;
}

/** ddmm.mmmmm or dddmm.mmmmm → decimal degrees → lat_e7 / lon_e7 */
static bool dm_to_e7(const char *dm, char hemi, int32_t *out_e7, int is_lat) {
  if (!dm || !dm[0] || (hemi != 'N' && hemi != 'S' && hemi != 'E' && hemi != 'W')) {
    return false;
  }
  const double v = strtod(dm, NULL);
  if (v <= 0 && dm[0] != '0') {
    return false;
  }
  const int deg = (int)(v / 100.0);
  const double min = v - (double)deg * 100.0;
  double dec = (double)deg + min / 60.0;
  if (hemi == 'S' || hemi == 'W') {
    dec = -dec;
  }
  if (is_lat) {
    if (dec < -90.0 || dec > 90.0) {
      return false;
    }
  } else {
    if (dec < -180.0 || dec > 180.0) {
      return false;
    }
  }
  *out_e7 = (int32_t)(dec * 1e7 + (dec >= 0 ? 0.5 : -0.5));
  return true;
}

bool gnss_try_parse_gga(char *line, gnss_fix_t *out) {
  memset(out, 0, sizeof(*out));
  if (!line || !out) {
    return false;
  }
  while (*line && isspace((unsigned char)*line)) {
    line++;
  }
  if (line[0] != '$' || strlen(line) < 8 || strncmp(line + 3, "GGA", 3) != 0) {
    return false;
  }

  char *tok = strtok(line, ",");
  int i = 0;
  char *f[16] = {0};
  while (tok && i < 16) {
    f[i++] = tok;
    tok = strtok(NULL, ",");
  }
  if (i < 10) {
    return false;
  }

  const int fix_q = (int)strtol(f[6], NULL, 10);
  if (fix_q <= 0) {
    return false;
  }

  out->have_utc_time = parse_hhmmss_field(f[1], &out->utc_h, &out->utc_m, &out->utc_s);

  const char lat_hemi = f[3][0];
  const char lon_hemi = f[5][0];
  if (!dm_to_e7(f[2], lat_hemi, &out->lat_e7, 1) || !dm_to_e7(f[4], lon_hemi, &out->lon_e7, 0)) {
    return false;
  }

  {
    const double al = strtod(f[9], NULL);
    out->alt_m = (int16_t)(al + (al >= 0 ? 0.5 : -0.5));
  }
  out->fix_q = fix_q;
  out->ok = true;
  return true;
}

uint32_t gnss_unix_from_utc_ymdhms(int year, int month, int day, int hour, int min, int sec) {
  static const uint8_t mdays[12] = {31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31};
  if (year < 1970 || year > 2099 || month < 1 || month > 12 || day < 1 || hour < 0 || hour > 23 || min < 0 ||
      min > 59 || sec < 0 || sec > 59) {
    return 0;
  }
  int dim = (int)mdays[month - 1];
  if (month == 2 && is_leap_year(year)) {
    dim = 29;
  }
  if (day > dim) {
    return 0;
  }

  uint64_t days = 0;
  for (int yy = 1970; yy < year; yy++) {
    days += is_leap_year(yy) ? 366ull : 365ull;
  }
  for (int mo = 1; mo < month; mo++) {
    int dm = (int)mdays[mo - 1];
    if (mo == 2 && is_leap_year(year)) {
      dm = 29;
    }
    days += (uint64_t)dm;
  }
  days += (uint64_t)(day - 1);
  return (uint32_t)(days * 86400ull + (uint64_t)hour * 3600ull + (uint64_t)min * 60ull + (uint64_t)sec);
}

bool gnss_try_parse_rmc_nav(char *line, gnss_rmc_nav_t *out) {
  if (!line || !out) {
    return false;
  }
  memset(out, 0, sizeof(*out));
  while (*line && isspace((unsigned char)*line)) {
    line++;
  }
  if (line[0] != '$' || strlen(line) < 8 || strncmp(line + 3, "RMC", 3) != 0) {
    return false;
  }

  char *tok = strtok(line, ",");
  int i = 0;
  char *f[12] = {0};
  while (tok && i < 12) {
    f[i++] = tok;
    tok = strtok(NULL, ",");
  }
  if (i < 10) {
    return false;
  }
  if (!f[2] || f[2][0] != 'A' || !f[9] || !f[9][0]) {
    return false;
  }
  uint8_t th = 0;
  uint8_t tm = 0;
  uint8_t ts = 0;
  if (!parse_hhmmss_field(f[1], &th, &tm, &ts)) {
    return false;
  }
  const char *date = f[9];
  if (!isdigit((unsigned char)date[0]) || !isdigit((unsigned char)date[1]) || !isdigit((unsigned char)date[2]) ||
      !isdigit((unsigned char)date[3]) || !isdigit((unsigned char)date[4]) || !isdigit((unsigned char)date[5])) {
    return false;
  }
  const int dd = (date[0] - '0') * 10 + (date[1] - '0');
  const int mm = (date[2] - '0') * 10 + (date[3] - '0');
  const int yy = (date[4] - '0') * 10 + (date[5] - '0');
  const int year = yy >= 80 ? 1900 + yy : 2000 + yy;
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) {
    return false;
  }
  const uint32_t u = gnss_unix_from_utc_ymdhms(year, mm, dd, (int)th, (int)tm, (int)ts);
  if (u == 0 && (year != 1970 || mm != 1 || dd != 1 || th != 0 || tm != 0 || ts != 0)) {
    return false;
  }
  out->unix_utc = u;
  out->year = year;
  out->month = mm;
  out->day = dd;
  return true;
}
