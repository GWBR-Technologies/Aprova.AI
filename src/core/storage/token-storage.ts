import * as SecureStore from 'expo-secure-store';

export type StoredSession = {
  userId: string;
  refreshToken: string;
};

export type TokenStorage = {
  load(): Promise<StoredSession | null>;
  save(session: StoredSession): Promise<void>;
  clear(): Promise<void>;
};

const KEY = 'aprovaai.session';

// Só o refresh token (e o id do usuário, que o outbox usa) persiste; o token de acesso fica
// apenas em memória. WHEN_UNLOCKED_THIS_DEVICE_ONLY impede cópia para outro aparelho.
export const secureTokenStorage: TokenStorage = {
  async load() {
    const raw = await SecureStore.getItemAsync(KEY);
    if (!raw) return null;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        typeof (parsed as StoredSession).userId === 'string' &&
        typeof (parsed as StoredSession).refreshToken === 'string'
      ) {
        return parsed as StoredSession;
      }
    } catch {
      // Valor corrompido: tratado como ausência de sessão.
    }
    await SecureStore.deleteItemAsync(KEY);
    return null;
  },
  async save(session) {
    await SecureStore.setItemAsync(KEY, JSON.stringify(session), {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  },
  async clear() {
    await SecureStore.deleteItemAsync(KEY);
  },
};
