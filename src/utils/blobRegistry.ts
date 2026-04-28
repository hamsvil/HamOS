/* eslint-disable no-useless-assignment */
const blobRegistry = new Set<string>();

export const registerBlobUrl = (url: string) => {
  blobRegistry.add(url);
};

export const revokeAllBlobUrls = () => {
  blobRegistry.forEach((url) => {
    URL.revokeObjectURL(url);
  });
  blobRegistry.clear();
};
