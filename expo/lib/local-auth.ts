import AsyncStorage from '@react-native-async-storage/async-storage';
import { mockUsers } from '../mocks/data';
import type { User } from '../types';

export type PremiumTier = 'free' | 'basic' | 'premium' | 'elite';

export interface LocalAuthUser {
  id: string;
  email: string;
  name: string;
  passwordHash?: string;
  avatar?: string;
  bio?: string;
  location?: string;
  skillsToLearn: string[];
  skillsToTeach: string[];
  credits: number;
  premiumTier: PremiumTier;
  premiumExpiresAt?: number;
  role: string;
  authProvider?: 'email' | 'google' | 'apple';
  providerId?: string;
}

interface StoredUser extends LocalAuthUser {
  passwordHash?: string;
}

const USERS_KEY = '@skillswap/local_users';
const OTP_STORE_KEY = '@skillswap/local_otp';

interface OTPEntry {
  code: string;
  expiresAt: number;
  attempts: number;
}

function genId(): string {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function genToken(userId: string): string {
  return `mock-jwt.${btoa(JSON.stringify({ userId, iat: Date.now(), exp: Date.now() + 7 * 86400000 }))}`;
}

function verifyToken(token: string): { userId: string } | null {
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload));
    if (decoded.exp && Date.now() > decoded.exp) return null;
    return { userId: decoded.userId };
  } catch {
    return null;
  }
}

function userToPublic(u: StoredUser): LocalAuthUser {
  const { passwordHash, ...publicUser } = u;
  return publicUser;
}

function seedDefaultUsers(map: Record<string, StoredUser>): Record<string, StoredUser> {
  for (const mu of mockUsers) {
    const email = mu.id === '1' ? 'admin@leteski.app' : `user${mu.id}@leteski.app`;
    if (!Object.values(map).some(u => u.email === email)) {
      const id = genId();
      map[id] = {
        id,
        email,
        name: mu.name,
        avatar: mu.avatarUrl,
        bio: mu.bio,
        location: mu.location,
        skillsToLearn: mu.skillsWanted ?? [],
        skillsToTeach: (mu.skillsOffered ?? []).map(s => s.title),
        credits: mu.credits,
        premiumTier: (mu.premiumTier as PremiumTier) ?? 'free',
        premiumExpiresAt: mu.premiumExpiresAt ? new Date(mu.premiumExpiresAt).getTime() : undefined,
        role: (mu.role as string) ?? 'swap',
        passwordHash: '$2a$10$mockHash',
        authProvider: 'email',
      };
    }
  }
  return map;
}

async function loadUsers(): Promise<Record<string, StoredUser>> {
  try {
    const raw = await AsyncStorage.getItem(USERS_KEY);
    const parsed: Record<string, StoredUser> = raw ? JSON.parse(raw) : {};
    const seeded = seedDefaultUsers(parsed);
    if (!raw) {
      await AsyncStorage.setItem(USERS_KEY, JSON.stringify(seeded));
    }
    return seeded;
  } catch {
    const seeded = seedDefaultUsers({});
    return seeded;
  }
}

async function saveUsers(users: Record<string, StoredUser>): Promise<void> {
  try {
    await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
  } catch {
    // ignore
  }
}

