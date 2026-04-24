import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import type { UserRole } from "./store";

const ACCESS_CODE = "AKK2026";

export interface AppUser {
  id: string;
  email: string;
  role: UserRole;
  studentId?: string;
}

export function useAuth() {
  const [accessGranted, setAccessGranted] = useState(() => {
    return sessionStorage.getItem("amv_access") === "true";
  });
  const [supabaseUser, setSupabaseUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resolveRole = useCallback(async (user: User, retryCount = 0) => {
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const isAdmin = roles?.some(r => r.role === "admin") ?? false;
    const role: UserRole = isAdmin ? "admin" : "student";

    let studentId: string | undefined;
    if (role === "student") {
      const { data: byUserId } = await supabase
        .from("students")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (byUserId) {
        studentId = byUserId.id;
      } else if (user.email) {
        const { data: byEmail } = await supabase
          .from("students")
          .select("id")
          .eq("email", user.email)
          .maybeSingle();

        if (byEmail) {
          await supabase
            .from("students")
            .update({ user_id: user.id })
            .eq("id", byEmail.id);
          studentId = byEmail.id;
        }
      }

      if (!studentId && retryCount < 5) {
        retryRef.current = setTimeout(() => {
          resolveRole(user, retryCount + 1);
        }, 1000);
        return;
      }
    }

    setAppUser({
      id: user.id,
      email: user.email ?? "",
      role,
      studentId,
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const user = session?.user ?? null;
      setSupabaseUser(user);
      if (user) {
        setLoading(true);
        setTimeout(() => resolveRole(user), 500);
      } else {
        setAppUser(null);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user ?? null;
      setSupabaseUser(user);
      if (user) {
        resolveRole(user);
      } else {
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
      if (retryRef.current) clearTimeout(retryRef.current);
    };
  }, [resolveRole]);

  const verifyAccessCode = useCallback((code: string): boolean => {
    if (code.trim().toUpperCase() === ACCESS_CODE) {
      setAccessGranted(true);
      sessionStorage.setItem("amv_access", "true");
      return true;
    }
    return false;
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { success: false, error: error.message };
    return { success: true };
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setAppUser(null);
    setSupabaseUser(null);
  }, []);

  return { accessGranted, user: appUser, supabaseUser, loading, verifyAccessCode, login, logout };
}