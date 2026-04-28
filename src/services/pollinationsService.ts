/* eslint-disable no-useless-assignment */
export const pollinationsService = {
  generateImageUrl(prompt: string, width: number = 512, height: number = 512): string {
    const encodedPrompt = encodeURIComponent(prompt);
    return `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&nologo=true`;
  },

  generateVideoUrl(prompt: string): string {
    // Pollinations video generation (if supported, otherwise fallback to image)
    const encodedPrompt = encodeURIComponent(prompt);
    return `https://image.pollinations.ai/prompt/${encodedPrompt}?video=true&nologo=true`;
  }
};