async function loadOtpStore(): Promise<Record<string, OTPEntry>> {
  try {
    const raw = await AsyncStorage.getItem(OTP_STORE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function saveOtpStore(store: Record<string, OTPEntry>): Promise<void> {
  try {
    await AsyncStorage.setItem(OTP_STORE_KEY, JSON.stringify(store));
  } catch {
    // ignore
  }
}

function findUserByEmail(users: Record<string, StoredUser>, email: string): StoredUser | undefined {
  return Object.values(users).find(u => u.email === email.toLowerCase());
}

function findUserById(users: Record<string, StoredUser>, id: string): StoredUser | undefined {
  return users[id];
}

function findUserByProvider(
  users: Record<string, StoredUser>,
  provider: string,
  providerId: string,
): StoredUser | undefined {
  return Object.values(users).find(
    u => u.authProvider === provider && u.providerId === providerId,
  );
}

// ============================================================
// Public API — mirrors tRPC backend auth routes
// ============================================================

export interface AuthResult {
  token: string;
  user: LocalAuthUser;
}

export async function localSignIn(email: string, _password: string): Promise<AuthResult> {
  const users = await loadUsers();
  let user = findUserByEmail(users, email);

  if (!user) {
    const id = genId();
    user = {
      id,
      email: email.toLowerCase(),
      name: email.split('@')[0] || 'User',
      passwordHash: 'mock',
      skillsToLearn: [],
      skillsToTeach: [],
      credits: 50,
      premiumTier: 'free',
      role: 'swap',
      authProvider: 'email',
    };
    users[id] = user;
    await saveUsers(users);
  }

  const token = genToken(user.id);
  return { token, user: userToPublic(user) };
}

export async function localSignUp(email: string, _password: string, name: string): Promise<AuthResult> {
  const users = await loadUsers();
  const existing = findUserByEmail(users, email);
  if (existing) {
    throw new Error('User with this email already exists');
  }

  const id = genId();
  const user: StoredUser = {
    id,
    email: email.toLowerCase(),
    name: name || email.split('@')[0],
    passwordHash: 'mock',
    skillsToLearn: [],
    skillsToTeach: [],
    credits: 50,
    premiumTier: 'free',
    role: 'swap',
    authProvider: 'email',
  };
  users[id] = user;
  await saveUsers(users);

  const token = genToken(user.id);
  return { token, user: userToPublic(user) };
}

export async function localSendOtp(identifier: string): Promise<{ success: boolean; message: string; devCode: string }> {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const store = await loadOtpStore();
  store[identifier] = { code, expiresAt: Date.now() + 10 * 60 * 1000, attempts: 0 };
  await saveOtpStore(store);
  console.log('[LocalAuth] Dev OTP for', identifier, ':', code);
  return { success: true, message: `OTP sent to ${identifier}`, devCode: code };
}

export async function localVerifyOtp(identifier: string, code: string): Promise<AuthResult> {
  const store = await loadOtpStore();
  const entry = store[identifier];

  if (!entry || Date.now() > entry.expiresAt) {
    delete store[identifier];
    await saveOtpStore(store);
    throw new Error('Invalid or expired OTP');
  }

  if (entry.code !== code) {
    entry.attempts++;
    if (entry.attempts >= 5) {
      delete store[identifier];
    }
    await saveOtpStore(store);
    throw new Error('Invalid or expired OTP');
  }

  delete store[identifier];
  await saveOtpStore(store);

  const users = await loadUsers();
  let user = findUserByEmail(users, identifier);

  if (!user) {
    const isEmail = /@/.test(identifier);
    const id = genId();
    user = {
      id,
      email: isEmail ? identifier.toLowerCase() : `${identifier}@phone.temp`,
      name: isEmail ? identifier.split('@')[0] : 'User',
      passwordHash: 'mock',
      skillsToLearn: [],
      skillsToTeach: [],
      credits: 50,
      premiumTier: 'free',
      role: 'swap',
      authProvider: 'email',
    };
    users[id] = user;
    await saveUsers(users);
  }

  const token = genToken(user.id);
  return { token, user: userToPublic(user) };
}

export async function localOauthSignIn(
  provider: 'google' | 'apple',
  data: { providerId: string; email: string; name?: string; avatar?: string },
): Promise<AuthResult> {
  const users = await loadUsers();
  let user = findUserByProvider(users, provider, data.providerId);

  if (!user) {
    const existing = findUserByEmail(users, data.email);
    if (existing) {
      existing.authProvider = provider;
      existing.providerId = data.providerId;
      if (data.avatar) existing.avatar = data.avatar;
      user = existing;
    } else {
      const id = genId();
      user = {
        id,
        email: data.email.toLowerCase(),
        name: data.name || data.email.split('@')[0] || 'User',
        avatar: data.avatar,
        passwordHash: undefined,
        skillsToLearn: [],
        skillsToTeach: [],
        credits: 50,
        premiumTier: 'free',
        role: 'swap',
        authProvider: provider,
        providerId: data.providerId,
      };
      users[id] = user;
    }
    await saveUsers(users);
  }

  const token = genToken(user.id);
  return { token, user: userToPublic(user) };
}

export async function localRequestPasswordReset(email: string): Promise<{ success: boolean; message: string; devToken?: string }> {
  const users = await loadUsers();
  const user = findUserByEmail(users, email);
  if (!user) {
    return { success: true, message: 'If an account exists, a reset link has been sent' };
  }
  const devToken = genId();
  console.log('[LocalAuth] Dev reset token for', email, ':', devToken);
  return { success: true, message: 'If an account exists, a reset link has been sent', devToken };
}

export async function localGetCurrentUser(token: string): Promise<LocalAuthUser | null> {
  const decoded = verifyToken(token);
  if (!decoded) return null;
  const users = await loadUsers();
  const user = findUserById(users, decoded.userId);
  return user ? userToPublic(user) : null;
}
