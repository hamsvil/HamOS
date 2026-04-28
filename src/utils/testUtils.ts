/* eslint-disable no-useless-assignment */

/**
 * Simple test utility for unit testing functions.
 * @param name Name of the test
 * @param fn Test function
 */
export const test = (name: string, fn: () => void | Promise<void>) => {
  try {
    const result = fn();
    if (result instanceof Promise) {
      result.then(() => { /* console.log(`✅ ${name} passed`) */ }).catch((e) => console.error(`❌ ${name} failed:`, e));
    } else {
      // console.log(`✅ ${name} passed`);
    }
  } catch (e) {
    console.error(`❌ ${name} failed:`, e);
  }
};

/**
 * Assertion utility.
 * @param condition Condition to check
 * @param message Message to display if condition fails
 */
export const assert = (condition: boolean, message: string) => {
  if (!condition) {
    throw new Error(message);
  }
};
