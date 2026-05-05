export type LocationEmitterPacketV1 = {
  version: 1;
  flags: number;
  unixTime: number;
  latE7: number;
  lonE7: number;
  altM: number;
  hAccuracyM: number;
  batteryPct: number;
  deviceId: Uint8Array; // length 8
  text: string;
};
