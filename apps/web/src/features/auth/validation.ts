import type { FieldErrors, LocalLoginInput, LocalRegisterInput } from "./types";

const USERNAME_PATTERN = /^[a-z0-9._-]+$/i;

function hasLetterAndNumber(value: string) {
  return /[A-Za-z]/.test(value) && /\d/.test(value);
}

export function validateUsername(username: string) {
  const value = username.trim();
  if (value.length < 3 || value.length > 32) {
    return "Username must be between 3 and 32 characters.";
  }
  if (!USERNAME_PATTERN.test(value)) {
    return "Username may only contain letters, numbers, dots, underscores, and hyphens.";
  }
  return null;
}

export function validateEmail(email: string) {
  const value = email.trim();
  if (!value) {
    return "Email is required.";
  }
  if (!/^\S+@\S+\.\S+$/.test(value)) {
    return "Email format is invalid.";
  }
  return null;
}

export function validatePassword(password: string) {
  if (password.length < 8 || password.length > 128) {
    return "Password must be between 8 and 128 characters.";
  }
  if (!hasLetterAndNumber(password)) {
    return "Password must contain at least one letter and one number.";
  }
  return null;
}

export function validateLoginInput(input: LocalLoginInput): FieldErrors {
  const errors: FieldErrors = {};
  if (!input.username.trim()) {
    errors.username = "Username or email is required.";
  }
  if (!input.password) {
    errors.password = "Password is required.";
  }
  return errors;
}

export function validateRegisterInput(input: LocalRegisterInput): FieldErrors {
  const errors: FieldErrors = {};

  const usernameError = validateUsername(input.username);
  if (usernameError) {
    errors.username = usernameError;
  }

  const emailError = validateEmail(input.email);
  if (emailError) {
    errors.email = emailError;
  }

  const passwordError = validatePassword(input.password);
  if (passwordError) {
    errors.password = passwordError;
  }

  return errors;
}
