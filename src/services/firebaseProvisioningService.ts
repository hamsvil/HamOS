/* eslint-disable no-useless-assignment */
import { LoggerService } from './LoggerService';

const FIREBASE_API_BASE = 'https://firebase.googleapis.com/v1beta1';
const FIRESTORE_RULES_API_BASE = 'https://firebaserules.googleapis.com/v1';

export const firebaseProvisioningService = {
  async createProject(token: string, projectId: string, displayName: string): Promise<any> {
    try {
      // 1. Create Google Cloud Project (Requires Cloud Resource Manager API)
      // Note: Typically requires billing enabled or specific permissions.
      // Assuming the user has sufficient quota and permissions via the OAuth token.
      const gcpResponse = await fetch(`https://cloudresourcemanager.googleapis.com/v1/projects`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          projectId,
          name: displayName
        })
      });

      if (!gcpResponse.ok) throw new Error('Failed to create GCP Project');
      
      // Wait for GCP project creation (simplified, usually an operation polling is needed)
      await new Promise(resolve => setTimeout(resolve, 5000));

      // 2. Add Firebase to the GCP Project
      const firebaseResponse = await fetch(`${FIREBASE_API_BASE}/projects/${projectId}:addFirebase`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!firebaseResponse.ok) throw new Error('Failed to add Firebase to project');
      
      return firebaseResponse.json();
    } catch (e) {
      LoggerService.error('FirebaseProvisioning', 'Error creating project', e);
      throw e;
    }
  },

  async deploySecurityRules(token: string, projectId: string, rulesContent: string): Promise<void> {
    try {
      // 1. Create a Ruleset
      const rulesetResponse = await fetch(`${FIRESTORE_RULES_API_BASE}/projects/${projectId}/rulesets`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          source: {
            files: [
              {
                name: 'firestore.rules',
                content: rulesContent
              }
            ]
          }
        })
      });

      if (!rulesetResponse.ok) throw new Error('Failed to create ruleset');
      const ruleset = await rulesetResponse.json();
      const rulesetName = ruleset.name;

      // 2. Update the Release to point to the new Ruleset
      const releaseName = `projects/${projectId}/releases/cloud.firestore`;
      const releaseResponse = await fetch(`${FIRESTORE_RULES_API_BASE}/${releaseName}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: releaseName,
          rulesetName: rulesetName
        })
      });

      if (!releaseResponse.ok) {
          // If PATCH fails, it might not exist yet, try POST
          const createReleaseResponse = await fetch(`${FIRESTORE_RULES_API_BASE}/projects/${projectId}/releases`, {
              method: 'POST',
              headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                  name: releaseName,
                  rulesetName: rulesetName
              })
          });
          if (!createReleaseResponse.ok) throw new Error('Failed to update rules release');
      }

      LoggerService.info('FirebaseProvisioning', 'Security rules deployed successfully');
    } catch (e) {
      LoggerService.error('FirebaseProvisioning', 'Error deploying security rules', e);
      throw e;
    }
  }
};
