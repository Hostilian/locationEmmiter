import { registerPlugin } from '@capacitor/core';
import { useAppStore } from '../store/useAppStore';

interface BackgroundGeolocationLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude?: number;
  speed?: number;
  bearing?: number;
  simulated?: boolean;
}

interface BackgroundGeolocationPlugin {
  addWatcher(
    options: {
      backgroundMessage?: string;
      backgroundTitle?: string;
      requestPermissions?: boolean;
      stale?: boolean;
      distanceFilter?: number;
    },
    callback: (location: BackgroundGeolocationLocation | null, error: unknown) => void
  ): Promise<string>;
  removeWatcher(options: { id: string }): Promise<void>;
}

// Get the plugin
const BackgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>('BackgroundGeolocation');

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}

export class BackgroundLocationService {
  private static watcherId: string | null = null;
  private static lastLocation: { lat: number, lng: number, time: number } | null = null;

  static async startTracking() {
    if (this.watcherId) return; // already tracking

    try {
      this.watcherId = await BackgroundGeolocation.addWatcher(
        {
          backgroundMessage: 'Location Emitter is actively transmitting your location to the mesh network.',
          backgroundTitle: 'Active SOS / Tracking',
          requestPermissions: true,
          stale: false,
          distanceFilter: 10, // Update every 10 meters
        },
        (location, error) => {
          if (error) {
            console.error('Background Geolocation Error:', error);
            return;
          }

          if (location) {
            const lat = location.latitude;
            const lng = location.longitude;
            const accuracy = location.accuracy;
            const now = Date.now();

            // Validation: Filter impossible GPS jumps
            if (this.lastLocation) {
              const distance = calculateDistance(this.lastLocation.lat, this.lastLocation.lng, lat, lng);
              const timeDiff = (now - this.lastLocation.time) / 1000; // seconds
              const speed = distance / timeDiff;

              if (speed > 500) { // > 500 m/s is likely an error
                console.warn(`[BackgroundLocation] Filtered impossible jump: ${speed.toFixed(1)} m/s`);
                return;
              }
            }
            
            this.lastLocation = { lat, lng, time: now };
            console.log(`[BackgroundLocation] New fix: ${lat}, ${lng} (acc: ${accuracy}m)`);
            
            // Signal validation: Warn if accuracy is poor (> 50m)
            useAppStore.getState().setWeakSignal(accuracy > 50);

            // In a real app, this is where we would invoke the BLE plugin
            // to send the updated coordinates to the ESP32 transmitter
            // e.g. BleClient.write(device, service, char, encodeFull(...))

            // Update local map center so the UI stays locked to the user
            useAppStore.getState().setMapCenter([lng, lat]);
          }
        }
      );
      console.log('Background location tracking started. Watcher ID:', this.watcherId);
    } catch (err) {
      console.error('Failed to start background tracking:', err);
    }
  }

  static async stopTracking() {
    if (this.watcherId) {
      await BackgroundGeolocation.removeWatcher({ id: this.watcherId });
      this.watcherId = null;
      console.log('Background location tracking stopped.');
    }
  }
}
