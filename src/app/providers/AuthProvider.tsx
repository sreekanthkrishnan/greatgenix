import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../../shared/lib/supabase";
const AuthContext = createContext<{
  session: Session | null;
  loading: boolean;
  recovery: boolean;
  finishRecovery: () => void;
}>({ session: null, loading: true, recovery: false, finishRecovery: () => {} });
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [recovery, setRecovery] = useState(
    new URLSearchParams(location.search).has("recovery"),
  );
  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, next) => {
      if (!alive) return;
      setSession(next);
      setLoading(false);
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (alive) {
        setSession(data.session);
        setLoading(false);
      }
    });
    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, []);
  return (
    <AuthContext.Provider
      value={{
        session,
        loading,
        recovery,
        finishRecovery: () => {
          setRecovery(false);
          history.replaceState(null, "", location.pathname);
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export const useAuth = () => useContext(AuthContext);
