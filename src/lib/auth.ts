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
    try {
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      // If query fails (network / RLS), retry
      if (rolesError && retryCount < 5) {
        retryRef.current = setTimeout(() => resolveRole(user, retryCount + 1), 1500);
        return;
      }

      const isAdmin = roles?.some(r => r.role === "admin") ?? false;
      const role: UserRole = isAdmin ? "admin" : "student";

      let studentId: string | undefined;
      if (role === "student") {
        // user_id-ல பாரு
        const { data: byUserId } = await supabase
          .from("students")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (byUserId) {
          studentId = byUserId.id;
        } else if (user.email) {
          // email-ல பாரு
          const { data: byEmail } = await supabase
            .from("students")
            .select("id")
            .eq("email", user.email)
            .maybeSingle();

          if (byEmail) {
            // user_id link பண்ணு (ignore errors — RLS or duplicate)
            try {
              await supabase
                .from("students")
                .update({ user_id: user.id })
                .eq("id", byEmail.id);
            } catch (_) { /* ignore */ }
            studentId = byEmail.id;
          }
        }

        // இன்னும் கிடைக்கல்லன்னா retry (max 20 × 1.5s = 30s)
        if (!studentId && retryCount < 20) {
          retryRef.current = setTimeout(() => {
            resolveRole(user, retryCount + 1);
          }, 1500);
          return;
        }

        // 30s-க்கு பிறகும் இல்லன்னா — last attempt: create student row
        if (!studentId) {
          try {
            const { data: newStudent, error: createErr } = await supabase
              .from("students")
              .upsert({
                user_id: user.id,
                email: user.email ?? "",
                full_name: user.user_metadata?.full_name ?? (user.email?.split("@")[0] ?? "Student"),
                student_phone: user.user_metadata?.student_phone ?? "",
                batch: (user.user_metadata?.batch ?? "2026") as any,
                stream: (user.user_metadata?.stream ?? "Mathematics") as any,
                auto_id: "",
                payment_status: "pending" as any,
                account_status: "active" as any,
              } as any, { onConflict: "user_id" })
              .select("id")
              .maybeSingle();
            if (!createErr && newStudent) {
              studentId = newStudent.id;
            }
          } catch (_) { /* ignore */ }

          // Still nothing — show ProfileSetupLoader
          if (!studentId) {
            setAppUser({
              id: user.id,
              email: user.email ?? "",
              role,
              studentId: undefined,
            });
            setLoading(false);
            return;
          }
        }
      }

      setAppUser({
        id: user.id,
        email: user.email ?? "",
        role,
        studentId,
      });
      setLoading(false);
    } catch (e) {
      console.error("resolveRole error:", e);
      if (retryCount < 20) {
        retryRef.current = setTimeout(() => resolveRole(user, retryCount + 1), 1500);
      } else {
        // Give up retrying — set user without studentId so they see the app
        setAppUser({
          id: user.id,
          email: user.email ?? "",
          role: "student",
          studentId: undefined,
        });
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      const user = session?.user ?? null;
      setSupabaseUser(user);
      if (user) {
        setLoading(true);
        // Small delay to let DB writes settle after signup
        setTimeout(() => {
          if (mounted) resolveRole(user);
        }, 300);
      } else {
        if (retryRef.current) clearTimeout(retryRef.current);
        setAppUser(null);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      const user = session?.user ?? null;
      setSupabaseUser(user);
      if (user) {
        resolveRole(user);
      } else {
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
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
