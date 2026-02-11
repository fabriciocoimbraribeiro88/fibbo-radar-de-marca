
ALTER TABLE planning_calendars DROP CONSTRAINT planning_calendars_status_check;
ALTER TABLE planning_calendars ADD CONSTRAINT planning_calendars_status_check CHECK (status = ANY (ARRAY['draft','titles_review','briefings_review','approved','active','completed']));

ALTER TABLE planning_calendars DROP CONSTRAINT planning_calendars_type_check;
ALTER TABLE planning_calendars ADD CONSTRAINT planning_calendars_type_check CHECK (type = ANY (ARRAY['social_media','social','seo','ads','integrated']));
