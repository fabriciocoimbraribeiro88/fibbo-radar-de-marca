-- Fix: Set view to SECURITY INVOKER so RLS policies of the querying user apply
ALTER VIEW v_entity_dashboard_metrics SET (security_invoker = on);