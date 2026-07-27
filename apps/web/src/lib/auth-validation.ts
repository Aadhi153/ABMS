const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email);
}

export type PasswordStrength = 0 | 1 | 2 | 3;

/** 0 = empty/too short, 1 = weak, 2 = medium, 3 = strong. */
export function getPasswordStrength(password: string): PasswordStrength {
  if (password.length < 8) return 0;
  let score = 1;
  if (password.length >= 12) score += 1;
  const varietyCount = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/].filter((re) => re.test(password)).length;
  if (varietyCount >= 3) score += 1;
  return Math.min(score, 3) as PasswordStrength;
}

export const PASSWORD_STRENGTH_LABEL: Record<PasswordStrength, string> = {
  0: "",
  1: "Weak",
  2: "Medium",
  3: "Strong password",
};
