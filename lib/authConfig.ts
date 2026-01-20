import { Configuration, PopupRequest } from '@azure/msal-browser';

export function buildMsalConfig(params: {
  clientId: string;
  tenantId: string;
  redirectUri: string;
}): Configuration {
  return {
    auth: {
      clientId: params.clientId,
      authority: `https://login.microsoftonline.com/${params.tenantId}`,
      redirectUri: params.redirectUri,
    },
    cache: {
      cacheLocation: 'sessionStorage',
      storeAuthStateInCookie: false,
    },
  };
}

export const loginRequest: PopupRequest = {
  // We primarily rely on the ID token for app-to-app API authorization.
  // Graph scopes can be added later if needed (e.g., User.Read).
  scopes: ['openid', 'profile', 'email'],
};