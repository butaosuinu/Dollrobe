-- Migration: Add maker and customizer columns to dolls table
ALTER TABLE dolls ADD COLUMN maker TEXT;
ALTER TABLE dolls ADD COLUMN customizer TEXT;
