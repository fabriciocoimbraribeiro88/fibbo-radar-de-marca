
-- Add UPDATE RLS policy for instagram_comments (needed for sentiment analysis)
CREATE POLICY "Can update comments" 
ON public.instagram_comments 
FOR UPDATE 
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR (EXISTS (
    SELECT 1 FROM instagram_posts ip
    WHERE ip.id = instagram_comments.post_id 
    AND is_entity_accessible(auth.uid(), ip.entity_id)
  ))
);
