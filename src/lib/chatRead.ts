import { NativeModules } from 'react-native';

type AsyncStorageModule = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
};

const memory: Record<string, string> = {};

function loadAsyncStorage(): AsyncStorageModule | null {
  if (!(NativeModules as Record<string, unknown>)?.RNCAsyncStorage) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('@react-native-async-storage/async-storage');
    return (mod?.default ?? mod) as AsyncStorageModule;
  } catch {
    return null;
  }
}

const asyncStorage = loadAsyncStorage();

function keyFor(orderId: string) {
  return `chat.lastRead.${orderId}`;
}

export async function getChatLastReadAt(orderId: string): Promise<number> {
  const key = keyFor(orderId);
  if (memory[key]) return Number(memory[key]) || 0;
  if (asyncStorage) {
    try {
      const raw = await asyncStorage.getItem(key);
      if (raw) {
        memory[key] = raw;
        return Number(raw) || 0;
      }
    } catch {
      /* ignore */
    }
  }
  return 0;
}

export async function markChatRead(orderId: string, at = Date.now()): Promise<void> {
  const key = keyFor(orderId);
  const value = String(at);
  memory[key] = value;
  if (asyncStorage) {
    try {
      await asyncStorage.setItem(key, value);
    } catch {
      /* ignore */
    }
  }
}

export function countUnreadMessages(
  messages: Array<{ senderId?: string; senderRole?: string; createdAt?: string }>,
  myUserId: string | null | undefined,
  lastReadAt: number,
): number {
  return messages.filter((m) => {
    const fromOther =
      (myUserId && m.senderId && m.senderId !== myUserId) ||
      (!myUserId && String(m.senderRole ?? '').toUpperCase() === 'CUSTOMER');
    if (!fromOther) return false;
    const created = m.createdAt ? new Date(m.createdAt).getTime() : 0;
    return !lastReadAt || created > lastReadAt;
  }).length;
}
