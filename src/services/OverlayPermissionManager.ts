import { NativeModules, Platform } from 'react-native';

const { OverlayPermissionManager: NativeOverlayManager } = NativeModules;

export interface DeviceBrandInfo {
  brand: string;
  manufacturer: string;
  isXiaomi: boolean;
  isOppo: boolean;
  isVivo: boolean;
  isSamsung: boolean;
}

class OverlayPermissionManager {
  /**
   * Checks if overlay permission (SYSTEM_ALERT_WINDOW) is granted.
   */
  async checkPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;
    try {
      return await NativeOverlayManager.isGranted();
    } catch (e) {
      console.error('[OverlayPermissionManager] checkPermission error:', e);
      return false;
    }
  }

  /**
   * Alias for checkPermission to align with the required APIs.
   */
  async isGranted(): Promise<boolean> {
    return this.checkPermission();
  }

  /**
   * Requests overlay permission by navigating the user to the system overlay settings screen.
   */
  async requestPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;
    try {
      return await NativeOverlayManager.requestPermission();
    } catch (e) {
      console.error('[OverlayPermissionManager] requestPermission error:', e);
      return false;
    }
  }

  /**
   * Opens the App Info settings screen directly.
   * Useful for guiding users to bypass "Restricted Settings" via the 3-dots menu.
   */
  async openSettings(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;
    try {
      return await NativeOverlayManager.openSettings();
    } catch (e) {
      console.error('[OverlayPermissionManager] openSettings error:', e);
      return false;
    }
  }

  /**
   * Returns details about the device manufacturer and brand.
   */
  async getDeviceBrand(): Promise<DeviceBrandInfo> {
    if (Platform.OS !== 'android') {
      return {
        brand: 'ios',
        manufacturer: 'apple',
        isXiaomi: false,
        isOppo: false,
        isVivo: false,
        isSamsung: false,
      };
    }
    try {
      return await NativeOverlayManager.getDeviceBrand();
    } catch (e) {
      console.error('[OverlayPermissionManager] getDeviceBrand error:', e);
      return {
        brand: 'unknown',
        manufacturer: 'unknown',
        isXiaomi: false,
        isOppo: false,
        isVivo: false,
        isSamsung: false,
      };
    }
  }

  /**
   * Opens OEM-specific permissions screen (e.g. Xiaomi's background pop-up permission).
   * Falls back to standard App Info settings if OEM intent fails.
   */
  async openOemSettings(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;
    try {
      return await NativeOverlayManager.openOemSettings();
    } catch (e) {
      console.error('[OverlayPermissionManager] openOemSettings error:', e);
      return false;
    }
  }
}

export default new OverlayPermissionManager();
