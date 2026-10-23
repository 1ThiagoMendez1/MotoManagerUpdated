import { createHmac, randomBytes, randomInt } from 'node:crypto';

export function normalizeMobilePhone(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const digits = input.replace(/\D/g, '');
  const normalized = digits.length === 10 ? '57' + digits : digits;
  return /^57[0-9]{10}$/.test(normalized) ? normalized : null;
}

export function generateMobileCode(): string {
  return String(randomInt(100000, 1000000));
}

export function hashMobileCode(phone: string, code: string, pepper?: string): string {
  const secret = pepper ?? process.env.MOBILE_OTP_PEPPER;
  if (!secret || secret.length < 32) {
    throw new Error('MOBILE_OTP_PEPPER no configurada');
  }
  if (!normalizeMobilePhone(phone) || !/^[0-9]{6}$/.test(code)) {
    throw new Error('Desafío OTP inválido');
  }
  return createHmac('sha256', secret).update(phone + ':' + code).digest('hex');
}

export function generateTemporaryPassword(): string {
  return randomBytes(32).toString('base64url') + 'A1!';
}
