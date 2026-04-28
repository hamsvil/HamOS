import { Content } from '@google/genai';

export type HamMode = 'fast' | 'thinking' | 'deep';
export type ToolkitType = 'base' | 'coder' | 'qa_vision' | 'devops' | 'meta' | 'advanced_diagnostics' | 'designer' | 'researcher' | 'subagent';

export interface HamState {
  mode: HamMode;
  activeToolkit: ToolkitType;
  historyLength: number;
  lastErrorCount: number;
  lastErrorType: string | null;
  isSandboxed: boolean;
  currentTask: string;
  currentProject: string;
  totalTokensUsed: number;
  memoryContext: any[];
  executionHistory: any[];
  isFinished: boolean;
}

export enum HamToolName {
  // Base
  LIST_DIR = 'list_dir',
  VIEW_FILE = 'view_file',
  SHELL_EXEC = 'shell_exec',
  READ_URL_CONTENT = 'read_url_content',
  VIEW_CONTENT_CHUNK = 'view_content_chunk',
  QUERY_LIVE_DATABASE = 'query_live_database',
  LOAD_CONTEXTUAL_TOOLKIT = 'load_contextual_toolkit',
  FINISH_TASK = 'finish_task',
  UPGRADE_ENGINE_CORE = 'upgrade_engine_core',

  // Coder
  CREATE_FILE = 'create_file',
  EDIT_FILE = 'edit_file',
  MULTI_EDIT_FILE = 'multi_edit_file',
  DELETE_FILE = 'delete_file',
  MOVE = 'move',
  DELETE_DIR = 'delete_dir',
  RUN_MENTAL_SANDBOX = 'run_mental_sandbox',
  RUN_HS_CODE = 'run_hs_code',
  CHECK_SYNTAX = 'check_syntax',

  // QA Vision
  LINT_APPLET = 'lint_applet',
  COMPILE_APPLET = 'compile_applet',
  CAPTURE_AND_ANALYZE_UI = 'capture_and_analyze_ui',
  SIMULATE_USER_INTERACTION = 'simulate_user_interaction',
  EXECUTE_HTTP_REQUEST = 'execute_http_request',
  ANALYZE_PERFORMANCE_METRICS = 'analyze_performance_metrics',
  RUN_SECURITY_PENETRATION = 'run_security_penetration',

  // DevOps
  INSTALL_APPLET_PACKAGE = 'install_applet_package',
  SET_UP_FIREBASE = 'set_up_firebase',
  DEPLOY_FIREBASE = 'deploy_firebase',
  RESTART_DEV_SERVER = 'restart_dev_server',
  INSTALL_APPLET_DEPENDENCIES = 'install_applet_dependencies',
  PROVISION_CLOUD_INFRASTRUCTURE = 'provision_cloud_infrastructure',
  MANAGE_VERSION_CONTROL = 'manage_version_control',

  // Meta
  MANAGE_LONG_TERM_MEMORY = 'manage_long_term_memory',
  SPAWN_EPHEMERAL_THREAD = 'spawn_ephemeral_thread',
  ANALYZE_USER_TELEMETRY = 'analyze_user_telemetry',
  GENERATE_MEDIA_ASSETS = 'generate_media_assets',

  // Advanced Diagnostics
  DIAGNOSE_NETWORK_CONNECTIVITY = 'diagnose_network_connectivity',
  RESET_NETWORK_INTERFACE = 'reset_network_interface',
  CHECK_CLOUD_SHELL_STATUS = 'check_cloud_shell_status',
  CHECK_VFS_INTEGRITY = 'check_vfs_integrity',
  RECONCILE_VFS_ENTRY = 'reconcile_vfs_entry',
  FORCE_DELETE_FILE = 'force_delete_file',
  CLEAR_VFS_CACHE = 'clear_vfs_cache',
  VIEW_SYSTEM_LOGS = 'view_system_logs',
  CHECK_PROCESS_STATUS = 'check_process_status',
  RESTART_COMPONENT = 'restart_component',
  GET_ENGINE_TELEMETRY = 'get_engine_telemetry',
  GET_AI_MODEL_DETAILS = 'get_ai_model_details',
  GET_PROCESS_ENVIRONMENT = 'get_process_environment',
  KILL_PROCESS = 'kill_process',
  RESTART_RUNTIME_ENVIRONMENT = 'restart_runtime_environment',
  LIST_INSTALLED_PACKAGES = 'list_installed_packages',
  CHECK_PACKAGE_INTEGRITY = 'check_package_integrity',
  FIX_PACKAGE_DEPENDENCIES = 'fix_package_dependencies',
  STATIC_CODE_ANALYSIS = 'static_code_analysis',
  GET_CODE_COVERAGE = 'get_code_coverage',
  SIMULATE_CODE_EXECUTION = 'simulate_code_execution',
  READ_CONFIG_FILE = 'read_config_file',
  VALIDATE_CONFIG_FILE = 'validate_config_file',
  MOCK_HTTP_REQUEST = 'mock_http_request',
  AUDIT_SECURITY_POLICY = 'audit_security_policy',
  GET_INTERNAL_VERSION_HISTORY = 'get_internal_version_history',

  // SubAgent
  SUBAGENT_READ_FILE = 'subagent_read_file',
  SUBAGENT_WRITE_FILE = 'subagent_write_file',
  SUBAGENT_LIST_FILES = 'subagent_list_files',
  SUBAGENT_SEARCH_CODE = 'subagent_search_code',
  SUBAGENT_GET_PROJECT_STRUCTURE = 'subagent_get_project_structure'
}

export interface ToolExecutionResult {
  success: boolean;
  output: string;
}

export interface ToolResponse {
  name: string;
  response: {
    output: string;
    success?: boolean;
  };
}
