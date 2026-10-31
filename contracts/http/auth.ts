export type AuthProvider = 'google' | 'apple';

export type LoginRequest = {
  provider: AuthProvider;
  idToken: string;
};

export type AuthTokens = {
  accessToken: string;
  accessTokenExpiresAt: string; // ISO 8601 em UTC
  refreshToken: string;
};

// O corpo de refresh e de logout não está detalhado nos guias; o formato abaixo
// é a premissa do app e precisa ser confirmado com o Back-End.
export type RefreshRequest = {
  refreshToken: string;
};

export type LogoutRequest = {
  refreshToken: string;
};
