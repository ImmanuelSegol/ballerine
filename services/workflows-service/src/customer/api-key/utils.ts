import { env } from '@/env';
import { faker } from '@faker-js/faker';
import { ApiKeyType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const ONE_DAY_IN_MS = 1000 * 60 * 60 * 24;
const PASSWORD_REGEX = /[!@#$%^&*a-zA-Z]/;
const API_KEY_LEN = 50;
const DEFAULT_HASHIING_OPTIONS = {
  key: undefined,
  expiresInDays: undefined,
  salt: env.HASHING_KEY_SECRET ?? env.BCRYPT_SALT,
};

export const hashKey = async (apiKey: string, salt?: string) => {
  return new Promise<string>((resolve, reject) => {
    if (apiKey && apiKey.length < 5) {
      return reject(new Error('Invalid key length'));
    }

    bcrypt.hash(apiKey, salt ?? env.HASHING_KEY_SECRET, (err, hashedKey) => {
      if (err) {
        reject(err);
      } else {
        resolve(hashedKey);
      }
    });
  });
};

export const generateHashedKey = async (options?: {
  key?: string | undefined;
  expiresInDays?: number | undefined;
  salt?: string | undefined;
}) => {
  const { key, expiresInDays, salt } = { ...DEFAULT_HASHIING_OPTIONS, ...options };

  const _key = key ?? faker.internet.password(API_KEY_LEN, false, PASSWORD_REGEX);

  const hashedKey = await hashKey(_key, salt);

  const validUntil = expiresInDays
    ? new Date(Date.now() + expiresInDays * ONE_DAY_IN_MS)
    : undefined;

  return { apiKey: _key, hashedKey, validUntil, type: ApiKeyType.one_way };
};

export const generateSalt = (rounds?: number): Promise<string> => {
  return new Promise((resolve, reject) => {
    bcrypt.genSalt(rounds ?? 10, (err, salt) => {
      if (err) {
        reject(err);
      } else {
        resolve(salt);
      }
    });
  });
};