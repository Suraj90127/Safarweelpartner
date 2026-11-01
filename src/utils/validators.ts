/**
 * Validators
 */

export const isValidPhone = (phone: string): boolean => {
  // Supports 10-digit Indian mobile numbers
  const cleaned = phone.replace(/\D/g, '');
  return /^[6-9]\d{9}$/.test(cleaned);
};

export const isValidOtp = (otp: string): boolean => {
  return /^\d{6}$/.test(otp.trim());
};

export const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
};

export const isValidName = (name: string): boolean => {
  return name.trim().length >= 2 && name.trim().length <= 100;
};

export const sanitizePhone = (phone: string): string => {
  return phone.replace(/\D/g, '');
};
