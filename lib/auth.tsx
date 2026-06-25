'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import { getClientAuth, googleProvider } from './firebase';
import { getAnonId } from './user';

export interface AuthIdentity {
  /** The id to send as reportedBy / userId. Real uid when signed in, else anon. */
  uid: string;
  name: string;
  email: string;
  avatarUrl?: string;
  isSignedIn: boolean;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  identity: AuthIdentity;
  signIn: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [anonId, setAnonId] = useState('');

  useEffect(() => {
    setAnonId(getAnonId());
    const unsub = onAuthStateChanged(getClientAuth(), (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  const identity = useMemo<AuthIdentity>(() => {
    if (user) {
      return {
        uid: user.uid,
        name: user.displayName ?? 'Citizen',
        email: user.email ?? '',
        avatarUrl: user.photoURL ?? undefined,
        isSignedIn: true,
      };
    }
    return {
      uid: anonId || 'anonymous',
      name: 'Anonymous Citizen',
      email: '',
      isSignedIn: false,
    };
  }, [user, anonId]);

  async function signIn() {
    await signInWithPopup(getClientAuth(), googleProvider);
  }

  async function logout() {
    await signOut(getClientAuth());
  }

  const value = useMemo(
    () => ({ user, loading, identity, signIn, logout }),
    [user, loading, identity],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
