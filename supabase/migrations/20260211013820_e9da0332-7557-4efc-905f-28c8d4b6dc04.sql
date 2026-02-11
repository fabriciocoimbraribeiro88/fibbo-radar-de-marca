CREATE POLICY "Members can delete analyses"
ON public.analyses
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role) OR is_project_member(auth.uid(), project_id));

-- Also allow deleting related sections
CREATE POLICY "Can delete sections"
ON public.analysis_sections
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role) OR (EXISTS (
  SELECT 1 FROM analyses a
  WHERE a.id = analysis_sections.analysis_id AND is_project_member(auth.uid(), a.project_id)
)));