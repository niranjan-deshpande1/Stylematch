import { createContext, useContext, type ReactNode } from "react";
import { useMutation, useQuery, type UseMutationResult } from "@tanstack/react-query";
import type { PublicUser, SessionResponse } from "@shared/schema";
import * as api from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type LoginInput = { username: string; password: string };
type RegisterInput = { email: string; username: string; password: string };

interface AuthContextValue {
  user: PublicUser | null;
  isGuest: boolean;
  /** True once the user is signed in or has chosen guest mode. */
  hasSession: boolean;
  isLoading: boolean;
  loginMutation: UseMutationResult<PublicUser, Error, LoginInput>;
  registerMutation: UseMutationResult<PublicUser, Error, RegisterInput>;
  guestMutation: UseMutationResult<SessionResponse, Error, void>;
  logoutMutation: UseMutationResult<void, Error, void>;
}

const SESSION_KEY = ["/api/session"];
const AuthContext = createContext<AuthContextValue | null>(null);

/** Replace the cached session and refetch everything else, since the owner changed. */
function resetSession(session: SessionResponse) {
  queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== SESSION_KEY[0] });
  queryClient.setQueryData(SESSION_KEY, session);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const { data, isLoading } = useQuery({ queryKey: SESSION_KEY, queryFn: api.getSession });

  const onError = (title: string) => (error: Error) => {
    toast({ title, description: error.message, variant: "destructive" });
  };

  const loginMutation = useMutation({
    mutationFn: api.login,
    onSuccess: (user) => resetSession({ user, isGuest: false }),
    onError: onError("login failed"),
  });

  const registerMutation = useMutation({
    mutationFn: api.register,
    onSuccess: (user) => {
      resetSession({ user, isGuest: false });
      toast({ title: "account created", description: "welcome to stylematch" });
    },
    onError: onError("sign up failed"),
  });

  const guestMutation = useMutation({
    mutationFn: api.startGuestSession,
    onSuccess: resetSession,
    onError: onError("couldn't start a guest session"),
  });

  const logoutMutation = useMutation({
    mutationFn: api.logout,
    onSuccess: () => resetSession({ user: null, isGuest: false }),
    onError: onError("logout failed"),
  });

  const user = data?.user ?? null;
  const isGuest = data?.isGuest ?? false;

  return (
    <AuthContext.Provider
      value={{
        user,
        isGuest,
        hasSession: Boolean(user) || isGuest,
        isLoading,
        loginMutation,
        registerMutation,
        guestMutation,
        logoutMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
