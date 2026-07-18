-- Migración: Agregar campo de link de maps/waze a la tabla workshops
-- Ejecutar en: Supabase Dashboard → SQL Editor

ALTER TABLE public.workshops
ADD COLUMN IF NOT EXISTS maps_link TEXT;
