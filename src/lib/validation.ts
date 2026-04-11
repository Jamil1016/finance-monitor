// Input validation for security

export function sanitizeText(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove HTML tags
    .replace(/javascript:/gi, '') // Remove JS protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim()
    .slice(0, 500); // Max length
}

export function validateAmount(value: string): { valid: boolean; amount: number; error?: string } {
  const num = parseFloat(value);
  if (isNaN(num)) return { valid: false, amount: 0, error: 'Invalid amount' };
  if (num <= 0) return { valid: false, amount: 0, error: 'Amount must be positive' };
  if (num > 99999999) return { valid: false, amount: 0, error: 'Amount too large' };
  return { valid: true, amount: Math.round(num * 100) / 100 }; // Round to 2 decimals
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (password.length < 6) return { valid: false, error: 'Password must be at least 6 characters' };
  if (password.length > 128) return { valid: false, error: 'Password too long' };
  return { valid: true };
}
