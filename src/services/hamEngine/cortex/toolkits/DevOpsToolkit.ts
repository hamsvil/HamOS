import { Type, FunctionDeclaration } from '@google/genai';
import { HamToolName } from '../types';

export const DevOpsToolkit: FunctionDeclaration[] = [
  {
    name: HamToolName.INSTALL_APPLET_PACKAGE,
    description: 'Install a new NPM package.',
    parameters: {
      type: Type.OBJECT,
      properties: { packages: { type: Type.ARRAY, items: { type: Type.STRING } } },
      required: ['packages']
    }
  },
  {
    name: HamToolName.SET_UP_FIREBASE,
    description: 'Provision Firebase backend automatically.',
    parameters: { type: Type.OBJECT, properties: {} }
  },
  {
    name: HamToolName.DEPLOY_FIREBASE,
    description: 'Deploy Firestore rules to the live project.',
    parameters: { type: Type.OBJECT, properties: {} }
  },
  {
    name: HamToolName.RESTART_DEV_SERVER,
    description: 'Restart the Node.js development server.',
    parameters: { type: Type.OBJECT, properties: {} }
  },
  {
    name: HamToolName.INSTALL_APPLET_DEPENDENCIES,
    description: 'Install all dependencies from package.json.',
    parameters: { type: Type.OBJECT, properties: {} }
  },
  {
    name: HamToolName.PROVISION_CLOUD_INFRASTRUCTURE,
    description: 'Provision cloud resources.',
    parameters: { type: Type.OBJECT, properties: {} }
  },
  {
    name: HamToolName.MANAGE_VERSION_CONTROL,
    description: 'Execute Git commands to manage state.',
    parameters: {
      type: Type.OBJECT,
      properties: { command: { type: Type.STRING } },
      required: ['command']
    }
  }
];
