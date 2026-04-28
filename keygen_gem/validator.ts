/**
 * [SINGULARITY VALIDATOR]
 * Logic for real-time Gemini API Key validation.
 */

export interface ValidationResult {
  isValid: boolean;
  modelCount?: number;
  error?: string;
  responseTime: number;
}

/**
 * Validates a Gemini API Key by calling the Google Generative Language API.
 * This is the ultimate "Gold Standard" test.
 */
export async function validateGeminiKey(apiKey: string): Promise<ValidationResult> {
  const start = Date.now();
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const duration = Date.now() - start;

    if (response.ok) {
      const data = await response.json();
      return {
        isValid: true,
        modelCount: data.models?.length || 0,
        responseTime: duration,
      };
    } else {
      const errorData = await response.json().catch(() => ({}));
      return {
        isValid: false,
        error: errorData.error?.message || `HTTP ${response.status}`,
        responseTime: duration,
      };
    }
  } catch (err) {
    return {
      isValid: false,
      error: err instanceof Error ? err.message : String(err),
      responseTime: Date.now() - start,
    };
  }
}
