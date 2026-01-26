-- Insert Events
INSERT INTO events (id, title, description, event_date, event_time, location, event_type, is_active) VALUES
('e1a11111-1111-1111-1111-111111111111', 'HSLC Final Examination 2025', 'Annual Board Examination for Class 10 students', '2025-02-15', '9:00 AM', 'Respective Exam Centers', 'EXAM', true),
('e2a22222-2222-2222-2222-222222222222', 'HS Final Examination 2025', 'Annual Board Examination for Class 12 students', '2025-02-20', '9:00 AM', 'Respective Exam Centers', 'EXAM', true),
('e3a33333-3333-3333-3333-333333333333', 'Republic Day Celebration', 'Republic Day holiday and celebration', '2025-01-26', '8:00 AM', 'School Campus', 'HOLIDAY', true),
('e4a44444-4444-4444-4444-444444444444', 'Principal Meeting - Exam Preparation', 'Meeting for all principals regarding exam preparation and guidelines', '2025-01-28', '10:00 AM', 'SEBA Conference Hall, Guwahati', 'MEETING', true),
('e5a55555-5555-5555-5555-555555555555', 'Saraswati Puja', 'Saraswati Puja celebration and holiday', '2025-02-02', NULL, 'School Campus', 'HOLIDAY', true),
('e6a66666-6666-6666-6666-666666666666', 'Question Paper Distribution', 'Distribution of sealed question papers to exam centers', '2025-02-14', '2:00 PM', 'District Education Office', 'EXAM', true);

-- Insert Notices
INSERT INTO notices (id, title, content, priority, published_at, expires_at, is_active) VALUES
('n1a11111-1111-1111-1111-111111111111', 'Form 6 Submission Deadline Extended', 'The deadline for Form 6 submission has been extended to January 31, 2025. All schools are requested to complete their submissions before the deadline.', 'HIGH', '2025-01-20 10:00:00', '2025-02-01 00:00:00', true),
('n2a22222-2222-2222-2222-222222222222', 'Updated Examination Guidelines 2025', 'New examination guidelines have been issued for HSLC and HS examinations 2025. Please download and review the attached circular.', 'HIGH', '2025-01-18 09:00:00', '2025-03-15 00:00:00', true),
('n3a33333-3333-3333-3333-333333333333', 'Staff Profile Verification', 'All teaching and non-teaching staff profiles must be verified and approved before the commencement of board examinations.', 'NORMAL', '2025-01-15 11:30:00', '2025-02-10 00:00:00', true),
('n4a44444-4444-4444-4444-444444444444', 'Student Admit Card Distribution', 'Admit cards for HSLC 2025 will be available for download from February 1, 2025. Schools should verify student details before distribution.', 'NORMAL', '2025-01-22 14:00:00', '2025-02-15 00:00:00', true),
('n5a55555-5555-5555-5555-555555555555', 'Center Superintendent Training', 'Mandatory training session for all Center Superintendents scheduled for February 10, 2025. Attendance is compulsory.', 'HIGH', '2025-01-21 16:00:00', '2025-02-11 00:00:00', true);

-- Insert Circulars
INSERT INTO circulars (id, circular_no, title, description, file_url, issued_by, issued_date, effective_date, is_active) VALUES
('c1a11111-1111-1111-1111-111111111111', 'SEBA/2025/001', 'Examination Schedule for HSLC 2025', 'Detailed examination schedule for High School Leaving Certificate Examination 2025 including time table and venue allocation guidelines.', '/uploads/circulars/hslc_schedule_2025.pdf', 'Secretary, SEBA', '2025-01-05', '2025-02-01', true),
('c2a22222-2222-2222-2222-222222222222', 'SEBA/2025/002', 'Question Paper Handling Protocol', 'Detailed protocol for handling, transporting, and securing question papers during board examinations.', '/uploads/circulars/qp_handling_protocol.pdf', 'Controller of Examinations', '2025-01-10', '2025-01-15', true),
('c3a33333-3333-3333-3333-333333333333', 'SEBA/2025/003', 'Form 6 Submission Guidelines', 'Guidelines and instructions for filling and submitting Form 6 (Teaching Staff, Non-Teaching Staff, and Student Strength details).', '/uploads/circulars/form6_guidelines.pdf', 'Deputy Secretary, SEBA', '2025-01-08', '2025-01-10', true),
('c4a44444-4444-4444-4444-444444444444', 'SEBA/2025/004', 'Invigilation Duty Assignment Rules', 'Rules and regulations regarding invigilation duty assignment for board examinations 2025.', '/uploads/circulars/invigilation_rules.pdf', 'Secretary, SEBA', '2025-01-12', '2025-01-20', true),
('c5a55555-5555-5555-5555-555555555555', 'SEBA/2025/005', 'COVID-19 Safety Measures for Examinations', 'Health and safety guidelines to be followed during board examinations in the post-pandemic era.', '/uploads/circulars/covid_safety.pdf', 'Health & Safety Cell, SEBA', '2025-01-15', '2025-02-01', true);

-- Verify the data
SELECT 'Events:' AS table_name, COUNT(*) AS count FROM events
UNION ALL
SELECT 'Notices:', COUNT(*) FROM notices
UNION ALL
SELECT 'Circulars:', COUNT(*) FROM circulars;
