-- Insert dummy events (global events with no school_id)
INSERT INTO events (id, title, description, event_date, event_time, location, event_type, is_active, school_id, created_by, created_at, updated_at)
VALUES 
  (gen_random_uuid(), 'Annual Board Examination 2026', 'The annual board examinations for Class 10 and Class 12 students will commence.', '2026-03-15', '09:00 AM', 'All Examination Centers', 'EXAM', true, NULL, NULL, NOW(), NOW()),
  (gen_random_uuid(), 'Teachers Training Workshop', 'Mandatory workshop for all teachers on new teaching methodologies.', '2026-02-10', '10:00 AM', 'NBSE Head Office, Kohima', 'MEETING', true, NULL, NULL, NOW(), NOW()),
  (gen_random_uuid(), 'Republic Day Holiday', 'Schools will remain closed on account of Republic Day celebrations.', '2026-01-26', NULL, NULL, 'HOLIDAY', true, NULL, NULL, NOW(), NOW()),
  (gen_random_uuid(), 'Pre-Board Examination', 'Pre-board examination for all schools under NBSE.', '2026-02-01', '09:00 AM', 'Respective Schools', 'EXAM', true, NULL, NULL, NOW(), NOW()),
  (gen_random_uuid(), 'Staff Verification Meeting', 'Meeting for headmasters regarding staff verification process.', '2026-01-30', '11:00 AM', 'District Education Office', 'MEETING', true, NULL, NULL, NOW(), NOW()),
  (gen_random_uuid(), 'Summer Vacation Begins', 'Schools will close for summer vacation.', '2026-05-01', NULL, NULL, 'HOLIDAY', true, NULL, NULL, NOW(), NOW());

-- Insert dummy notices (global notices with no school_id)  
INSERT INTO notices (id, title, content, priority, published_at, expires_at, is_active, school_id, created_by, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'Form 6 Submission Deadline Extended', 'The deadline for Form 6 submission has been extended to January 31, 2026. All schools must complete their submissions by this date.', 'HIGH', NOW(), '2026-01-31', true, NULL, NULL, NOW(), NOW()),
  (gen_random_uuid(), 'New Guidelines for Question Paper Handling', 'Please review the updated guidelines for handling question papers during board examinations. Strict adherence is mandatory.', 'HIGH', NOW(), NULL, true, NULL, NULL, NOW(), NOW()),
  (gen_random_uuid(), 'Staff Verification Portal Updated', 'The staff verification portal has been updated with new features. Please login and verify your details.', 'NORMAL', NOW(), NULL, true, NULL, NULL, NOW(), NOW()),
  (gen_random_uuid(), 'Holiday List for Academic Year 2026', 'The official holiday list for the academic year 2026 has been released. Please check the circulars section for details.', 'NORMAL', NOW(), NULL, true, NULL, NULL, NOW(), NOW()),
  (gen_random_uuid(), 'Reminder: Complete Profile Verification', 'All faculty members are reminded to complete their profile verification before the deadline.', 'LOW', NOW(), '2026-02-15', true, NULL, NULL, NOW(), NOW());

-- Insert dummy circulars (global circulars with no school_id)
INSERT INTO circulars (id, circular_no, title, description, file_url, issued_by, issued_date, effective_date, is_active, school_id, created_by, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'NBSE/2026/001', 'Guidelines for Board Examination 2026', 'Detailed guidelines for conducting board examinations including rules for invigilators and exam centers.', NULL, 'Secretary, NBSE', '2026-01-15', '2026-01-20', true, NULL, NULL, NOW(), NOW()),
  (gen_random_uuid(), 'NBSE/2026/002', 'Fee Structure for Academic Year 2026-27', 'Revised fee structure for all affiliated schools for the upcoming academic year.', NULL, 'Director of Education', '2026-01-10', '2026-04-01', true, NULL, NULL, NOW(), NOW()),
  (gen_random_uuid(), 'NBSE/2026/003', 'Holiday Schedule 2026', 'Official holiday schedule for all NBSE affiliated schools for the calendar year 2026.', NULL, 'Secretary, NBSE', '2026-01-01', '2026-01-01', true, NULL, NULL, NOW(), NOW()),
  (gen_random_uuid(), 'NBSE/2025/045', 'Staff Verification Process', 'Instructions for headmasters on verifying teaching and non-teaching staff details.', NULL, 'Joint Secretary, NBSE', '2025-12-15', '2025-12-20', true, NULL, NULL, NOW(), NOW()),
  (gen_random_uuid(), 'NBSE/2025/044', 'Digital Examination System Implementation', 'Guidelines for implementing the new digital examination management system.', NULL, 'IT Department, NBSE', '2025-12-01', '2026-01-01', true, NULL, NULL, NOW(), NOW());
