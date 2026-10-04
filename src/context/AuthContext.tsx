import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import type { Profile } from '@/types';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { isAmritaEmail } from '@/utils/auth';

/**
 * Authentication store backed by Supabase Auth.
 * - Email + password sign in/up
 * - Magic link sign in (OTP)
 * - Password reset
 * - Profile loaded from the `profiles` table
 */

interface AuthContextValue {
  configured: boolean;
  loading: boolean;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isAmrita: boolean;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  /** Returns the session if email confirmation is disabled (instant sign-in). */
  signUp: (
    email: string,
    password: string,
    fullName: string,
  ) => Promise<{ session: Session | null }>;
  signInWithMagicLink: (email: string) => Promise<void>;
  /** Resend the sign-up confirmation email for an existing (unconfirmed) user. */
  resendConfirmation: (email: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState<boolean>(isSupabaseConfigured);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  /* Load the profile whenever the user changes. */
  useEffect(() => {
    if (!supabase || !session?.user) {
      setProfile(null);
      return;
    }
    let mounted = true;
    void (async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();
        if (!mounted) return;
        if (data) {
          setProfile(data as Profile);
        } else {
          // Fallback if the trigger hasn't fired yet.
          const email = session.user.email ?? '';
          setProfile({
            id: session.user.id,
            email,
            full_name: (session.user.user_metadata?.full_name as string) ?? email.split('@')[0],
            is_amrita: isAmritaEmail(email),
            created_at: new Date().toISOString(),
          });
        }
      } catch {
        if (mounted) setProfile(null);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [session]);

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    if (!supabase) throw new Error('Supabase is not configured.');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    // Don't try to manually flush session state here — callers that need to
    // navigate post-signin use window.location.replace (full reload), which
    // re-mounts the app from the persisted cookie and avoids every React
    // state/effect race.
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    if (!supabase) throw new Error('Supabase is not configured.');
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) throw error;
    if (data.session) {
      setSession(data.session);
      return { session: data.session };
    }
    return { session: null };
  }, []);

  const signInWithMagicLink = useCallback(async (email: string) => {
    if (!supabase) throw new Error('Supabase is not configured.');
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) throw error;
    // Magic links don't produce a session here — user clicks the link in
    // their email, which lands on /auth/callback. Nothing to wait for.
  }, []);

  const resendConfirmation = useCallback(async (email: string) => {
    if (!supabase) throw new Error('Supabase is not configured.');
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    if (error) throw error;
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    if (!supabase) throw new Error('Supabase is not configured.');
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset`,
    });
    if (error) throw error;
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    if (!supabase) throw new Error('Supabase is not configured.');
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  }, []);

  // Derive isAmrita from the session email the instant a session lands
  // (faster than waiting for the profiles-table fetch, so the brand swaps
  // on the first render after sign-in — no CivicEye flash for Amrita users).
  const isAmrita = Boolean(
    profile?.is_amrita ?? (session?.user?.email ? isAmritaEmail(session.user.email) : false),
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      configured: isSupabaseConfigured,
      loading,
      session,
      user: session?.user ?? null,
      profile,
      isAmrita,
      signInWithPassword,
      signUp,
      signInWithMagicLink,
      resendConfirmation,
      resetPassword,
      updatePassword,
      signOut,
    }),
    [
      loading,
      session,
      profile,
      isAmrita,
      signInWithPassword,
      signUp,
      signInWithMagicLink,
      resendConfirmation,
      resetPassword,
      updatePassword,
      signOut,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export { AuthContext };
