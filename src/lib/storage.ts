/**
 * Token storage — SecureStore when native works, else AsyncStorage (Expo Go),
 * else in-memory fallback.
 *
 * Avoid dynamic import() for expo-secure-store — it causes Metro
 * "Requiring unknown module" errors on Android during startup.
 */

import { requireOptionalNativeModule } from 'expo-modules-core';
import { NativeModules } from 'react-native';

const ACCESS_TOKEN_KEY = 'auth.accessToken';
const REFRESH_TOKEN_KEY = 'auth.refreshToken';

let memory: Record<string, string | undefined> = {};

type SecureStoreModule = {
  getItemAsync: (key: string) => Promise<string | null>;
  setItemAsync: (key: string, value: string) => Promise<void>;
  deleteItemAsync: (key: string) => Promise<void>;
};

type AsyncStorageModule = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

function hasAsyncStorageNative(): boolean {
  return (
    typeof NativeModules === 'object' &&
    NativeModules != null &&
    (NativeModules as Record<string, unknown>).RNCAsyncStorage != null
  );
}

function loadAsyncStorage(): AsyncStorageModule | null {
  if (!hasAsyncStorageNative()) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('@react-native-async-storage/async-storage');
    return (mod?.default ?? mod) as AsyncStorageModule;
  } catch {
    return null;
  }
}

function loadSecureStore(): SecureStoreModule | null {
  if (requireOptionalNativeModule('ExpoSecureStore') == null) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-secure-store') as SecureStoreModule;
  } catch {
    return null;
  }
}

const asyncStorage = loadAsyncStorage();
const secureStore = loadSecureStore();

async function secureGet(key: string): Promise<string | null> {
  if (secureStore) {
    try {
      const value = await secureStore.getItemAsync(key);
      if (value) return value;
    } catch {
      // fall through to AsyncStorage
    }
  }
  if (asyncStorage) {
    try {
      const fromAsync = await asyncStorage.getItem(key);
      if (fromAsync) return fromAsync;
    } catch {
      // fall through to memory
    }
  }
  return memory[key] ?? null;
}

async function secureSet(key: string, value: string): Promise<void> {
  if (secureStore) {
    try {
      await secureStore.setItemAsync(key, value);
      memory[key] = value;
      return;
    } catch {
      // fall through
    }
  }
  if (asyncStorage) {
    try {
      await asyncStorage.setItem(key, value);
    } catch {
      // fall through
    }
  }
  memory[key] = value;
}

async function secureDelete(key: string): Promise<void> {
  if (secureStore) {
    try {
      await secureStore.deleteItemAsync(key);
    } catch {
      // fall through
    }
  }
  if (asyncStorage) {
    try {
      await asyncStorage.removeItem(key);
    } catch {
      // fall through
    }
  }
  delete memory[key];
}

export async function getAccessToken(): Promise<string | null> {
  if (memory[ACCESS_TOKEN_KEY]) return memory[ACCESS_TOKEN_KEY]!;
  const value = await secureGet(ACCESS_TOKEN_KEY);
  if (value) memory[ACCESS_TOKEN_KEY] = value;
  return value;
}

export async function getRefreshToken(): Promise<string | null> {
  if (memory[REFRESH_TOKEN_KEY]) return memory[REFRESH_TOKEN_KEY]!;
  const value = await secureGet(REFRESH_TOKEN_KEY);
  if (value) memory[REFRESH_TOKEN_KEY] = value;
  return value;
}

export async function setTokens(input: {
  accessToken: string;
  refreshToken: string;
}): Promise<void> {
  await Promise.all([
    secureSet(ACCESS_TOKEN_KEY, input.accessToken),
    secureSet(REFRESH_TOKEN_KEY, input.refreshToken),
  ]);
}

export async function clearTokens(): Promise<void> {
  await Promise.all([secureDelete(ACCESS_TOKEN_KEY), secureDelete(REFRESH_TOKEN_KEY)]);
  memory = {};
}
