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

export class BackgroundLocationService {
  private static watcherId: string | null = null;

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
            
            console.log(`[BackgroundLocation] New fix: ${lat}, ${lng} (acc: ${accuracy}m)`);
            
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
