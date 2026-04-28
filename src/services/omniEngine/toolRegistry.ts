import { Type, FunctionDeclaration } from '@google/genai';
import { OmniToolName } from './types';
import { AdvancedDiagnosticsToolkit } from '../hamEngine/cortex/toolkits/AdvancedDiagnosticsToolkit';
import { SubAgentToolkit } from '../hamEngine/cortex/toolkits/SubAgentToolkit';

// ============================================================================
// OMNI-ENGINE V7: TOOL REGISTRY (FUNCTION DECLARATIONS)
// ============================================================================

export const BaseToolkit: FunctionDeclaration[] = [
  {
    name: OmniToolName.LIST_DIR,
    description: 'List the contents of a directory to understand the project structure.',
    parameters: {
      type: Type.OBJECT,
      properties: { path: { type: Type.STRING, description: 'Absolute path to directory' } },
      required: ['path']
    }
  },
  {
    name: OmniToolName.VIEW_FILE,
    description: 'View the contents of a specific file. Always call this before editing.',
    parameters: {
      type: Type.OBJECT,
      properties: { path: { type: Type.STRING, description: 'Absolute path to file' } },
      required: ['path']
    }
  },
  {
    name: OmniToolName.SHELL_EXEC,
    description: 'Execute a shell command. Use grep to search codebase, or npx to install packages.',
    parameters: {
      type: Type.OBJECT,
      properties: { command: { type: Type.STRING, description: 'Shell command (e.g., grep -rI "pattern" .)' } },
      required: ['command']
    }
  },
  {
    name: OmniToolName.READ_URL_CONTENT,
    description: 'Fetch content from a URL via HTTP request. Converts HTML to markdown.',
    parameters: {
      type: Type.OBJECT,
      properties: { url: { type: Type.STRING, description: 'URL to read' } },
      required: ['url']
    }
  },
  {
    name: OmniToolName.VIEW_CONTENT_CHUNK,
    description: 'View a specific chunk of document content using its DocumentId and chunk position.',
    parameters: {
      type: Type.OBJECT,
      properties: { 
        document_id: { type: Type.STRING },
        position: { type: Type.INTEGER }
      },
      required: ['document_id', 'position']
    }
  },
  {
    name: OmniToolName.QUERY_LIVE_DATABASE,
    description: 'Query the live Firestore database to inspect data state.',
    parameters: {
      type: Type.OBJECT,
      properties: { 
        collection: { type: Type.STRING },
        query: { type: Type.OBJECT, description: 'Optional query parameters' }
      },
      required: ['collection']
    }
  },
  {
    name: OmniToolName.LOAD_CONTEXTUAL_TOOLKIT,
    description: 'Switch the active toolkit to access different tools (e.g., "coder", "qa_vision", "devops", "meta").',
    parameters: {
      type: Type.OBJECT,
      properties: { toolkitName: { type: Type.STRING, description: 'Name of the toolkit to load' } },
      required: ['toolkitName']
    }
  },
  {
    name: OmniToolName.FINISH_TASK,
    description: 'Call this when the task is 100% complete and verified by linter/compiler.',
    parameters: {
      type: Type.OBJECT,
      properties: { summary: { type: Type.STRING, description: 'Summary of what was accomplished' } },
      required: ['summary']
    }
  }
];

export const CoderToolkit: FunctionDeclaration[] = [
  {
    name: OmniToolName.CREATE_FILE,
    description: 'Create a new file with the specified content.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        path: { type: Type.STRING, description: 'Absolute path to the new file' },
        content: { type: Type.STRING, description: 'Content of the file' }
      },
      required: ['path', 'content']
    }
  },
  {
    name: OmniToolName.EDIT_FILE,
    description: 'Surgically edit a file by replacing a specific target string. MUST be an exact match.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        path: { type: Type.STRING, description: 'Absolute path to file' },
        targetContent: { type: Type.STRING, description: 'Exact string to replace (including whitespace)' },
        replacementContent: { type: Type.STRING, description: 'New content to insert' }
      },
      required: ['path', 'targetContent', 'replacementContent']
    }
  },
  {
    name: OmniToolName.MULTI_EDIT_FILE,
    description: 'Edit multiple non-contiguous blocks in the same file simultaneously.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        path: { type: Type.STRING, description: 'Absolute path to file' },
        edits: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              targetContent: { type: Type.STRING },
              replacementContent: { type: Type.STRING }
            }
          }
        }
      },
      required: ['path', 'edits']
    }
  },
  {
    name: OmniToolName.DELETE_FILE,
    description: 'Delete an existing file.',
    parameters: {
      type: Type.OBJECT,
      properties: { path: { type: Type.STRING, description: 'Absolute path to file' } },
      required: ['path']
    }
  },
  {
    name: OmniToolName.MOVE,
    description: 'Move or rename a file or directory.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        sourcePath: { type: Type.STRING, description: 'Absolute path to source file/directory' },
        destinationPath: { type: Type.STRING, description: 'Absolute path to destination' }
      },
      required: ['sourcePath', 'destinationPath']
    }
  },
  {
    name: OmniToolName.DELETE_DIR,
    description: 'Delete an entire directory recursively.',
    parameters: {
      type: Type.OBJECT,
      properties: { path: { type: Type.STRING, description: 'Absolute path to directory' } },
      required: ['path']
    }
  },
  {
    name: OmniToolName.RUN_MENTAL_SANDBOX,
    description: 'Execute a snippet of Node.js code in an isolated memory sandbox to test logic before writing to file.',
    parameters: {
      type: Type.OBJECT,
      properties: { code: { type: Type.STRING, description: 'JavaScript/TypeScript code to evaluate' } },
      required: ['code']
    }
  }
];

