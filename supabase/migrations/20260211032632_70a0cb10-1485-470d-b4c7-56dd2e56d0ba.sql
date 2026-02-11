
-- Add baseline_value, responsible and metric_direction to okr_key_results
ALTER TABLE public.okr_key_results
  ADD COLUMN IF NOT EXISTS baseline_value DECIMAL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS responsible TEXT,
  ADD COLUMN IF NOT EXISTS metric_direction TEXT DEFAULT 'increase';

-- Add DELETE policy for okr_key_results
CREATE POLICY "Can delete key results"
ON public.okr_key_results
FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR (
    EXISTS (
      SELECT 1 FROM okr_objectives o
      WHERE o.id = okr_key_results.objective_id
      AND is_project_member(auth.uid(), o.project_id)
    )
  )
);

-- Add DELETE policy for okr_objectives
CREATE POLICY "Can delete objectives"
ON public.okr_objectives
FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR is_project_member(auth.uid(), project_id)
);

-- Add DELETE policy for okr_measurements
CREATE POLICY "Can delete measurements"
ON public.okr_measurements
FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR (
    EXISTS (
      SELECT 1 FROM okr_key_results kr
      JOIN okr_objectives o ON kr.objective_id = o.id
      WHERE kr.id = okr_measurements.key_result_id
      AND is_project_member(auth.uid(), o.project_id)
    )
  )
);

-- Add UPDATE policy for okr_measurements
CREATE POLICY "Can update measurements"
ON public.okr_measurements
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR (
    EXISTS (
      SELECT 1 FROM okr_key_results kr
      JOIN okr_objectives o ON kr.objective_id = o.id
      WHERE kr.id = okr_measurements.key_result_id
      AND is_project_member(auth.uid(), o.project_id)
    )
  )
);
