/*
  # Add body_type and powertrain columns to vehicles table

  ## Changes
  - `vehicles` table: add `body_type` text column (e.g. "suv", "sedan", "hatchback", "coupe", "pickup", "estate", "van")
  - `vehicles` table: add `powertrain` text column (e.g. "combustion", "hybrid", "plugin_hybrid", "electric")

  Both columns are optional (nullable) and default to empty string for backwards compatibility.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'body_type'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN body_type text NOT NULL DEFAULT '';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'powertrain'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN powertrain text NOT NULL DEFAULT '';
  END IF;
END $$;
