export const PASSWORD_MIN_LENGTH = 8;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeAuthEmail(email: string) {
  return email.trim().toLowerCase();
}

export type CredentialField = "email" | "password" | "confirmPassword";

export type CredentialValidation =
  | { valid: true; email: string; password: string }
  | { valid: false; field: CredentialField; message: string };

export function validateAuthCredentials(
  email: string,
  password: string,
  options?: { requireConfirm?: boolean; confirmPassword?: string }
): CredentialValidation {
  const normalized = normalizeAuthEmail(email);

  if (!normalized) {
    return { valid: false, field: "email", message: "Email is required." };
  }

  if (!EMAIL_PATTERN.test(normalized)) {
    return {
      valid: false,
      field: "email",
      message: "Enter a valid email address.",
    };
  }

  if (!password) {
    return {
      valid: false,
      field: "password",
      message: "Password is required.",
    };
  }

  if (password.length < PASSWORD_MIN_LENGTH) {
    return {
      valid: false,
      field: "password",
      message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`,
    };
  }

  if (options?.requireConfirm) {
    if (password !== options.confirmPassword) {
      return {
        valid: false,
        field: "confirmPassword",
        message: "Passwords do not match.",
      };
    }
  }

  return { valid: true, email: normalized, password };
}
