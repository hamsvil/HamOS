export const readFile = async () => '';
export const writeFile = async () => {};
export const readdir = async () => [];
export const stat = async () => ({ isDirectory: () => false, isFile: () => true });
export default { readFile, writeFile, readdir, stat };
