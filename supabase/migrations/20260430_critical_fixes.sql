-- Fix 1: Add 2028 and 2029 batch values to ENUM
ALTER TYPE public.student_batch ADD VALUE IF NOT EXISTS '2028';
ALTER TYPE public.student_batch ADD VALUE IF NOT EXISTS '2029';

-- Fix 2: Add gender column to students table
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS gender TEXT;