export const QAVisionToolkit: FunctionDeclaration[] = [
  {
    name: OmniToolName.LINT_APPLET,
    description: 'Run the linter to check for syntax errors and missing imports. Fast validation.',
    parameters: { type: Type.OBJECT, properties: {} }
  },
  {
    name: OmniToolName.COMPILE_APPLET,
    description: 'Run the full compiler to ensure the application builds successfully without crashing.',
    parameters: { type: Type.OBJECT, properties: {} }
  },
  {
    name: OmniToolName.CAPTURE_AND_ANALYZE_UI,
    description: 'Capture a screenshot of the running app and analyze its visual layout (Vision).',
    parameters: {
      type: Type.OBJECT,
      properties: { route: { type: Type.STRING, description: 'URL route to capture (e.g., "/")' } },
      required: ['route']
    }
  },
  {
    name: OmniToolName.SIMULATE_USER_INTERACTION,
    description: 'Simulate user clicks and form inputs to test E2E business logic.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        route: { type: Type.STRING },
        actions: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Array of actions (e.g., "click #btn", "type #input value")' }
      },
      required: ['route', 'actions']
    }
  },
  {
    name: OmniToolName.EXECUTE_HTTP_REQUEST,
    description: 'Execute a raw HTTP request (GET, POST, etc.) to test API endpoints.',
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
    name: OmniToolName.ANALYZE_PERFORMANCE_METRICS,
    description: 'Analyze application performance (Lighthouse, memory usage, etc.).',
    parameters: { type: Type.OBJECT, properties: {} }
  },
  {
    name: OmniToolName.RUN_SECURITY_PENETRATION,
    description: 'Run automated security scans to find vulnerabilities.',
    parameters: { type: Type.OBJECT, properties: {} }
  }
];

export const DevOpsToolkit: FunctionDeclaration[] = [
  {
    name: OmniToolName.INSTALL_APPLET_PACKAGE,
    description: 'Install a new NPM package (e.g., lodash, react-router).',
    parameters: {
      type: Type.OBJECT,
      properties: { packages: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'List of package names' } },
      required: ['packages']
    }
  },
  {
    name: OmniToolName.SET_UP_FIREBASE,
    description: 'Provision Firebase backend (Firestore & Auth) automatically.',
    parameters: { type: Type.OBJECT, properties: {} }
  },
  {
    name: OmniToolName.DEPLOY_FIREBASE,
    description: 'Deploy Firestore rules to the live project.',
    parameters: { type: Type.OBJECT, properties: {} }
  },
  {
    name: OmniToolName.RESTART_DEV_SERVER,
    description: 'Restart the Node.js development server.',
    parameters: { type: Type.OBJECT, properties: {} }
  },
  {
    name: OmniToolName.INSTALL_APPLET_DEPENDENCIES,
    description: 'Install all dependencies from package.json.',
    parameters: { type: Type.OBJECT, properties: {} }
  },
  {
    name: OmniToolName.PROVISION_CLOUD_INFRASTRUCTURE,
    description: 'Provision cloud resources (Cloud Run, SQL, etc.).',
    parameters: { type: Type.OBJECT, properties: {} }
  },
  {
    name: OmniToolName.MANAGE_VERSION_CONTROL,
    description: 'Execute Git commands (commit, checkout, reset) to manage state and backtrack if needed.',
    parameters: {
      type: Type.OBJECT,
      properties: { command: { type: Type.STRING, description: 'Git command (e.g., "commit -m msg", "reset --hard")' } },
      required: ['command']
    }
  }
];

export const MetaToolkit: FunctionDeclaration[] = [
  {
    name: OmniToolName.MANAGE_LONG_TERM_MEMORY,
    description: 'Save a lesson learned or architectural decision to the Vector DB for future reference.',
    parameters: {
      type: Type.OBJECT,
      properties: { memory: { type: Type.STRING, description: 'The lesson to remember' } },
      required: ['memory']
    }
  },
  {
    name: OmniToolName.UPGRADE_ENGINE_CORE,
    description: 'Modify the OmniEngine source code to self-improve. Use with extreme caution.',
    parameters: {
      type: Type.OBJECT,
      properties: { instruction: { type: Type.STRING, description: 'What to upgrade in the core engine' } },
      required: ['instruction']
    }
  },
  {
    name: OmniToolName.SPAWN_EPHEMERAL_THREAD,
    description: 'Spawn a sub-agent thread to solve a specific sub-problem in parallel.',
    parameters: {
      type: Type.OBJECT,
      properties: { task: { type: Type.STRING } },
      required: ['task']
    }
  },
  {
    name: OmniToolName.ANALYZE_USER_TELEMETRY,
    description: 'Analyze user behavior data to improve UX.',
    parameters: { type: Type.OBJECT, properties: {} }
  },
  {
    name: OmniToolName.GENERATE_MEDIA_ASSETS,
    description: 'Generate images or videos using GenAI models.',
    parameters: {
      type: Type.OBJECT,
      properties: { prompt: { type: Type.STRING } },
      required: ['prompt']
    }
  }
];

// Helper to get toolkit by name
export function getToolkitByName(name: string): FunctionDeclaration[] {
  switch (name) {
    case 'coder': return [...BaseToolkit, ...CoderToolkit];
    case 'qa_vision': return [...BaseToolkit, ...QAVisionToolkit];
    case 'devops': return [...BaseToolkit, ...DevOpsToolkit];
    case 'meta': return [...BaseToolkit, ...MetaToolkit];
    case 'advanced_diagnostics': return [...BaseToolkit, ...AdvancedDiagnosticsToolkit];
    case 'subagent': return [...BaseToolkit, ...SubAgentToolkit];
    case 'base':
    default: return BaseToolkit;
  }
}
