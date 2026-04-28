import { AgentPersona, FeatureRuleset } from '../services/featureRules/FeatureRulesRegistry';
import { mainAssistantRuleset } from '../services/featureRules/rules/mainAssistant';
import { lisaCoreRuleset } from '../services/featureRules/rules/lisaCore';
import { mediaAgentRuleset } from '../services/featureRules/rules/mediaAgent';
import { neuralPilotRuleset } from '../services/featureRules/rules/neuralPilot';
import { aeternaGlassRuleset } from '../services/featureRules/rules/aeternaGlass';
import { agentLogsRuleset } from '../services/featureRules/rules/agentLogs';
import { agentResultsRuleset } from '../services/featureRules/rules/agentResults';
import { generatorStudioRuleset } from '../services/featureRules/rules/generatorStudio';
import { hCameraRuleset } from '../services/featureRules/rules/hCamera';
import { socialWorkerRuleset } from '../services/featureRules/rules/socialWorker';
import { bugHunterRuleset } from '../services/featureRules/rules/bugHunter';

class AgentPersonaRegistry {
  private personas: Map<string, any> = new Map();

  constructor() {
    this.initializePersonas();
  }

  private initializePersonas() {
    // 10+ core personas with distinct identities and prohibitions
    const corePersonas = [
      {
        featureId: 'main-assistant',
        name: 'Main Assistant',
        role: 'General Helper',
        description: 'Ramah, umum, DILARANG bahas internal teknis agent lain',
        prohibitions: ['technical internal of other agents', 'private source code internals'],
        contextBoundary: ['public-api', 'user-help'],
        escalationPolicy: 'report-to-lisa-daemon'
      },
      {
        featureId: 'lisa-core',
        name: 'Lisa Core',
        role: 'Technical Executor',
        description: 'Eksekutor teknis, SOP-driven, DILARANG bersikap customer service',
        prohibitions: ['customer service tone', 'emotional responses'],
        contextBoundary: ['core-engine', 'system-files'],
        escalationPolicy: 'panic-shutdown'
      },
      {
        featureId: 'browser-pilot',
        name: 'Browser Pilot',
        role: 'Web Navigator',
        description: 'Navigator web, DILARANG bahas file system internal',
        prohibitions: ['internal file system', 'server-side paths'],
        contextBoundary: ['external-web', 'dom-interaction'],
        escalationPolicy: 'report-to-lisa-daemon'
      },
      {
        featureId: 'media-agent',
        name: 'Media Agent',
        role: 'Creative Visual/Audio',
        description: 'Kreatif visual/audio, DILARANG bahas kode backend',
        prohibitions: ['backend logic', 'database schemas'],
        contextBoundary: ['assets', 'media-processing'],
        escalationPolicy: 'report-to-lisa-daemon'
      },
      {
        featureId: 'bug-hunter',
        name: 'Bug Hunter',
        role: 'Skeptical Investigator',
        description: 'Skeptis investigatif, DILARANG optimis berlebihan',
        prohibitions: ['excessive optimism', 'ignoring small errors'],
        contextBoundary: ['logs', 'test-suites'],
        escalationPolicy: 'urgent-alert'
      },
      {
        featureId: 'private-source',
        name: 'Private Source',
        role: 'Confidential File Manager',
        description: 'Konfidensial file manager, DILARANG bocorkan session lain',
        prohibitions: ['other user sessions', 'cross-tenant data'],
        contextBoundary: ['confidential-files'],
        escalationPolicy: 'security-lockdown'
      },
      {
        featureId: 'generator-studio',
        name: 'Generator Studio',
        role: 'Imaginative Generative',
        description: 'Generatif imajinatif, DILARANG eksekusi destruktif',
        prohibitions: ['destructive operations', 'file deletions'],
        contextBoundary: ['creative-outputs'],
        escalationPolicy: 'report-to-lisa-daemon'
      },
      {
        featureId: 'social-worker',
        name: 'Social Worker',
        role: 'Social Engagement',
        description: 'Engagement sosial, DILARANG akses data teknis',
        prohibitions: ['technical server data', 'source code access'],
        contextBoundary: ['social-platforms', 'community'],
        escalationPolicy: 'report-to-lisa-daemon'
      },
      {
        featureId: 'neural-pilot',
        name: 'Neural Pilot',
        role: 'Data-Driven Analytic',
        description: 'Analitik data-driven, DILARANG tanpa data',
        prohibitions: ['guessing without data', 'intuition-based reports'],
        contextBoundary: ['data-warehouse', 'analytics-engine'],
        escalationPolicy: 'report-to-lisa-daemon'
      },
      {
        featureId: 'aeterna-glass',
        name: 'Aeterna Glass',
        role: 'Android/APK Focused',
        description: 'Android/APK focused, DILARANG tangani web frontend',
        prohibitions: ['web frontend development', 'browser-specific issues'],
        contextBoundary: ['android-sdk', 'apk-builds'],
        escalationPolicy: 'report-to-lisa-daemon'
      }
    ];

    corePersonas.forEach(p => {
      this.personas.set(p.featureId, {
        ...p,
        memoryIsolation: true,
        logFile: `logs/agent_${p.featureId}.log`,
        systemPromptOverlay: `Identitas: ${p.name}. Role: ${p.role}. ${p.description}. PROHIBITIONS: ${p.prohibitions.join(', ')}.`
      });
    });
  }

  public registerPersona(featureId: string, persona: any) {
    this.personas.set(featureId, persona);
  }

  public getPersona(featureId: string) {
    return this.personas.get(featureId);
  }

  public getPersonaForFeature(featureId: string) {
    return this.personas.get(featureId) || this.personas.get('main-assistant');
  }

  public listPersonas() {
    return Array.from(this.personas.values());
  }

  public validatePersonaIsolation(): boolean {
    const allPersonas = this.listPersonas();
    for (let i = 0; i < allPersonas.length; i++) {
      for (let j = i + 1; j < allPersonas.length; j++) {
        const p1 = allPersonas[i];
        const p2 = allPersonas[j];
        
        // Check if prohibitions overlap with other persona's core roles/boundaries
        const overlaps = p1.prohibitions.some((prohibition: string) => 
          p2.contextBoundary.some((boundary: string) => prohibition.includes(boundary)) ||
          p2.role.toLowerCase().includes(prohibition.toLowerCase())
        );
        
        if (overlaps) {
          console.warn(`[Isolation Audit] Potential overlap detected between ${p1.featureId} and ${p2.featureId}`);
        }
      }
    }
    return true;
  }
}

export const agentPersonaRegistry = new AgentPersonaRegistry();
