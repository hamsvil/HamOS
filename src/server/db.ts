/* eslint-disable no-useless-assignment */
import fs from 'fs';
import crypto from 'crypto';
import { DB_FILE, HAMLI_MEMORY_FILE, APP_STATUS_FILE } from './constants';

const SECRET_SALT = 'HAM_OS_QUANTUM_SALT_2026_V1';

function generateChecksum(installDate: number, isExpired: boolean): string {
  return crypto.createHash('sha256').update(`${installDate}:${isExpired}:${SECRET_SALT}`).digest('hex');
}

export interface Project {
  id: string;
  timestamp: number;
  name: string;
  data: any;
  chatHistory: any;
}

export interface AppStatus {
  installDate: number;
  isExpired: boolean;
  checksum?: string;
}

export interface HamliMemory {
  static: any[];
  dynamic: any[];
}

export async function getAppStatus(): Promise<AppStatus> {
  try {
    let installDate: number;

    if (fs.existsSync(APP_STATUS_FILE)) {
      try {
        const data = await fs.promises.readFile(APP_STATUS_FILE, 'utf-8');
        const existing: AppStatus = JSON.parse(data);
        installDate = existing.installDate || Date.now();
      } catch {
        installDate = Date.now();
      }
    } else {
      installDate = Date.now();
    }

    const status: AppStatus = {
      installDate,
      isExpired: false,
    };
    status.checksum = generateChecksum(status.installDate, false);
    await fs.promises.writeFile(APP_STATUS_FILE, JSON.stringify(status, null, 2));
    return status;
  } catch (e) {
    console.error('Error reading App Status:', e);
    return { installDate: Date.now(), isExpired: false };
  }
}

export async function readHamliMemory(): Promise<HamliMemory> {
  try {
    if (fs.existsSync(HAMLI_MEMORY_FILE)) {
      const data = await fs.promises.readFile(HAMLI_MEMORY_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Error reading Hamli Memory:', e);
  }
  return {
    static: [
      { id: 'core_1', type: 'identity', content: 'Saya adalah Hamli, asisten AI yang cerdas dan terus berkembang.', timestamp: Date.now() },
      { id: 'core_2', type: 'purpose', content: 'Tujuan saya adalah membantu pengguna dengan efisien dan belajar dari setiap interaksi.', timestamp: Date.now() }
    ],
    dynamic: []
  };
}

export async function writeHamliMemory(memory: HamliMemory) {
  await fs.promises.writeFile(HAMLI_MEMORY_FILE, JSON.stringify(memory, null, 2), 'utf-8');
}

export async function readDB(): Promise<Project[]> {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = await fs.promises.readFile(DB_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Error reading DB:', e);
  }
  return [];
}

export async function writeDB(projects: Project[]) {
  await fs.promises.writeFile(DB_FILE, JSON.stringify(projects, null, 2), 'utf-8');
}
