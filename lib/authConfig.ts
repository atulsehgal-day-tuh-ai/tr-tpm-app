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
  scopes: ['User.Read'],
};