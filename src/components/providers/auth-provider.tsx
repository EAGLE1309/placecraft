"use client";

import { createContext, useContext, ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { AuthUser } from "@/types";
import { UserRole } from "@/lib/firebase/auth";

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  isAuthorized: boolean;
  role: UserRole;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAuthorized: false,
  role: null,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  return useContext(AuthContext);
}
