import { AuthSession, AuthUser } from '../types';
import { idbDelete, idbGet, idbGetByIndex, idbPut } from './idb';
import { getSupabaseClient, isRemoteSupabaseConfigured } from './supabaseClient';

const ACTIVE_SESSION_KEY = 'active_auth_session';

function toHex(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function generateSalt(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return toHex(arr);
}

function generateRecoveryCode(): string {
  const arr = new Uint8Array(6);
  crypto.getRandomValues(arr);
  return `DT-${toHex(arr).slice(0, 8).toUpperCase()}`;
}

async function hashSecretWithSalt(secret: string, saltHex: string): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const derived = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: enc.encode(saltHex),
      iterations: 120000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256,
  );
  return toHex(derived);
}

export async function getActiveSession(): Promise<AuthSession | null> {
  if (isRemoteSupabaseConfigured()) {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data } = await supabase.auth.getSession();
        const sbSession = data.session;
        if (sbSession?.user) {
          const authSession: AuthSession = {
            userId: sbSession.user.id,
            email: sbSession.user.email ?? '',
            issuedAt: new Date().toISOString(),
            expiresAt: new Date(
              (sbSession.expires_at ?? Math.floor(Date.now() / 1000) + 3600) * 1000,
            ).toISOString(),
          };
          await idbPut('sessions', { key: ACTIVE_SESSION_KEY, session: authSession });
          return authSession;
        }
        return null;
      } catch {
        // Fallback to cached session only if network temporarily offline
      }
    }
  }

  const record = await idbGet<{ key: string; session: AuthSession }>(
    'sessions',
    ACTIVE_SESSION_KEY,
  );
  if (!record?.session) return null;
  if (new Date(record.session.expiresAt).getTime() <= Date.now()) {
    await idbDelete('sessions', ACTIVE_SESSION_KEY);
    return null;
  }
  return record.session;
}

export async function registerLocalAccount(
  emailRaw: string,
  password: string,
): Promise<{
  session: AuthSession | null;
  recoveryCode: string;
  pendingEmailVerification?: boolean;
}> {
  const email = emailRaw.trim().toLowerCase();
  if (!email || !email.includes('@')) {
    throw new Error('Please enter a valid email address.');
  }
  if (password.length < 6) {
    throw new Error('Password must be at least 6 characters long.');
  }

  if (isRemoteSupabaseConfigured()) {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo:
            typeof window !== 'undefined' ? window.location.origin : undefined,
        },
      });
      if (error) {
        throw new Error(error.message);
      }
      if (!data.session || !data.user) {
        return {
          session: null,
          recoveryCode: '',
          pendingEmailVerification: true,
        };
      }
      const session: AuthSession = {
        userId: data.user.id,
        email: data.user.email ?? email,
        issuedAt: new Date().toISOString(),
        expiresAt: new Date(
          (data.session.expires_at ?? Math.floor(Date.now() / 1000) + 86400) * 1000,
        ).toISOString(),
      };
      await idbPut('sessions', { key: ACTIVE_SESSION_KEY, session });
      return { session, recoveryCode: '', pendingEmailVerification: false };
    }
  }

  const existing = await idbGetByIndex<AuthUser>('users', 'email', email);
  if (existing.length > 0) {
    throw new Error('An account with this email already exists. Please log in instead.');
  }

  const salt = generateSalt();
  const passwordHash = await hashSecretWithSalt(password, salt);
  const recoveryCode = generateRecoveryCode();
  const recoveryCodeHash = await hashSecretWithSalt(recoveryCode, salt);

  const user: AuthUser = {
    id: crypto.randomUUID(),
    email,
    passwordHash,
    salt,
    recoveryCodeHash,
    createdAt: new Date().toISOString(),
  };

  await idbPut('users', user);

  const session: AuthSession = {
    userId: user.id,
    email: user.email,
    issuedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };

  await idbPut('sessions', { key: ACTIVE_SESSION_KEY, session });
  return { session, recoveryCode, pendingEmailVerification: false };
}

export async function loginLocalAccount(
  emailRaw: string,
  password: string,
): Promise<AuthSession> {
  const email = emailRaw.trim().toLowerCase();

  if (isRemoteSupabaseConfigured()) {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error || !data.user || !data.session) {
        throw new Error(error?.message || 'Unable to log in with Supabase.');
      }
      const session: AuthSession = {
        userId: data.user.id,
        email: data.user.email ?? email,
        issuedAt: new Date().toISOString(),
        expiresAt: new Date(
          (data.session.expires_at ?? Math.floor(Date.now() / 1000) + 86400) * 1000,
        ).toISOString(),
      };
      await idbPut('sessions', { key: ACTIVE_SESSION_KEY, session });
      return session;
    }
  }

  const matches = await idbGetByIndex<AuthUser>('users', 'email', email);
  const user = matches[0];
  if (!user) {
    throw new Error('No account found for this email on this device.');
  }

  const candidateHash = await hashSecretWithSalt(password, user.salt);
  if (candidateHash !== user.passwordHash) {
    throw new Error('Incorrect password. Please try again or use password recovery.');
  }

  const session: AuthSession = {
    userId: user.id,
    email: user.email,
    issuedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };

  await idbPut('sessions', { key: ACTIVE_SESSION_KEY, session });
  return session;
}

export async function sendSupabasePasswordReset(emailRaw: string): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('Cloud sync is not configured.');
  }
  const email = emailRaw.trim().toLowerCase();
  if (!email) {
    throw new Error('Please enter your email address.');
  }
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo:
      typeof window !== 'undefined' ? window.location.origin : undefined,
  });
  if (error) {
    throw new Error(error.message);
  }
}

export async function updateSupabasePassword(newPassword: string): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('Cloud sync is not configured.');
  }
  if (newPassword.length < 6) {
    throw new Error('New password must be at least 6 characters.');
  }
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    throw new Error(error.message);
  }
}

export async function resetPasswordWithRecoveryCode(
  emailRaw: string,
  recoveryCodeRaw: string,
  newPassword: string,
): Promise<AuthSession> {
  const email = emailRaw.trim().toLowerCase();
  const recoveryCode = recoveryCodeRaw.trim().toUpperCase();
  if (newPassword.length < 6) {
    throw new Error('New password must be at least 6 characters.');
  }

  const matches = await idbGetByIndex<AuthUser>('users', 'email', email);
  const user = matches[0];
  if (!user) {
    throw new Error('No account found with that email.');
  }

  const candidateRecovery = await hashSecretWithSalt(recoveryCode, user.salt);
  if (candidateRecovery !== user.recoveryCodeHash) {
    throw new Error('Invalid recovery code.');
  }

  const newSalt = generateSalt();
  const newPasswordHash = await hashSecretWithSalt(newPassword, newSalt);
  const newRecoveryHash = await hashSecretWithSalt(recoveryCode, newSalt);

  const updated: AuthUser = {
    ...user,
    salt: newSalt,
    passwordHash: newPasswordHash,
    recoveryCodeHash: newRecoveryHash,
  };
  await idbPut('users', updated);

  const session: AuthSession = {
    userId: user.id,
    email: user.email,
    issuedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };
  await idbPut('sessions', { key: ACTIVE_SESSION_KEY, session });
  return session;
}

export async function logoutLocalAccount(): Promise<void> {
  if (isRemoteSupabaseConfigured()) {
    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.auth.signOut().catch(() => {
        // Ignore offline signout network failures
      });
    }
  }
  await idbDelete('sessions', ACTIVE_SESSION_KEY);
}
