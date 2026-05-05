export const LEP_MAGIC = 0x4f45474c; // "LGEO" LE
export const LEP_VERSION = 1;

export const FLAG_SOS = 1 << 0;
export const FLAG_RELAY_ELIGIBLE = 1 << 1;
export const FLAG_ENCRYPTED = 1 << 2; // reserved for v2+

export const BATTERY_UNKNOWN = 255;

/** Full packet: fixed prefix before variable text */
export const LEP_PREFIX_LEN = 34;
export const LEP_TEXT_MAX = 32;

/** BLE short form (see spec) */
export const LEP_BLE_SHORT_LEN = 27;
