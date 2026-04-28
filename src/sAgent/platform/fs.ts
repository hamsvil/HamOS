import fs from 'node:fs';
import path from 'node:path';

export const readFile = async (filePath: string): Promise<string> => {
  const fullPath = path.resolve(process.cwd(), filePath.startsWith('/') ? filePath.slice(1) : filePath);
  return fs.promises.readFile(fullPath, 'utf8');
};

export const writeFile = async (filePath: string, content: string): Promise<void> => {
  const fullPath = path.resolve(process.cwd(), filePath.startsWith('/') ? filePath.slice(1) : filePath);
  await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
  return fs.promises.writeFile(fullPath, content);
};

export const listFiles = async (dirPath: string): Promise<string[]> => {
  const fullPath = path.resolve(process.cwd(), dirPath.startsWith('/') ? dirPath.slice(1) : dirPath);
  if (!fs.existsSync(fullPath)) return [];
  return fs.promises.readdir(fullPath);
};

export const exists = async (filePath: string): Promise<boolean> => {
  const fullPath = path.resolve(process.cwd(), filePath.startsWith('/') ? filePath.slice(1) : filePath);
  return fs.existsSync(fullPath);
};

export const mkdir = async (dirPath: string): Promise<void> => {
  const fullPath = path.resolve(process.cwd(), dirPath.startsWith('/') ? dirPath.slice(1) : dirPath);
  await fs.promises.mkdir(fullPath, { recursive: true });
};
