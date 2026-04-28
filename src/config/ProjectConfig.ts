/* eslint-disable no-useless-assignment */
/**
 * Project Configuration & Mode Management
 * 
 * This file serves as the SINGLE SOURCE OF TRUTH for the application's operating mode.
 * It dictates whether the AI should generate code for a Web Application or a Native Android APK.
 * 
 * MODES:
 * - 'WEB': Standard Web Application (React/Vite)
 * - 'NATIVE_APK': Android Application (Java/Kotlin + WebView)
 * 
 * STRICT ENFORCEMENT:
 * The AI (Ham Engine) must strictly adhere to this configuration.
 */

import { GLOBAL_AI_CAPABILITIES } from './aiCapabilities';

import { safeStorage } from '../utils/storage';

export type ProjectMode = 'WEB' | 'NATIVE_APK';

interface ProjectConfig {
  mode: ProjectMode;
  targetPlatform: 'browser' | 'android';
  nativeBridgeAvailable: boolean;
}

// Detect if running inside the Native Android Wrapper
const isNativeEnvironment = typeof window !== 'undefined' && 
  ((window as any).Android || (window as any).AndroidBuilder);

export const projectConfig: ProjectConfig = {
  // USER SETTING: CHANGE THIS TO 'NATIVE_APK' TO FORCE ANDROID BUILDS
  mode: 'NATIVE_APK', 
  
  targetPlatform: isNativeEnvironment ? 'android' : 'browser',
  nativeBridgeAvailable: !!isNativeEnvironment,
};

export const getSystemInstructionModifier = (overrideMode?: ProjectMode): string => {
  let currentMode = projectConfig.mode;
  
  // Dynamic Override from LocalStorage (Browser Context)
  if (typeof window !== 'undefined') {
    const savedType = safeStorage.getItem('ham_project_type');
    if (savedType === 'apk') currentMode = 'NATIVE_APK';
    if (savedType === 'web') currentMode = 'WEB';
  }

  // Explicit Override
  if (overrideMode) currentMode = overrideMode;

  let baseInstruction = '';

  if (currentMode === 'NATIVE_APK') {
    baseInstruction = `
    [STRICT MODE: NATIVE ANDROID APK]
    You are building a NATIVE ANDROID APPLICATION.
    1. OUTPUT FORMAT: You must generate Java/Kotlin code for Android Studio, OR HTML/JS that runs inside a WebView with Native Interfaces.
    2. FORBIDDEN: Do not generate standard "React Web App" code unless it is specifically for the WebView UI.
    3. NATIVE FEATURES: You MUST utilize 'window.Android' or 'window.AndroidBuilder' for file access, shell execution, and compilation.
    4. FILE STRUCTURE: Your file paths must align with the Android project structure (e.g., 'android_project/app/src/main/java/...').
    `;
  } else {
    baseInstruction = `
  [MODE: WEB APPLICATION]
  You are building a Standard Web Application using React and Vite.
  `;
  }

  return `${baseInstruction}\n\n${GLOBAL_AI_CAPABILITIES}\n\n[HAM ENGINE CORE PROTOCOL ACTIVE: FILES 00-61 ENFORCED]`;
};
