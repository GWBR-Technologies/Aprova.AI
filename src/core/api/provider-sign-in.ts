import * as AppleAuthentication from 'expo-apple-authentication';
import { GoogleSignin, isCancelledResponse } from '@react-native-google-signin/google-signin';
import { Platform } from 'react-native';

// Identificador de cliente OAuth do Google: público por natureza (§5.4 do guia).
const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;

let googleConfigured = false;

export class SignInUnavailableError extends Error {
  constructor() {
    super('Login indisponível neste aparelho.');
    this.name = 'SignInUnavailableError';
  }
}

/** `null` quando o usuário cancela a tela do provedor. */
export async function getGoogleIdToken(): Promise<string | null> {
  if (!googleWebClientId) throw new SignInUnavailableError();
  if (!googleConfigured) {
    GoogleSignin.configure({ webClientId: googleWebClientId });
    googleConfigured = true;
  }
  const response = await GoogleSignin.signIn();
  if (isCancelledResponse(response)) return null;
  return response.data.idToken;
}

/** `null` quando o usuário cancela a tela do provedor. */
export async function getAppleIdToken(): Promise<string | null> {
  if (!(await isAppleSignInAvailable())) throw new SignInUnavailableError();
  try {
    const credential = await AppleAuthentication.signInAsync({ requestedScopes: [] });
    return credential.identityToken;
  } catch (error) {
    if ((error as { code?: string }).code === 'ERR_REQUEST_CANCELED') return null;
    throw error;
  }
}

/** A Apple só existe no iOS; no Android o botão não é exibido. */
export function isAppleSignInAvailable(): Promise<boolean> {
  return Platform.OS === 'ios' ? AppleAuthentication.isAvailableAsync() : Promise.resolve(false);
}
