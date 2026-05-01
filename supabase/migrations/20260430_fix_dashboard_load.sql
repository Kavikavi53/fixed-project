-- Fix: Ensure students can always see their own record even via email match
-- This handles the case where user_id might not be set yet after fresh signup

-- Drop existing SELECT policy and recreate with email fallback
DROP POLICY IF EXISTS "Students can view own record" ON public.students;

CREATE POLICY "Students can view own record"
  ON public.students FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR email = auth.email()
  );

-- Also ensure students can UPDATE their own user_id (for self-linking)
DROP POLICY IF EXISTS "Students can update own record" ON public.students;

CREATE POLICY "Students can update own record"
  ON public.students FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR email = auth.email())
  WITH CHECK (user_id = auth.uid() OR email = auth.email());
