'use client';

import {
  Check,
  Copy,
  LogOut,
  Mail,
  Save,
  ShieldCheck,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { registerLocalAccount } from '@/lib/storage/auth';
import { DataService } from '@/lib/storage/dataService';
import { AuthSession, GenderOption, UserProfile } from '@/lib/types';

interface ProfileViewProps {
  profile: UserProfile;
  session: AuthSession | null;
  onProfileSaved: (updated: UserProfile) => void;
  onAccountLinked: (session: AuthSession) => void;
  onLogout: () => void;
}

export function ProfileView({
  profile,
  session,
  onProfileSaved,
  onAccountLinked,
  onLogout,
}: ProfileViewProps) {
  const [form, setForm] = useState<UserProfile>(profile);
  const [profileSavedFlag, setProfileSavedFlag] = useState(false);

  useEffect(() => {
    setForm(profile);
  }, [profile]);

  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regError, setRegError] = useState('');
  const [regSuccessMsg, setRegSuccessMsg] = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const [recoveryCodeBanner, setRecoveryCodeBanner] = useState<string>('');
  const [copiedRecovery, setCopiedRecovery] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const saved = await DataService.saveProfile(form);
    onProfileSaved(saved);
    setProfileSavedFlag(true);
    window.setTimeout(() => setProfileSavedFlag(false), 2600);
  };

  const handleRegisterAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    setRegSuccessMsg('');

    if (regPassword !== regConfirmPassword) {
      setRegError('Passwords do not match. Please enter the same password twice.');
      return;
    }

    setRegLoading(true);
    try {
      const {
        session: newSession,
        recoveryCode,
        pendingEmailVerification,
      } = await registerLocalAccount(regEmail, regPassword);

      if (pendingEmailVerification || !newSession) {
        setRegSuccessMsg(
          `Verification link sent to ${regEmail.trim().toLowerCase()}. Open the link in your inbox, then log in from Dashboard to keep your scans synced.`,
        );
        return;
      }

      await DataService.associateAnonymousData(newSession.userId, newSession.email);
      if (recoveryCode) {
        setRecoveryCodeBanner(recoveryCode);
      } else {
        setRegSuccessMsg(
          'Account linked successfully. Your scans, improvement protocol, and history stay backed up across sessions.',
        );
      }
      onAccountLinked(newSession);
    } catch (err) {
      setRegError(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setRegLoading(false);
    }
  };

  const copyRecovery = async () => {
    if (!recoveryCodeBanner) return;
    await navigator.clipboard.writeText(recoveryCodeBanner);
    setCopiedRecovery(true);
    window.setTimeout(() => setCopiedRecovery(false), 2000);
  };

  return (
    <ol className="max-w-3xl space-y-0">
      {/* 1. Personal Calibration & Fitness Context */}
      <li className="relative flex gap-4 pb-10">
        <span
          aria-hidden="true"
          className="absolute left-[13px] top-8 bottom-0 w-px bg-white/14"
        />
        <div className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/22 bg-[#1c1c20] text-xs font-medium text-[#f4f4f5] tabular-nums">
          1
        </div>

        <form
          onSubmit={(e) => void handleSaveProfile(e)}
          className="min-w-0 flex-1 space-y-5 pt-0.5"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium tracking-[0.12em] text-[#8e8e95] uppercase">
                Personal Profile
              </p>
              <h1 className="mt-1 text-2xl font-medium tracking-tight text-[#f4f4f5]">
                Calibration &amp; Fitness Context
              </h1>
            </div>

            {profileSavedFlag && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/35 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-200">
                <Check className="h-3.5 w-3.5" />
                <span>Saved</span>
              </span>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs text-[#a1a1aa]">Name (optional)</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Your name"
                className="w-full rounded-xl border border-white/12 bg-[#18181b] px-3.5 py-2.5 text-sm text-[#f4f4f5] focus:border-white/35 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs text-[#a1a1aa]">Age (optional)</label>
              <input
                type="number"
                min={13}
                max={99}
                value={form.age ?? ''}
                onChange={(e) =>
                  setForm({ ...form, age: e.target.value ? Number(e.target.value) : null })
                }
                placeholder="e.g. 21"
                className="w-full rounded-xl border border-white/12 bg-[#18181b] px-3.5 py-2.5 text-sm text-[#f4f4f5] focus:border-white/35 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs text-[#a1a1aa]">Gender (optional)</label>
              <select
                value={form.gender}
                onChange={(e) =>
                  setForm({ ...form, gender: e.target.value as GenderOption })
                }
                className="w-full rounded-xl border border-white/12 bg-[#18181b] px-3.5 py-2.5 text-sm text-[#f4f4f5] focus:border-white/35 focus:outline-none"
              >
                <option value="">Prefer not to specify</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs text-[#a1a1aa]">Body Frame (optional)</label>
              <select
                value={form.bodyFrame}
                onChange={(e) =>
                  setForm({
                    ...form,
                    bodyFrame: e.target.value as UserProfile['bodyFrame'],
                  })
                }
                className="w-full rounded-xl border border-white/12 bg-[#18181b] px-3.5 py-2.5 text-sm text-[#f4f4f5] focus:border-white/35 focus:outline-none"
              >
                <option value="">Select frame</option>
                <option value="ectomorph_lean">Lean / Narrow Frame</option>
                <option value="mesomorph_medium">Medium / Athletic Frame</option>
                <option value="endomorph_broad">Broad / Heavy Frame</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs text-[#a1a1aa]">Height (cm, optional)</label>
              <input
                type="number"
                min={120}
                max={230}
                value={form.heightCm ?? ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    heightCm: e.target.value ? Number(e.target.value) : null,
                  })
                }
                placeholder="e.g. 176"
                className="w-full rounded-xl border border-white/12 bg-[#18181b] px-3.5 py-2.5 text-sm text-[#f4f4f5] focus:border-white/35 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs text-[#a1a1aa]">Weight (kg, optional)</label>
              <input
                type="number"
                min={30}
                max={220}
                value={form.weightKg ?? ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    weightKg: e.target.value ? Number(e.target.value) : null,
                  })
                }
                placeholder="e.g. 70"
                className="w-full rounded-xl border border-white/12 bg-[#18181b] px-3.5 py-2.5 text-sm text-[#f4f4f5] focus:border-white/35 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs text-[#a1a1aa]">
                Dietary Preferences (optional)
              </label>
              <input
                type="text"
                value={form.dietaryPreferences}
                onChange={(e) =>
                  setForm({ ...form, dietaryPreferences: e.target.value })
                }
                placeholder="e.g. Vegetarian, Eggitarian, Non-Veg Indian"
                className="w-full rounded-xl border border-white/12 bg-[#18181b] px-3.5 py-2.5 text-sm text-[#f4f4f5] focus:border-white/35 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs text-[#a1a1aa]">
                Fitness Goals (optional)
              </label>
              <input
                type="text"
                value={form.fitnessGoals}
                onChange={(e) => setForm({ ...form, fitnessGoals: e.target.value })}
                placeholder="e.g. Lean out to 13% BF, build neck & shoulders"
                className="w-full rounded-xl border border-white/12 bg-[#18181b] px-3.5 py-2.5 text-sm text-[#f4f4f5] focus:border-white/35 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-full bg-[#f4f4f5] px-6 py-2.5 text-xs font-semibold text-[#0a0a0a] hover:opacity-95 transition-opacity"
          >
            <Save className="h-3.5 w-3.5" />
            <span>Save Profile Context</span>
          </button>
        </form>
      </li>

      {/* 2. Save Your Data in an Email */}
      <li className="relative flex gap-4 pt-2">
        <div className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/22 bg-[#1c1c20] text-xs font-medium text-[#f4f4f5] tabular-nums">
          2
        </div>

        <div className="min-w-0 flex-1 space-y-4 pt-0.5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium tracking-[0.12em] text-[#8e8e95] uppercase">
                Account Sync
              </p>
              <h2 className="mt-1 text-xl font-medium text-[#f4f4f5]">
                Save Your Data in an Email
              </h2>
            </div>
            {session && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/35 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-200">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Signed in</span>
              </span>
            )}
          </div>

          {regSuccessMsg && (
            <div className="border-l-2 border-emerald-400/70 pl-3.5 py-1 text-xs text-emerald-200 leading-relaxed">
              {regSuccessMsg}
            </div>
          )}

          {recoveryCodeBanner && (
            <div className="rounded-xl border border-amber-400/35 bg-amber-500/10 p-4 text-xs text-amber-100 space-y-2">
              <p className="font-semibold">
                Account Created — save this recovery code safely (shown once):
              </p>
              <div className="flex items-center justify-between gap-2 rounded-lg bg-black/40 px-3 py-2 font-mono text-sm">
                <span>{recoveryCodeBanner}</span>
                <button
                  type="button"
                  onClick={() => void copyRecovery()}
                  className="inline-flex items-center gap-1 text-xs text-amber-200 hover:text-white"
                >
                  <Copy className="h-3.5 w-3.5" />
                  <span>{copiedRecovery ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
          )}

          {session ? (
            <div className="space-y-4">
              <p className="text-xs leading-relaxed text-[#d4d4d8]">
                Signed in as <strong className="text-[#f4f4f5]">{session.email}</strong>.
                Your scans, facial measurements, improvement protocol, daily tracker
                entries, and chat histories stay linked to this account across sessions.
              </p>

              <button
                type="button"
                onClick={onLogout}
                className="inline-flex items-center gap-2 rounded-full border border-red-400/35 bg-red-500/10 px-5 py-2.5 text-xs font-semibold tracking-[0.06em] text-red-200 hover:bg-red-500/20"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Log Out</span>
              </button>
            </div>
          ) : (
            <form onSubmit={(e) => void handleRegisterAccount(e)} className="space-y-4">
              <p className="text-xs leading-relaxed text-[#a1a1aa]">
                Register an email and password to link your existing facial ratings,
                selfies, improvement protocol, progress logs, and AI chat history.
              </p>

              {regError && (
                <div className="border-l-2 border-red-400/70 pl-3.5 py-1 text-xs text-red-200">
                  {regError}
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="relative">
                  <Mail className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#8e8e95]" />
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="Email address"
                    className="w-full rounded-xl border border-white/12 bg-[#18181b] py-2.5 pr-3.5 pl-10 text-sm text-[#f4f4f5] focus:border-white/35 focus:outline-none"
                  />
                </div>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Password (6+ chars)"
                  className="w-full rounded-xl border border-white/12 bg-[#18181b] px-3.5 py-2.5 text-sm text-[#f4f4f5] focus:border-white/35 focus:outline-none"
                />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={regConfirmPassword}
                  onChange={(e) => setRegConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  className="w-full rounded-xl border border-white/12 bg-[#18181b] px-3.5 py-2.5 text-sm text-[#f4f4f5] focus:border-white/35 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={regLoading}
                className="rounded-full bg-[#f4f4f5] px-6 py-2.5 text-xs font-semibold text-[#0a0a0a] disabled:opacity-50"
              >
                {regLoading ? 'Linking Data...' : 'Create Account & Link Data'}
              </button>
            </form>
          )}
        </div>
      </li>
    </ol>
  );
}
