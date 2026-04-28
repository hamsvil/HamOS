export const getEnv = (name: string): string | undefined => {
  // Try Node process.env first
  if (typeof process !== 'undefined' && process.env) {
    return process.env[name];
  }
  return undefined;
};
