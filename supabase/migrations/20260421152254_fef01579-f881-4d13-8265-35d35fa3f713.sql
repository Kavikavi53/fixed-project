-- Enable full replica identity so realtime payloads include old row data (needed for DELETE events)
ALTER TABLE public.students REPLICA IDENTITY FULL;
ALTER TABLE public.announcements REPLICA IDENTITY FULL;
ALTER TABLE public.payment_history REPLICA IDENTITY FULL;
ALTER TABLE public.audit_log REPLICA IDENTITY FULL;

-- Ensure all tables are in the realtime publication
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='students') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.students;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='announcements') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='payment_history') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_history;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='audit_log') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_log;
  END IF;
END $$;