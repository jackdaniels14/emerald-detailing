// Form validation helpers

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

// Email validation
export function validateEmail(email: string): ValidationResult {
  if (!email || email.trim() === '') {
    return { isValid: false, error: 'Email is required' };
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }
  return { isValid: true };
}

// Phone validation (US format)
export function validatePhone(phone: string, required = false): ValidationResult {
  if (!phone || phone.trim() === '') {
    if (required) {
      return { isValid: false, error: 'Phone number is required' };
    }
    return { isValid: true };
  }
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10) {
    return { isValid: false, error: 'Please enter a valid 10-digit phone number' };
  }
  if (digits.length > 11) {
    return { isValid: false, error: 'Phone number is too long' };
  }
  return { isValid: true };
}

// Format phone for display
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits[0] === '1') {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return phone;
}

// Name validation
export function validateName(name: string, fieldName = 'Name'): ValidationResult {
  if (!name || name.trim() === '') {
    return { isValid: false, error: `${fieldName} is required` };
  }
  if (name.trim().length < 2) {
    return { isValid: false, error: `${fieldName} must be at least 2 characters` };
  }
  if (name.trim().length > 100) {
    return { isValid: false, error: `${fieldName} is too long` };
  }
  return { isValid: true };
}

// Date validation (not in past)
export function validateFutureDate(date: string | Date): ValidationResult {
  const inputDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (isNaN(inputDate.getTime())) {
    return { isValid: false, error: 'Please enter a valid date' };
  }
  if (inputDate < today) {
    return { isValid: false, error: 'Date cannot be in the past' };
  }
  return { isValid: true };
}

// Required field validation
export function validateRequired(value: string | undefined | null, fieldName: string): ValidationResult {
  if (!value || value.trim() === '') {
    return { isValid: false, error: `${fieldName} is required` };
  }
  return { isValid: true };
}

// Zip code validation
export function validateZipCode(zip: string, required = false): ValidationResult {
  if (!zip || zip.trim() === '') {
    if (required) {
      return { isValid: false, error: 'ZIP code is required' };
    }
    return { isValid: true };
  }
  const zipRegex = /^\d{5}(-\d{4})?$/;
  if (!zipRegex.test(zip)) {
    return { isValid: false, error: 'Please enter a valid ZIP code (e.g., 12345 or 12345-6789)' };
  }
  return { isValid: true };
}

// URL validation
export function validateUrl(url: string, required = false): ValidationResult {
  if (!url || url.trim() === '') {
    if (required) {
      return { isValid: false, error: 'URL is required' };
    }
    return { isValid: true };
  }
  try {
    new URL(url);
    return { isValid: true };
  } catch {
    return { isValid: false, error: 'Please enter a valid URL (e.g., https://example.com)' };
  }
}

// Number range validation
export function validateNumberRange(
  value: number,
  min: number,
  max: number,
  fieldName: string
): ValidationResult {
  if (isNaN(value)) {
    return { isValid: false, error: `${fieldName} must be a number` };
  }
  if (value < min) {
    return { isValid: false, error: `${fieldName} must be at least ${min}` };
  }
  if (value > max) {
    return { isValid: false, error: `${fieldName} must be no more than ${max}` };
  }
  return { isValid: true };
}

// Password validation
export function validatePassword(password: string): ValidationResult {
  if (!password || password.length < 8) {
    return { isValid: false, error: 'Password must be at least 8 characters' };
  }
  if (!/[A-Z]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one uppercase letter' };
  }
  if (!/[a-z]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one lowercase letter' };
  }
  if (!/[0-9]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one number' };
  }
  return { isValid: true };
}

// Booking conflict check helper
export interface BookingSlot {
  date: Date;
  time: string; // Hour as string e.g., "9", "14"
  employeeId?: string;
  duration?: number; // in hours
}

export function checkBookingConflict(
  newBooking: BookingSlot,
  existingBookings: BookingSlot[]
): { hasConflict: boolean; conflictingBooking?: BookingSlot } {
  const newDate = new Date(newBooking.date).toDateString();
  const newHour = parseInt(newBooking.time);
  const newDuration = newBooking.duration || 2; // Default 2 hours
  const newEndHour = newHour + newDuration;

  for (const existing of existingBookings) {
    // Skip if different employee (if employee is specified)
    if (newBooking.employeeId && existing.employeeId &&
        newBooking.employeeId !== existing.employeeId) {
      continue;
    }

    const existingDate = new Date(existing.date).toDateString();
    if (existingDate !== newDate) continue;

    const existingHour = parseInt(existing.time);
    const existingDuration = existing.duration || 2;
    const existingEndHour = existingHour + existingDuration;

    // Check for overlap
    if (
      (newHour >= existingHour && newHour < existingEndHour) ||
      (newEndHour > existingHour && newEndHour <= existingEndHour) ||
      (newHour <= existingHour && newEndHour >= existingEndHour)
    ) {
      return { hasConflict: true, conflictingBooking: existing };
    }
  }

  return { hasConflict: false };
}

// Form-wide validation helper
export interface FieldValidation {
  field: string;
  value: any;
  validations: Array<(value: any) => ValidationResult>;
}

export function validateForm(fields: FieldValidation[]): {
  isValid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};

  for (const field of fields) {
    for (const validate of field.validations) {
      const result = validate(field.value);
      if (!result.isValid) {
        errors[field.field] = result.error || 'Invalid value';
        break;
      }
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}
