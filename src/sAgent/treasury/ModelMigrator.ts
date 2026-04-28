export class ModelMigrator {
  private static mappings: Record<string, string> = {
    'gemini-1.5-pro': 'gemini-2.0-pro-exp-02-05',
    'gemini-1.5-flash': 'gemini-2.0-flash-exp',
    'gemini-pro': 'gemini-2.0-pro-exp-02-05',
    'gemini-pro-vision': 'gemini-2.0-pro-exp-02-05'
  };

  public static resolveModel(requestedModel: string): string {
    const migrated = this.mappings[requestedModel];
    if (migrated) {
      console.log(`[ModelMigrator] Upgrading ${requestedModel} to ${migrated}`);
      return migrated;
    }
    return requestedModel;
  }
}
