
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { getCurrentUser, type CurrentUser } from "@/lib/api";

type AuthStatus =
  | "idle"
  | "loading"
  | "authenticated"
  | "unauthenticated";

type AuthContextType = {
  user: CurrentUser | null;
  status: AuthStatus;
  verifySession: () => Promise<CurrentUser | null>;
  setAuthenticatedUser: (user: CurrentUser) => void;
  clearAuth: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("idle");

  const userRef = useRef<CurrentUser | null>(null);
  const verificationRef = useRef<Promise<CurrentUser | null> | null>(null);

  const setAuthenticatedUser = useCallback((nextUser: CurrentUser) => {
    userRef.current = nextUser;
    setUser(nextUser);
    setStatus("authenticated");
  }, []);

  const verifySession = useCallback((): Promise<CurrentUser | null> => {
    if (userRef.current) {
      return Promise.resolve(userRef.current);
    }

    if (verificationRef.current) {
      return verificationRef.current;
    }

    setStatus("loading");

    const verification = getCurrentUser()
      .then((currentUser) => {
        userRef.current = currentUser;
        setUser(currentUser);
        setStatus("authenticated");
        return currentUser;
      })
      .catch(() => {
        userRef.current = null;
        setUser(null);
        setStatus("unauthenticated");
        return null;
      })
      .finally(() => {
        verificationRef.current = null;
      });

    verificationRef.current = verification;
    return verification;
  }, []);

  const clearAuth = useCallback(() => {
    userRef.current = null;
    verificationRef.current = null;
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        status,
        verifySession,
        setAuthenticatedUser,
        clearAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
