export interface PasswordValidationResult {
  isValid: boolean;
  criteria: {
    minLength: boolean;    // > 8 characters (min 9)
    hasUpper: boolean;     // >= 1 uppercase
    hasLower: boolean;     // >= 1 lowercase
    hasDigit: boolean;     // >= 1 number
    hasSpecial: boolean;   // >= 1 special character
  };
}

export function validatePassword(password: string): PasswordValidationResult {
  const minLength = password.length >= 9;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  const isValid = minLength && hasUpper && hasLower && hasDigit && hasSpecial;

  return {
    isValid,
    criteria: {
      minLength,
      hasUpper,
      hasLower,
      hasDigit,
      hasSpecial,
    },
  };
}

export function generateSalt(length = 16): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function hashPassword(password: string, salt: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPassword(password: string, salt: string, storedHash: string): Promise<boolean> {
  const computedHash = await hashPassword(password, salt);
  return computedHash === storedHash;
}
