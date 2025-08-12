import { EmailData, ValidationResult } from '../types';

/**
 * Validates an email address format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates email data for sending
 */
export function validateEmailData(emailData: EmailData): ValidationResult {
  const errors: string[] = [];

  if (!emailData.to || !isValidEmail(emailData.to)) {
    errors.push('Invalid or missing recipient email address');
  }

  if (!emailData.from || !isValidEmail(emailData.from)) {
    errors.push('Invalid or missing sender email address');
  }

  if (!emailData.subject || emailData.subject.trim().length === 0) {
    errors.push('Email subject is required');
  }

  if (!emailData.text && !emailData.html) {
    errors.push('Email must contain either text or HTML content');
  }

  if (emailData.subject && emailData.subject.length > 200) {
    errors.push('Email subject is too long (max 200 characters)');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates SendGrid API key format
 */
export function isValidApiKey(apiKey: string): boolean {
  return typeof apiKey === 'string' && apiKey.length > 0 && apiKey.startsWith('SG.');
}

/**
 * Sanitizes email content to prevent injection attacks
 */
export function sanitizeEmailContent(content: string): string {
  return content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');
}
