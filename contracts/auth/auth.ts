export type IdentityProvider = 'google' | 'apple';

export type LoginRequest = {
  provider: IdentityProvider;
  idToken: string;
};

export type RefreshRequest = {
  refreshToken: string;
};

export type LogoutRequest = {
  refreshToken: string;
};

export type AuthTokens = {
  accessToken: string;
  accessTokenExpiresAt: string; // ISO 8601 em UTC
  refreshToken: string;
};
