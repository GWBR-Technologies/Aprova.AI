import { createApiClient } from './client';
import { createSession } from './session';
import { secureTokenStorage } from '../storage/token-storage';

// EXPO_PUBLIC_* é embutida no bundle: só a URL pública da API entra aqui (§5.4 do guia).
const baseUrl = process.env.EXPO_PUBLIC_API_URL ?? '';

// O cliente é criado sob demanda para que a falta de configuração apareça na primeira chamada
// de rede, com mensagem clara, e não ao importar o módulo.
let authClient: ReturnType<typeof createApiClient> | null = null;
function auth() {
  authClient ??= createApiClient({
    baseUrl,
    getAccessToken: () => null,
    refreshAccessToken: async () => null,
  });
  return authClient;
}

export const session = createSession({
  postAuth: (path, body) => auth().post(path, body, { authenticated: false }),
  storage: secureTokenStorage,
});

let apiClient: ReturnType<typeof createApiClient> | null = null;
function api() {
  apiClient ??= createApiClient({
    baseUrl,
    getAccessToken: session.getAccessToken,
    refreshAccessToken: session.refresh,
  });
  return apiClient;
}

export function apiGet<T>(path: string) {
  return api().get<T>(path);
}

export function apiPost<T>(path: string, body?: unknown) {
  return api().post<T>(path, body);
}
