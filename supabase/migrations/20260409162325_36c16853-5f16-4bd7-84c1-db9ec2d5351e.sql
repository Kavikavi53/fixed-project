
INSERT INTO storage.buckets (id, name, public) VALUES ('student-photos', 'student-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view student photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'student-photos');

CREATE POLICY "Authenticated users can upload student photos" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'student-photos');

CREATE POLICY "Authenticated users can update student photos" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'student-photos');
