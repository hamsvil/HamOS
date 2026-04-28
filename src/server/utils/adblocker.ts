/* eslint-disable no-useless-assignment */
export const AD_DOMAINS = [
  'doubleclick.net',
  'google-analytics.com',
  'googletagmanager.com',
  'facebook.com/tr',
  'ads.google.com',
  'adservice.google.com',
  'analytics.google.com',
  'pagead2.googlesyndication.com',
  'ad.doubleclick.net',
  'track.adform.net',
  'pixel.facebook.com'
];

export const isBlocked = (url: string) => {
  return AD_DOMAINS.some(domain => url.includes(domain));
};
