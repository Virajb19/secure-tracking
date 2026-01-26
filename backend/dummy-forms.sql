-- Get school and user IDs first
SELECT id, name FROM "School" LIMIT 5;
SELECT id, name, role FROM users WHERE role IN ('HEADMASTER', 'TEACHER') LIMIT 5;

-- Insert dummy form submissions
INSERT INTO form_submissions (id, school_id, submitted_by, form_type, status, submitted_at, created_at)
SELECT 
  gen_random_uuid(),
  s.id,
  u.id,
  f.form_type,
  'SUBMITTED',
  NOW() - INTERVAL '1 day' * (random() * 10)::int,
  NOW() - INTERVAL '1 day' * (random() * 15)::int
FROM "School" s
CROSS JOIN (
  SELECT '6A' as form_type UNION ALL
  SELECT '6B' UNION ALL
  SELECT '6C_LOWER' UNION ALL
  SELECT '6C_HIGHER' UNION ALL
  SELECT '6D'
) f
CROSS JOIN LATERAL (
  SELECT id FROM users WHERE role IN ('HEADMASTER', 'TEACHER') LIMIT 1
) u
LIMIT 10
ON CONFLICT (school_id, form_type) DO NOTHING;
