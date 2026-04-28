import { Type, FunctionDeclaration } from '@google/genai';
import { HamToolName } from '../types';

export const QAVisionToolkit: FunctionDeclaration[] = [
  {
    name: HamToolName.LINT_APPLET,
    description: 'Run the linter to check for syntax errors and missing imports.',
    parameters: { type: Type.OBJECT, properties: {} }
  },
  {
    name: HamToolName.COMPILE_APPLET,
    description: 'Run the full compiler to ensure the application builds successfully.',
    parameters: { type: Type.OBJECT, properties: {} }
  },
  {
    name: HamToolName.CAPTURE_AND_ANALYZE_UI,
    description: 'Capture a screenshot of the running app and analyze its visual layout.',
    parameters: {
      type: Type.OBJECT,
      properties: { route: { type: Type.STRING } },
      required: ['route']
    }
  },
  {
    name: HamToolName.SIMULATE_USER_INTERACTION,
    description: 'Simulate user clicks and form inputs to test E2E business logic.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        route: { type: Type.STRING },
        actions: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ['route', 'actions']
    }
  },
  {
    name: HamToolName.EXECUTE_HTTP_REQUEST,
    description: 'Execute a raw HTTP request to test API endpoints.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        url: { type: Type.STRING },
        method: { type: Type.STRING },
        headers: { type: Type.OBJECT },
        body: { type: Type.STRING }
      },
      required: ['url', 'method']
    }
  },
  {
    name: HamToolName.ANALYZE_PERFORMANCE_METRICS,
    description: 'Analyze application performance.',
    parameters: { type: Type.OBJECT, properties: {} }
  },
  {
    name: HamToolName.RUN_SECURITY_PENETRATION,
    description: 'Run automated security scans.',
    parameters: { type: Type.OBJECT, properties: {} }
  }
];
