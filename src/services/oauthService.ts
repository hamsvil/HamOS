/* eslint-disable no-useless-assignment */
import { LoggerService } from './LoggerService';

const AUTH_PAGE_URL = 'https://ham-ai-studio.github.io/auth.html'; // Static GitHub Pages URL

export const oauthService = {
  async authenticate(provider: 'google' | 'github'): Promise<string> {
    return new Promise((resolve, reject) => {
      const authWindow = window.open(
        `${AUTH_PAGE_URL}?provider=${provider}`,
        'OAuth',
        'width=500,height=600'
      );

      if (!authWindow) {
        reject(new Error('Popup blocked. Please allow popups for this site.'));
        return;
      }

      const messageListener = (event: MessageEvent) => {
        // Ensure the message comes from our trusted auth page
        if (event.origin !== new URL(AUTH_PAGE_URL).origin) {
          return;
        }

        if (event.data && event.data.type === 'OAUTH_SUCCESS') {
          window.removeEventListener('message', messageListener);
          authWindow.close();
          resolve(event.data.token);
        } else if (event.data && event.data.type === 'OAUTH_ERROR') {
          window.removeEventListener('message', messageListener);
          authWindow.close();
          reject(new Error(event.data.error || 'OAuth failed'));
        }
      };

      window.addEventListener('message', messageListener);

      // Check if window was closed manually
      const checkClosed = setInterval(() => {
        if (authWindow.closed) {
          clearInterval(checkClosed);
          window.removeEventListener('message', messageListener);
          reject(new Error('OAuth window was closed by the user'));
        }
      }, 500);
    });
  }
};
