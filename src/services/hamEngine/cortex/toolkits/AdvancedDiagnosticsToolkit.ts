import { Type, FunctionDeclaration } from '@google/genai';
import { HamToolName } from '../types';

export const AdvancedDiagnosticsToolkit: FunctionDeclaration[] = [
  {
    name: HamToolName.DIAGNOSE_NETWORK_CONNECTIVITY,
    description: 'Diagnose network connectivity issues.',
    parameters: {
      type: Type.OBJECT,
      properties: { target_host: { type: Type.STRING } },
      required: ['target_host']
    }
  },
  {
    name: HamToolName.RESET_NETWORK_INTERFACE,
    description: 'Reset network interface.',
    parameters: { type: Type.OBJECT, properties: {} }
  },
  {
    name: HamToolName.CHECK_CLOUD_SHELL_STATUS,
    description: 'Check Cloud Shell status.',
    parameters: { type: Type.OBJECT, properties: {} }
  },
  {
    name: HamToolName.CHECK_VFS_INTEGRITY,
    description: 'Check VFS integrity.',
    parameters: {
      type: Type.OBJECT,
      properties: { path: { type: Type.STRING } }
    }
  },
  {
    name: HamToolName.RECONCILE_VFS_ENTRY,
    description: 'Reconcile VFS entry.',
    parameters: {
      type: Type.OBJECT,
      properties: { path: { type: Type.STRING } },
      required: ['path']
    }
  },
  {
    name: HamToolName.FORCE_DELETE_FILE,
    description: 'Force delete file from VFS.',
    parameters: {
      type: Type.OBJECT,
      properties: { path: { type: Type.STRING } },
      required: ['path']
    }
  },
  {
    name: HamToolName.CLEAR_VFS_CACHE,
    description: 'Clear VFS cache.',
    parameters: { type: Type.OBJECT, properties: {} }
  },
  {
    name: HamToolName.VIEW_SYSTEM_LOGS,
    description: 'View system logs.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        component: { type: Type.STRING },
        num_lines: { type: Type.INTEGER }
      }
    }
  },
  {
    name: HamToolName.CHECK_PROCESS_STATUS,
    description: 'Check process status.',
    parameters: {
      type: Type.OBJECT,
      properties: { process_name: { type: Type.STRING } }
    }
  },
  {
    name: HamToolName.RESTART_COMPONENT,
    description: 'Restart system component.',
    parameters: {
      type: Type.OBJECT,
      properties: { component_name: { type: Type.STRING } },
      required: ['component_name']
    }
  },
  {
    name: HamToolName.GET_ENGINE_TELEMETRY,
    description: 'Get engine telemetry.',
    parameters: { type: Type.OBJECT, properties: {} }
  },
  {
    name: HamToolName.GET_AI_MODEL_DETAILS,
    description: 'Get AI model details.',
    parameters: { type: Type.OBJECT, properties: {} }
  },
  {
    name: HamToolName.GET_PROCESS_ENVIRONMENT,
    description: 'Get process environment.',
    parameters: {
      type: Type.OBJECT,
      properties: { pid: { type: Type.INTEGER } },
      required: ['pid']
    }
  },
  {
    name: HamToolName.KILL_PROCESS,
    description: 'Kill process.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        pid: { type: Type.INTEGER },
        signal: { type: Type.STRING }
      },
      required: ['pid']
    }
  },
  {
    name: HamToolName.RESTART_RUNTIME_ENVIRONMENT,
    description: 'Restart runtime environment.',
    parameters: { type: Type.OBJECT, properties: {} }
  },
  {
    name: HamToolName.LIST_INSTALLED_PACKAGES,
    description: 'List installed packages.',
    parameters: {
      type: Type.OBJECT,
      properties: { package_manager: { type: Type.STRING } }
    }
  },
  {
    name: HamToolName.CHECK_PACKAGE_INTEGRITY,
    description: 'Check package integrity.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        package_name: { type: Type.STRING },
        package_manager: { type: Type.STRING }
      },
      required: ['package_name']
    }
  },
  {
    name: HamToolName.FIX_PACKAGE_DEPENDENCIES,
    description: 'Fix package dependencies.',
    parameters: {
      type: Type.OBJECT,
      properties: { package_manager: { type: Type.STRING } }
    }
  },
  {
    name: HamToolName.STATIC_CODE_ANALYSIS,
    description: 'Run static code analysis.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        path: { type: Type.STRING },
        rules: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ['path']
    }
  },
  {
    name: HamToolName.GET_CODE_COVERAGE,
    description: 'Get code coverage.',
    parameters: {
      type: Type.OBJECT,
      properties: { path: { type: Type.STRING } },
      required: ['path']
    }
  },
  {
    name: HamToolName.SIMULATE_CODE_EXECUTION,
    description: 'Simulate code execution.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        code: { type: Type.STRING },
        inputs: { type: Type.OBJECT }
      },
      required: ['code']
    }
  },
  {
    name: HamToolName.READ_CONFIG_FILE,
    description: 'Read config file.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        path: { type: Type.STRING },
        format: { type: Type.STRING }
      },
      required: ['path']
    }
  },
  {
    name: HamToolName.VALIDATE_CONFIG_FILE,
    description: 'Validate config file.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        path: { type: Type.STRING },
        schema_path: { type: Type.STRING }
      },
      required: ['path', 'schema_path']
    }
  },
  {
    name: HamToolName.MOCK_HTTP_REQUEST,
    description: 'Mock HTTP request.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        url: { type: Type.STRING },
        method: { type: Type.STRING },
        response_body: { type: Type.STRING },
        status_code: { type: Type.INTEGER }
      },
      required: ['url', 'method', 'response_body']
    }
  },
  {
    name: HamToolName.AUDIT_SECURITY_POLICY,
    description: 'Audit security policy.',
    parameters: {
      type: Type.OBJECT,
      properties: { policy_path: { type: Type.STRING } },
      required: ['policy_path']
    }
  },
  {
    name: HamToolName.GET_INTERNAL_VERSION_HISTORY,
    description: 'Get internal version history.',
    parameters: {
      type: Type.OBJECT,
      properties: { path: { type: Type.STRING } },
      required: ['path']
    }
  }
];
