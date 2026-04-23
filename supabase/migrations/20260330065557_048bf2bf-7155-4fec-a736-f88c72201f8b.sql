CREATE TRIGGER set_student_auto_id
  BEFORE INSERT ON public.students
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_student_auto_id();

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.students
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();