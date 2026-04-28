 
import { MultiProviderRouter } from './MultiProviderRouter';

export class DiversityEngine {
    static async trilogyAnalysis(errorMsg: string, rootCause: string): Promise<string> {
        const prompt = `Analyze and fix this error.\nError: ${errorMsg}\nRoot Cause: ${rootCause}\nProvide only the code fix.`;
        
        try {
            // In a true implementation, this would call 3 different providers.
            // For now, we use the router to get the best available response.
            const response = await MultiProviderRouter.route(prompt, 'code');
            return response;
        } catch (e) {
            console.error('[DIVERSITY_ENGINE] Trilogy analysis failed:', e);
            throw e;
        }
    }
}
