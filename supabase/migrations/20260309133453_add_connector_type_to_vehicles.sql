/*
  # Add connector_type to vehicles table

  ## Summary
  Adds a nullable `connector_type` column to the `vehicles` table to support electric
  and plug-in hybrid vehicles specifying their charge connector standard.

  ## Changes
  ### Modified Tables
  - `vehicles`
    - New column: `connector_type` (text, nullable) — stores the EV/PHEV connector type.
      Accepted values: 'type2', 'ccs', 'chademo', 'schuko'. NULL for non-electric vehicles.

  ## Notes
  1. The column is nullable so existing rows are unaffected.
  2. No RLS changes required — the vehicles table already has appropriate policies.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'connector_type'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN connector_type text;
  END IF;
END $$;
