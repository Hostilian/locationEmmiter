/** LEP v1 `flags` byte bitmask (see spec). Alias for clarity at API boundaries. */
export type LepFlags = number;

export type LocationEmitterPacketV1 = {
  version: 1;
  flags: LepFlags;
  unixTime: number;
  latE7: number;
  lonE7: number;
  altM: number;
  hAccuracyM: number;
  batteryPct: number;
  deviceId: Uint8Array; // length 8
  text: string;
};
