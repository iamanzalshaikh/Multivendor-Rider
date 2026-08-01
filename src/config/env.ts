import Constants from 'expo-constants';
import { Platform } from 'react-native';

const isProduction = !__DEV__;

/** Render production backend — used for release APK / EAS builds */
export const BACKEND_URLS = {
  production: {
    base: 'https://zomato-backend-pt66.onrender.com',
    api: 'https://zomato-backend-pt66.onrender.com/api/v1',
    socket: 'https://zomato-backend-pt66.onrender.com',
  },
  /** Local: http://<YOUR_PC_LAN_IP>:5000 — set EXPO_PUBLIC_* in .env for dev */
  localPort: 5000,
} as const;

const PRODUCTION_API_URL = BACKEND_URLS.production.api;
const PRODUCTION_SOCKET_URL = BACKEND_URLS.production.socket;

const DEFAULT_BACKEND_PORT = BACKEND_URLS.localPort;
const FALLBACK_LAN_HOST = '192.168.1.102';
const ANDROID_EMULATOR_HOST =
  process.env.EXPO_PUBLIC_ANDROID_API_HOST?.trim() || FALLBACK_LAN_HOST;

function isAndroidEmulator(): boolean {
  if (Platform.OS !== 'android') return false;
  const constants = Platform.constants as { Model?: string; Manufacturer?: string; Fingerprint?: string };
  const model = String(constants?.Model ?? '');
  const manufacturer = String(constants?.Manufacturer ?? '');
  const fingerprint = String(constants?.Fingerprint ?? '');
  return (
    /sdk_gphone|emulator|simulator|generic/i.test(model) ||
    /generic|emulator/i.test(fingerprint) ||
    (manufacturer.toLowerCase() === 'google' && /sdk/i.test(model))
  );
}

function resolveDevHostFromExpo(): string | null {
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri && typeof hostUri === 'string') {
    const host = hostUri.split(':')[0]?.trim();
    if (
      host &&
      !host.endsWith('.exp.direct') &&
      !host.includes('ngrok') &&
      host !== 'localhost' &&
      host !== '127.0.0.1'
    ) {
      return host;
    }
  }

  const legacy = (Constants as { manifest?: { debuggerHost?: string } }).manifest?.debuggerHost;
  if (legacy && typeof legacy === 'string') {
    const host = legacy.split(':')[0]?.trim();
    if (
      host &&
      !host.endsWith('.exp.direct') &&
      !host.includes('ngrok') &&
      host !== 'localhost' &&
      host !== '127.0.0.1'
    ) {
      return host;
    }
  }

  return null;
}

function getDevApiUrl(): string {
  if (Platform.OS === 'android' && isAndroidEmulator()) {
    return `http://${ANDROID_EMULATOR_HOST}:${DEFAULT_BACKEND_PORT}/api/v1`;
  }
  const host = resolveDevHostFromExpo();
  if (Platform.OS === 'android') {
    if (host) return `http://${host}:${DEFAULT_BACKEND_PORT}/api/v1`;
    return `http://${FALLBACK_LAN_HOST}:${DEFAULT_BACKEND_PORT}/api/v1`;
  }
  if (host) return `http://${host}:${DEFAULT_BACKEND_PORT}/api/v1`;
  return `http://${FALLBACK_LAN_HOST}:${DEFAULT_BACKEND_PORT}/api/v1`;
}

function getDevSocketUrl(): string {
  if (Platform.OS === 'android' && isAndroidEmulator()) {
    return `http://${ANDROID_EMULATOR_HOST}:${DEFAULT_BACKEND_PORT}`;
  }
  const host = resolveDevHostFromExpo();
  if (Platform.OS === 'android') {
    if (host) return `http://${host}:${DEFAULT_BACKEND_PORT}`;
    return `http://${FALLBACK_LAN_HOST}:${DEFAULT_BACKEND_PORT}`;
  }
  if (host) return `http://${host}:${DEFAULT_BACKEND_PORT}`;
  return `http://${FALLBACK_LAN_HOST}:${DEFAULT_BACKEND_PORT}`;
}

export const getApiUrl = (): string => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) return envUrl;
  return isProduction ? PRODUCTION_API_URL : getDevApiUrl();
};

export const getSocketUrl = (): string => {
  const envUrl = process.env.EXPO_PUBLIC_SOCKET_URL;
  if (envUrl) return envUrl;
  return isProduction ? PRODUCTION_SOCKET_URL : getDevSocketUrl();
};

export const API_URL = getApiUrl();
export const SOCKET_URL = getSocketUrl();

export const ENV_INFO = {
  isProduction,
  isDevelopment: __DEV__,
  platform: Platform.OS,
  apiUrl: API_URL,
  socketUrl: SOCKET_URL,
};
