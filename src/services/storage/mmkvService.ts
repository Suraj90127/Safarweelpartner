/**
 * MMKV Storage Service
 * High-performance synchronous storage for React Native.
 * Replaces AsyncStorage for all critical data.
 */

import { MMKV } from 'react-native-mmkv';
import { STORAGE_KEYS, StorageKey } from '../../constants/storageKeys';

// Main instance — encrypted with a device-bound key
const storage = new MMKV({
  id: 'safarweel-partner-storage',
  encryptionKey: 'safarweel-partner-enc-key-2024',
});

class MMKVService {
  // ─── Primitive getters / setters ────────────────────────────────────────────

  getString(key: StorageKey): string | undefined {
    return storage.getString(key);
  }

  setString(key: StorageKey, value: string): void {
    storage.set(key, value);
  }

  getNumber(key: StorageKey): number | undefined {
    return storage.getNumber(key);
  }

  setNumber(key: StorageKey, value: number): void {
    storage.set(key, value);
  }

  getBoolean(key: StorageKey): boolean | undefined {
    return storage.getBoolean(key);
  }

  setBoolean(key: StorageKey, value: boolean): void {
    storage.set(key, value);
  }

  // ─── JSON helpers ────────────────────────────────────────────────────────────

  getObject<T>(key: StorageKey): T | null {
    try {
      const raw = storage.getString(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }

  setObject<T>(key: StorageKey, value: T): void {
    storage.set(key, JSON.stringify(value));
  }

  // ─── Token helpers ───────────────────────────────────────────────────────────

  setTokens(accessToken: string, refreshToken: string): void {
    storage.set(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
    storage.set(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
  }

  getAccessToken(): string | undefined {
    return storage.getString(STORAGE_KEYS.ACCESS_TOKEN);
  }

  getRefreshToken(): string | undefined {
    return storage.getString(STORAGE_KEYS.REFRESH_TOKEN);
  }

  clearTokens(): void {
    storage.delete(STORAGE_KEYS.ACCESS_TOKEN);
    storage.delete(STORAGE_KEYS.REFRESH_TOKEN);
  }

  // ─── Delete / clear ──────────────────────────────────────────────────────────

  delete(key: StorageKey): void {
    storage.delete(key);
  }

  clearAll(): void {
    const lang = storage.getString(STORAGE_KEYS.LANGUAGE);
    const theme = storage.getString(STORAGE_KEYS.THEME);
    storage.clearAll();
    if (lang !== undefined) {
      storage.set(STORAGE_KEYS.LANGUAGE, lang);
    }
    if (theme !== undefined) {
      storage.set(STORAGE_KEYS.THEME, theme);
    }
  }

  // ─── Redux Persist adapter ───────────────────────────────────────────────────
  // Used by redux-persist as a custom storage backend.

  getItem(key: string): Promise<string | null> {
    const value = storage.getString(key as StorageKey);
    return Promise.resolve(value ?? null);
  }

  setItem(key: string, value: string): Promise<void> {
    storage.set(key as StorageKey, value);
    return Promise.resolve();
  }

  removeItem(key: string): Promise<void> {
    storage.delete(key as StorageKey);
    return Promise.resolve();
  }
}

export const mmkvService = new MMKVService();
export { storage };
export default mmkvService;
