// Input validation and sanitization for security

export function sanitizeText(input: string): string {
  if (!input) return '';
  return input
    .replace(/<[^>]*>/g, '')       // Strip HTML tags
    .replace(/javascript:/gi, '')   // Remove JS protocol
    .replace(/on\w+\s*=/gi, '')    // Remove event handlers
    .replace(/data:/gi, '')         // Remove data URIs
    .replace(/eval\(/gi, '')        // Remove eval
    .replace(/expression\(/gi, '')  // Remove CSS expressions
    .trim()
    .slice(0, 500);
}

export function sanitizeAmount(value: string): number {
  const num = parseFloat(value);
  if (isNaN(num) || num < 0) return 0;
  if (num > 99999999) return 99999999;
  return Math.round(num * 100) / 100;
}

export function validateAmount(value: string): { valid: boolean; amount: number; error?: string } {
  const num = parseFloat(value);
  if (isNaN(num)) return { valid: false, amount: 0, error: 'Invalid amount' };
  if (num <= 0) return { valid: false, amount: 0, error: 'Amount must be positive' };
  if (num > 99999999) return { valid: false, amount: 0, error: 'Amount too large' };
  return { valid: true, amount: Math.round(num * 100) / 100 };
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (password.length < 6) return { valid: false, error: 'Password must be at least 6 characters' };
  if (password.length > 128) return { valid: false, error: 'Password too long' };
  return { valid: true };
}

// Rate limiter using localStorage (client-side)
export function checkRateLimit(key: string, maxAttempts: number, windowMs: number): boolean {
  if (typeof window === 'undefined') return true;
  const now = Date.now();
  const stored = localStorage.getItem(`rl_${key}`);
  let attempts: number[] = stored ? JSON.parse(stored) : [];
  // Remove expired attempts
  attempts = attempts.filter(t => now - t < windowMs);
  if (attempts.length >= maxAttempts) return false; // Rate limited
  attempts.push(now);
  localStorage.setItem(`rl_${key}`, JSON.stringify(attempts));
  return true; // Allowed
}
