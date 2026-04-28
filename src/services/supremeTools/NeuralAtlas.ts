import { AtlasKnowledge } from '../../types/supreme';
import { structuredDb } from '../../db/structuredDb';

/**
 * PILAR 11: NEURAL-ATLAS (The Knowledge Architect)
 * Penyimpanan memori jangka panjang mengenai keputusan arkitektural dan intent kode.
 */
export class NeuralAtlas {
  private static instance: NeuralAtlas;

  private constructor() {}

  public static getInstance(): NeuralAtlas {
    if (!NeuralAtlas.instance) {
      NeuralAtlas.instance = new NeuralAtlas();
    }
    return NeuralAtlas.instance;
  }

  public async recordKnowledge(knowledge: Omit<AtlasKnowledge, 'id' | 'timestamp'>, signature?: string): Promise<string> {
    // SECURITY_GATING: Only allow 'architect' role if signed with internal entropy
    if (knowledge.author === 'architect' && signature !== 'SUPREME_ARCHITECT_TOKEN_V13') {
       console.error("[NEURAL-ATLAS] IDENTITY_SPOOF_ATTEMPT: Rejected knowledge from unverified architect.");
       knowledge.author = 'user'; // Demote to user
    }

    const id = `kn_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const fullKnowledge: AtlasKnowledge = {
      ...knowledge,
      id,
      timestamp: Date.now()
    };
    
    await structuredDb.knowledge.add(fullKnowledge);
    console.log(`[NEURAL-ATLAS] Knowledge recorded for ${knowledge.targetId}: ${knowledge.intent}`);
    return id;
  }

  public async getKnowledgeForTarget(targetId: string): Promise<AtlasKnowledge[]> {
    const res = await structuredDb.knowledge
      .where('targetId')
      .equals(targetId)
      .reverse()
      .sortBy('timestamp');
    return res as AtlasKnowledge[];
  }

  public async searchKnowledge(query: string): Promise<AtlasKnowledge[]> {
    const all = await structuredDb.knowledge.toArray();
    return all.filter(k => 
      k.intent.toLowerCase().includes(query.toLowerCase()) || 
      k.consequences.some(c => c.toLowerCase().includes(query.toLowerCase()))
    ) as AtlasKnowledge[];
  }

  public async getRecentKnowledge(limit = 10): Promise<AtlasKnowledge[]> {
    const res = await structuredDb.knowledge
      .orderBy('timestamp')
      .reverse()
      .limit(limit)
      .toArray();
    return res as AtlasKnowledge[];
  }
}
