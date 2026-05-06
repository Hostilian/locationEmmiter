import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.locationemitter.peermap',
  appName: 'Location Emitter Map',
  webDir: 'dist',
  /**
   * Live reload (debug only): run `npm run dev -- --host` on your PC, set your LAN IP, then
   * `npm run cap:run` or `npx cap run android --livereload --external`.
   * Debug builds set `usesCleartextTraffic` (see android/app/src/debug/AndroidManifest.xml).
   */
  // server: { url: 'http://192.168.1.10:5173', cleartext: true },
};

export default config;
