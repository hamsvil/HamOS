export type OmniMode = 'fast' | 'thinking' | 'deep';
export type ToolkitType = 'base' | 'coder' | 'qa_vision' | 'devops' | 'meta';

export interface OmniState {
  mode: OmniMode;
  activeToolkit: ToolkitType;
  historyLength: number;
  lastErrorCount: number;
  lastErrorType: string | null;
  isSandboxed: boolean;
  currentTask: string | null;
  currentProject: string | null;
  totalTokensUsed: number;
}

export interface ToolExecutionResult {
  success: boolean;
  output: string;
}

export enum OmniToolName {
  // Perception
  LIST_DIR = 'list_dir',
  VIEW_FILE = 'view_file',
  SHELL_EXEC = 'shell_exec',
  READ_URL_CONTENT = 'read_url_content',
  VIEW_CONTENT_CHUNK = 'view_content_chunk',
  QUERY_LIVE_DATABASE = 'query_live_database',

  // Execution
  CREATE_FILE = 'create_file',
  EDIT_FILE = 'edit_file',
  MULTI_EDIT_FILE = 'multi_edit_file',
  DELETE_FILE = 'delete_file',
  DELETE_DIR = 'delete_dir',
  MOVE = 'move',

  // Infrastructure
  INSTALL_APPLET_PACKAGE = 'install_applet_package',
  INSTALL_APPLET_DEPENDENCIES = 'install_applet_dependencies',
  RESTART_DEV_SERVER = 'restart_dev_server',
  SET_UP_FIREBASE = 'set_up_firebase',
  DEPLOY_FIREBASE = 'deploy_firebase',
  PROVISION_CLOUD_INFRASTRUCTURE = 'provision_cloud_infrastructure',

  // Validation
  LINT_APPLET = 'lint_applet',
  COMPILE_APPLET = 'compile_applet',
  CAPTURE_AND_ANALYZE_UI = 'capture_and_analyze_ui',
  SIMULATE_USER_INTERACTION = 'simulate_user_interaction',
  EXECUTE_HTTP_REQUEST = 'execute_http_request',
  ANALYZE_PERFORMANCE_METRICS = 'analyze_performance_metrics',
  RUN_SECURITY_PENETRATION = 'run_security_penetration',

  // Evolution & Meta
  MANAGE_VERSION_CONTROL = 'manage_version_control',
  MANAGE_LONG_TERM_MEMORY = 'manage_long_term_memory',
  ANALYZE_USER_TELEMETRY = 'analyze_user_telemetry',
  GENERATE_MEDIA_ASSETS = 'generate_media_assets',
  UPGRADE_ENGINE_CORE = 'upgrade_engine_core',
  LOAD_CONTEXTUAL_TOOLKIT = 'load_contextual_toolkit',
  SPAWN_EPHEMERAL_THREAD = 'spawn_ephemeral_thread',
  RUN_MENTAL_SANDBOX = 'run_mental_sandbox',
  RUN_CHAMS_CODE = 'run_chams_code',

  // Base Control
  FINISH_TASK = 'finish_task'
}
