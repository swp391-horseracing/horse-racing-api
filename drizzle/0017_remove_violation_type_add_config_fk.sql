ALTER TABLE "violations"
  ADD COLUMN "violation_type_config_id" uuid REFERENCES "violation_type_config"("id"),
  DROP COLUMN "violation_type",
  DROP COLUMN "description";

ALTER TABLE "violations" ALTER COLUMN "violation_type_config_id" SET NOT NULL;
