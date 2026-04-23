-- ============================================================
-- FIX: Allow students to INSERT their own record during sign up
-- ============================================================

-- 1. Allow newly signed-up users to insert their own student record
--    (only if user_id matches their own auth.uid())
CREATE POLICY "Students can insert own record"
  ON public.students FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 2. Allow students to insert their own role during sign up
--    (only 'student' role, not 'admin')
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;

CREATE POLICY "Admins can insert roles"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR (user_id = auth.uid() AND role = 'student')
  );
