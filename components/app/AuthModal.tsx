'use client';

import { ArrowRight, Check, KeyRound, Lock, Mail, X } from 'lucide-react';
import { useState } from 'react';
import {
  loginLocalAccount,
  resetPasswordWithRecoveryCode,
  sendSupabasePasswordReset,
} from '@/lib/storage/auth';
import { isRemoteSupabaseConfigured } from '@/lib/storage/supabaseClient';
import { AuthSession } from '@/lib/types';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  onAuthenticated: (session: AuthSession) => void;
  onMoveForwardWithoutLogin: () => void;
  hasLocalScans: boolean;
}

export function AuthModal({
  open,
  onClose,
  onAuthenticated,
  onMoveForwardWithoutLogin,
  hasLocalScans,
}: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'recovery'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const remoteConfigured = isRemoteSupabaseConfigured();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setLoading(true);
    try {
      const session = await loginLocalAccount(email, password);
      onAuthenticated(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to log in.');
    } finally {
      setLoading(false);
    }
  };

  const handleRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setLoading(true);
    try {
      if (remoteConfigured) {
        await sendSupabasePasswordReset(email);
        setNotice(
          `Password reset link sent to ${email.trim().toLowerCase()}. Open the link from your inbox to set a new password.`,
        );
      } else {
        const session = await resetPasswordWithRecoveryCode(
          email,
          recoveryCode,
          newPassword,
        );
        onAuthenticated(session);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Password reset failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 py-6 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-heading"
    >
      <div className="stitch-dark-bg relative w-full max-w-md rounded-[28px] border border-white/15 p-6 sm:p-8 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close authentication modal"
          className="absolute top-4 right-4 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-[#1b1b1e] text-[#a1a1aa] hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        <p className="text-[11px] font-medium tracking-[0.12em] text-[#9e9ea6] uppercase">
          Dark Triad AI · Access
        </p>
        <h2
          id="auth-modal-heading"
          className="mt-2 text-2xl font-medium tracking-[-0.03em] text-[#f4f4f5]"
        >
          {mode === 'login' ? 'ARE YOU AN EXISTING USER?' : 'RECOVER YOUR ACCOUNT'}
        </h2>
        <p className="mt-1.5 text-xs leading-relaxed text-[#a1a1aa]">
          {mode === 'login'
            ? 'Log in with your saved email and password to restore your ratings, timeline, and tracker.'
            : remoteConfigured
              ? 'Enter your account email and we will send a secure password reset link to your inbox.'
              : 'Enter your email and recovery code saved during registration to set a new password.'}
        </p>

        {error && (
          <div className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-200">
            {error}
          </div>
        )}

        {notice && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-400/35 bg-emerald-500/15 px-3.5 py-2.5 text-xs text-emerald-100">
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{notice}</span>
          </div>
        )}

        {mode === 'login' ? (
          <form onSubmit={(e) => void handleLogin(e)} className="mt-5 space-y-3.5">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#d4d4d8]">
                Email
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#8e8e95]" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-white/15 bg-[#1a1a1d] py-2.5 pr-3.5 pl-10 text-sm text-[#f4f4f5] placeholder:text-[#6f6f76] focus:border-white/40 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-xs font-medium text-[#d4d4d8]">Password</label>
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setNotice('');
                    setMode('recovery');
                  }}
                  className="text-[11px] font-medium text-[#a1a1aa] hover:text-white underline underline-offset-4"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#8e8e95]" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-white/15 bg-[#1a1a1d] py-2.5 pr-3.5 pl-10 text-sm text-[#f4f4f5] placeholder:text-[#6f6f76] focus:border-white/40 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-[#f4f4f5] py-3 text-sm font-semibold text-[#0a0a0a] transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {loading ? 'VERIFYING...' : 'LOGIN'}
            </button>
          </form>
        ) : (
          <form onSubmit={(e) => void handleRecovery(e)} className="mt-5 space-y-3.5">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#d4d4d8]">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-white/15 bg-[#1a1a1d] px-3.5 py-2.5 text-sm text-[#f4f4f5] focus:border-white/40 focus:outline-none"
              />
            </div>

            {!remoteConfigured && (
              <>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#d4d4d8]">
                    Recovery Code
                  </label>
                  <div className="relative">
                    <KeyRound className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#8e8e95]" />
                    <input
                      type="text"
                      required
                      value={recoveryCode}
                      onChange={(e) => setRecoveryCode(e.target.value)}
                      placeholder="DT-XXXXXXXX"
                      className="w-full rounded-xl border border-white/15 bg-[#1a1a1d] py-2.5 pr-3.5 pl-10 text-sm uppercase text-[#f4f4f5] focus:border-white/40 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#d4d4d8]">
                    New Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full rounded-xl border border-white/15 bg-[#1a1a1d] px-3.5 py-2.5 text-sm text-[#f4f4f5] focus:border-white/40 focus:outline-none"
                  />
                </div>
              </>
            )}

            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 rounded-full bg-[#f4f4f5] py-2.5 text-xs font-semibold text-[#0a0a0a]"
              >
                {loading
                  ? 'SENDING...'
                  : remoteConfigured
                    ? 'SEND RESET LINK'
                    : 'RESET & LOGIN'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setError('');
                  setNotice('');
                  setMode('login');
                }}
                className="rounded-full border border-white/15 px-4 py-2.5 text-xs text-[#d4d4d8]"
              >
                Back
              </button>
            </div>
          </form>
        )}

        <div className="my-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-white/12" />
          <span className="text-[11px] font-medium tracking-[0.12em] text-[#8e8e95]">OR</span>
          <span className="h-px flex-1 bg-white/12" />
        </div>

        <button
          type="button"
          onClick={onMoveForwardWithoutLogin}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/25 bg-[#1c1c1f] px-4 py-3 text-xs font-semibold tracking-[0.04em] text-[#f4f4f5] hover:bg-[#27272c] transition-colors"
        >
          <span>MOVE FORWARD WITHOUT LOGGING IN</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>

        <p className="mt-2.5 text-center text-[11px] text-[#8e8e95]">
          {hasLocalScans
            ? 'Your previous local scan on this device will open directly.'
            : 'Completes a facial scan first so your dashboard contains real measurements.'}
        </p>
      </div>
    </div>
  );
}
