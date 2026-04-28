/* eslint-disable no-useless-assignment */
export const validateJSON = <T>(jsonString: string | null, validator: (obj: any) => boolean, fallback: T): T => {
  if (!jsonString) return fallback;
  try {
    const parsed = JSON.parse(jsonString);
    if (validator(parsed)) {
      return parsed as T;
    }
    console.warn('JSON validation failed, using fallback');
    return fallback;
  } catch (e) {
    console.error('JSON parse error:', e);
    return fallback;
  }
};

export const isProjectData = (obj: any): boolean => {
  return (
    obj &&
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    Array.isArray(obj.files)
  );
};

export const isSettingsData = (obj: any): boolean => {
  return (
    obj &&
    typeof obj.theme === 'string' &&
    typeof obj.language === 'string'
  );
};
