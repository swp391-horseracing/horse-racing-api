ALTER TABLE "race_result_entries"
  DROP COLUMN "violation_id",
  DROP COLUMN "previous_points",
  DROP COLUMN "previous_finish_status";

ALTER TABLE "violations"
  ADD COLUMN "previous_points" integer,
  ADD COLUMN "previous_finish_status" "finish_status";
