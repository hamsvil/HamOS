/**
 * Native Bridge - No-op in Node.js platform
 */
export const nativeCall = async (method: string, args: any): Promise<any> => {
  console.log(`[Bridge] Method ${method} called with:`, args);
  return { status: 'unsupported_in_node' };
};
