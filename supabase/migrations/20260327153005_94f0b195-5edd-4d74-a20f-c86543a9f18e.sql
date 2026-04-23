
-- Allow newly registered users to insert their own student record
CREATE POLICY "Users can insert own student record"
  ON public.students FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Allow newly registered users to assign themselves the student role
CREATE POLICY "Users can assign own student role"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() AND role = 'student');
