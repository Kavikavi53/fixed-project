
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'student');

-- Create payment status enum
CREATE TYPE public.payment_status AS ENUM ('paid', 'pending', 'late');

-- Create account status enum
CREATE TYPE public.account_status AS ENUM ('active', 'blocked');

-- Create stream enum
CREATE TYPE public.student_stream AS ENUM ('Arts', 'Commerce', 'Bio Science', 'Mathematics');

-- Create batch enum
CREATE TYPE public.student_batch AS ENUM ('2026', '2027');

-- ============ USER ROLES TABLE ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'student',
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (prevents recursive RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Admins can view all roles, users can view their own
CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR user_id = auth.uid());

CREATE POLICY "Admins can insert roles"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
  ON public.user_roles FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============ STUDENTS TABLE ============
CREATE TABLE public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  address TEXT,
  dob DATE,
  nic TEXT,
  email TEXT,
  school_id TEXT,
  batch student_batch NOT NULL DEFAULT '2026',
  stream student_stream NOT NULL DEFAULT 'Mathematics',
  student_phone TEXT NOT NULL,
  parent_name TEXT,
  parent_phone TEXT,
  profile_photo_url TEXT,
  auto_id TEXT NOT NULL UNIQUE,
  payment_status payment_status NOT NULL DEFAULT 'pending',
  account_status account_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do everything with students"
  ON public.students FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Students can view own record"
  ON public.students FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ============ PAYMENT HISTORY TABLE ============
CREATE TABLE public.payment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  month TEXT NOT NULL,
  status payment_status NOT NULL DEFAULT 'pending',
  paid_date DATE,
  amount INTEGER NOT NULL DEFAULT 500,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage payment history"
  ON public.payment_history FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Students view own payment history"
  ON public.payment_history FOR SELECT
  TO authenticated
  USING (
    student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
  );

-- ============ ANNOUNCEMENTS TABLE ============
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  urgent BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can read announcements"
  ON public.announcements FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins manage announcements"
  ON public.announcements FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============ AUDIT LOG TABLE ============
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  performed_by UUID REFERENCES auth.users(id),
  details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view audit log"
  ON public.audit_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert audit entries"
  ON public.audit_log FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ UPDATED_AT TRIGGER ============
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_students_updated_at
  BEFORE UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ AUTO-ID GENERATION FUNCTION ============
CREATE OR REPLACE FUNCTION public.generate_student_auto_id()
RETURNS TRIGGER AS $$
DECLARE
  stream_code TEXT;
  next_num INTEGER;
BEGIN
  CASE NEW.stream
    WHEN 'Arts' THEN stream_code := 'ARTS';
    WHEN 'Commerce' THEN stream_code := 'COM';
    WHEN 'Bio Science' THEN stream_code := 'BIO';
    WHEN 'Mathematics' THEN stream_code := 'MATH';
  END CASE;
  
  SELECT COALESCE(MAX(
    CAST(SPLIT_PART(auto_id, '-', 4) AS INTEGER)
  ), 0) + 1 INTO next_num
  FROM public.students
  WHERE batch = NEW.batch AND stream = NEW.stream;
  
  NEW.auto_id := 'AL-' || NEW.batch::TEXT || '-' || stream_code || '-' || LPAD(next_num::TEXT, 3, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER generate_auto_id
  BEFORE INSERT ON public.students
  FOR EACH ROW
  WHEN (NEW.auto_id IS NULL OR NEW.auto_id = '')
  EXECUTE FUNCTION public.generate_student_auto_id();

-- ============ REALTIME ============
ALTER PUBLICATION supabase_realtime ADD TABLE public.students;
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_history;
