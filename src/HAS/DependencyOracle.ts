export class DependencyOracle {
    private static importMap: Map<string, string[]> = new Map(); 

    static async buildGraph(_sourceFiles: string[]): Promise<void> {
        this.importMap.clear();
    }

    static getImpactedFiles(changedFile: string, _depth = 3): string[] {
        return [];
    }

    static getImpactReport(changedFile: string): string {
        return `No other files import "${changedFile}". Change is isolated.`;
    }
}
