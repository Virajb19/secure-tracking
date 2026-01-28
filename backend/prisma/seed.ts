/**
 * Prisma Seed Script - BALANCED DATASET
 * 
 * Creates realistic proportions of data for all tables.
 * Run with: npx prisma db seed
 * 
 * BALANCED DATA STRUCTURE:
 * - 50 Districts across multiple states
 * - 300 Schools (avg 6 schools per district)
 * - 1500+ Users (mix of all roles)
 * - 1200 Faculty members (avg 4 teachers per school)
 * - 1800+ Teaching Assignments (teachers teach multiple classes/subjects)
 * - 600 Non-Teaching Staff (avg 2 per school)
 * - 1500 Student Strength records (5 classes × 300 schools)
 * - 400 Tasks for delivery officers
 * - 800+ Task Events
 * - 500 Audit Logs
 * - 200 Events (school and district level)
 * - 300 Event Invitations
 * - 150 Notices (ADMIN/SUPER_ADMIN only - visible to all users in mobile app)
 * - 100 Circulars (ADMIN/SUPER_ADMIN only - visible to all users in mobile app)
 * - 80 Helpdesk Tickets
 * - 200 Notification Logs
 * - 120 Paper Setter Selections
 * - 80 Bank Details
 * - 50 User Stars
 * - 100 Form Submissions
 */

import { PrismaClient, UserRole, Gender, TaskStatus, EventType, FacultyType, ApprovalStatus, InvitationStatus, SelectionStatus, FormSubmissionStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ==================== HELPER FUNCTIONS ====================

const randomElement = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min;
const randomDecimal = (min: number, max: number, decimals: number = 7): number => 
    parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
const randomBoolean = (probability: number = 0.5): boolean => Math.random() < probability;

// ==================== DATA ARRAYS ====================

const firstNames = [
    'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Ayaan', 'Krishna', 'Ishaan',
    'Ananya', 'Aadhya', 'Myra', 'Aanya', 'Diya', 'Pari', 'Sara', 'Ira', 'Aisha', 'Navya',
    'Rahul', 'Amit', 'Suresh', 'Ramesh', 'Vijay', 'Sanjay', 'Priya', 'Neha', 'Sunita', 'Kavita',
    'Rajesh', 'Mahesh', 'Ganesh', 'Dinesh', 'Rakesh', 'Pooja', 'Deepa', 'Rekha', 'Seema', 'Geeta',
    'Vikas', 'Ravi', 'Ajay', 'Prakash', 'Manoj', 'Ashok', 'Pankaj', 'Suman', 'Anjali', 'Ritu'
];

const lastNames = [
    'Sharma', 'Verma', 'Gupta', 'Singh', 'Kumar', 'Patel', 'Das', 'Reddy', 'Rao', 'Nair',
    'Pillai', 'Menon', 'Iyer', 'Naidu', 'Choudhury', 'Banerjee', 'Mukherjee', 'Chatterjee', 'Bose', 'Roy',
    'Joshi', 'Tiwari', 'Pandey', 'Mishra', 'Saxena', 'Agarwal', 'Malhotra', 'Kapoor', 'Khanna', 'Mehta',
    'Desai', 'Shah', 'Gandhi', 'Trivedi', 'Jain', 'Bhatia', 'Sinha', 'Ghosh', 'Sen', 'Dutta'
];

const states = [
    'Assam', 'West Bengal', 'Bihar', 'Jharkhand', 'Odisha', 'Uttar Pradesh', 
    'Madhya Pradesh', 'Maharashtra', 'Gujarat', 'Rajasthan', 'Punjab', 'Haryana',
    'Tamil Nadu', 'Karnataka', 'Kerala', 'Andhra Pradesh'
];

const districtNames = [
    'Kamrup', 'Jorhat', 'Dibrugarh', 'Tinsukia', 'Sivasagar', 'Golaghat', 'Sonitpur', 'Nagaon',
    'Cachar', 'Karimganj', 'Hailakandi', 'Barpeta', 'Nalbari', 'Darrang', 'Goalpara', 'Kokrajhar',
    'Kolkata', 'Howrah', 'Darjeeling', 'Jalpaiguri', 'Patna', 'Gaya', 'Muzaffarpur', 'Bhagalpur',
    'Ranchi', 'Dhanbad', 'Jamshedpur', 'Bhubaneswar', 'Cuttack', 'Puri', 'Sambalpur', 'Rourkela',
    'Lucknow', 'Kanpur', 'Agra', 'Varanasi', 'Allahabad', 'Meerut', 'Bareilly', 'Aligarh',
    'Indore', 'Bhopal', 'Jabalpur', 'Gwalior', 'Mumbai', 'Pune', 'Nagpur', 'Ahmedabad', 'Surat', 'Jaipur'
];

const schoolPrefixes = ['Government', 'State', 'Public', 'Central', 'Model', 'Higher Secondary', 'Senior Secondary', 'Kendriya Vidyalaya'];
const schoolSuffixes = ['High School', 'Higher Secondary School', 'Vidyalaya', 'Academy', 'Institution', 'School'];

const designations = [
    'Principal', 'Vice Principal', 'Senior Teacher', 'Teacher', 'Assistant Teacher',
    'Head of Department', 'Lecturer', 'PGT', 'TGT', 'Primary Teacher', 'Subject Teacher'
];

const qualifications = [
    'M.Ed', 'B.Ed', 'M.A.', 'M.Sc.', 'M.Com.', 'Ph.D.', 'B.A.', 'B.Sc.', 'B.Com.', 
    'M.Phil.', 'NET', 'SET', 'D.Ed', 'M.A. (English)', 'M.Sc. (Mathematics)', 'M.Sc. (Physics)'
];

const subjects = [
    'Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'Hindi', 'Assamese', 'Sanskrit',
    'History', 'Geography', 'Political Science', 'Economics', 'Computer Science', 'Accountancy',
    'Business Studies', 'Physical Education', 'Music', 'Art', 'Environmental Science', 'Social Science'
];

const nonTeachingRoles = [
    'Clerk', 'Accountant', 'Peon', 'Watchman', 'Lab Assistant', 'Librarian',
    'Office Assistant', 'Computer Operator', 'Store Keeper', 'Driver', 'Sweeper', 'Mali'
];

const locations = [
    'SEBA Head Office', 'District Education Office', 'Police Station', 'Post Office',
    'Government School', 'Exam Center', 'Administrative Building', 'Storage Facility'
];

const eventTypes = ['EXAM', 'MEETING', 'HOLIDAY', 'SPORTS', 'CULTURAL', 'WORKSHOP', 'SEMINAR', 'TRAINING', 'OTHER'];

const noticeTypes = ['General', 'Paper Setter', 'Paper Checker', 'Invitation', 'Push Notification'];

const formTypes = ['6A', '6B', '6C_LOWER', '6C_HIGHER', '6D'];

// ==================== GENERATORS ====================

const generateName = (): string => `${randomElement(firstNames)} ${randomElement(lastNames)}`;
const generateEmail = (index: number): string => `user${index}_${Date.now() % 100000}@example.com`;
const generatePhone = (index: number): string => `${randomInt(70000, 99999)}${String(index).padStart(5, '0')}`;
const generateSchoolName = (district: string, index: number): string => 
    `${randomElement(schoolPrefixes)} ${randomElement(schoolSuffixes)}, ${district} #${index}`;
const generateRegCode = (index: number): string => `SCH${String(index).padStart(6, '0')}`;
const generatePackCode = (index: number): string => `SP${new Date().getFullYear()}${String(index).padStart(6, '0')}`;
const generateCircularNo = (index: number): string => `CIRC/${new Date().getFullYear()}/${String(index).padStart(4, '0')}`;
const generateImageHash = (): string => 
    Array.from({ length: 64 }, () => randomElement('0123456789abcdef'.split(''))).join('');

const generateDate = (startYear: number, endYear: number): Date => {
    const start = new Date(startYear, 0, 1).getTime();
    const end = new Date(endYear, 11, 31).getTime();
    return new Date(start + Math.random() * (end - start));
};

const generateFutureDate = (daysAhead: number): Date => {
    const now = new Date();
    now.setDate(now.getDate() + randomInt(1, daysAhead));
    return now;
};

// ==================== MAIN SEEDING FUNCTION ====================

async function main() {
    console.log('🌱 Starting database seeding with balanced data...\n');

    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await prisma.formSubmission.deleteMany();
    await prisma.userStar.deleteMany();
    await prisma.bankDetails.deleteMany();
    await prisma.paperSetterSelection.deleteMany();
    await prisma.notificationLog.deleteMany();
    await prisma.helpdesk.deleteMany();
    await prisma.circular.deleteMany();
    await prisma.notice.deleteMany();
    await prisma.eventInvitation.deleteMany();
    await prisma.event.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.taskEvent.deleteMany();
    await prisma.task.deleteMany();
    await prisma.studentStrength.deleteMany();
    await prisma.nonTeachingStaff.deleteMany();
    await prisma.teachingAssignment.deleteMany();
    await prisma.faculty.deleteMany();
    await prisma.school.deleteMany();
    await prisma.district.deleteMany();
    await prisma.user.deleteMany();
    console.log('✅ Existing data cleared\n');

    const plainPassword = '12345678';

    console.log('Creating Admin');
    await prisma.user.create({data: {name: 'admin', email: 'admin@example.com', password: plainPassword, role: 'ADMIN', is_active: true, phone: '1234567890', gender: 'MALE'}});

    // ==================== USERS (1500 records) ====================
    console.log('👥 Creating 1500 users...');
    const users = await Promise.all(
        Array.from({ length: 1500 }, async (_, i) => {
            let role: UserRole;
            if (i < 2) role = 'SUPER_ADMIN';              // 2
            else if (i < 12) role = 'ADMIN';              // 10
            else if (i < 150) role = 'SEBA_OFFICER';      // 138
            else if (i < 300) role = 'HEADMASTER';        // 150
            else if (i < 1400) role = 'TEACHER';          // 1100
            else role = 'CENTER_SUPERINTENDENT';          // 100

            return prisma.user.create({
                data: {
                    name: generateName(),
                    email: generateEmail(i),
                    password: plainPassword,
                    phone: generatePhone(i),
                    role,
                    gender: randomElement(['MALE', 'FEMALE'] as Gender[]),
                    is_active: randomBoolean(0.95), // 95% active
                    device_id: role === 'SEBA_OFFICER' ? `device_${i}` : null,
                    created_at: generateDate(2022, 2025),
                }
            });
        })
    );
    console.log(`✅ Created ${users.length} users\n`);

    const admins = users.filter(u => u.role === 'ADMIN' || u.role === 'SUPER_ADMIN');
    const sebaOfficers = users.filter(u => u.role === 'SEBA_OFFICER');
    const headmasters = users.filter(u => u.role === 'HEADMASTER');
    const teachers = users.filter(u => u.role === 'TEACHER');
    const allTeachingStaff = [...headmasters, ...teachers];

    // ==================== DISTRICTS (50 records) ====================
    console.log('🗺️  Creating 50 districts...');
    const districts = await Promise.all(
        Array.from({ length: 50 }, (_, i) => 
            prisma.district.create({
                data: {
                    name: districtNames[i] || `District_${i}`,
                    state: randomElement(states),
                    created_at: generateDate(2020, 2023),
                }
            })
        )
    );
    console.log(`✅ Created ${districts.length} districts\n`);

    // ==================== SCHOOLS (300 records - avg 6 per district) ====================
    console.log('🏫 Creating 300 schools...');
    const schools = await Promise.all(
        Array.from({ length: 300 }, (_, i) => {
            const district = districts[i % districts.length];
            return prisma.school.create({
                data: {
                    name: generateSchoolName(district.name, i),
                    registration_code: generateRegCode(i),
                    district_id: district.id,
                    created_at: generateDate(2015, 2023),
                }
            });
        })
    );
    console.log(`✅ Created ${schools.length} schools\n`);

    // ==================== FACULTY (1200 records - avg 4 per school) ====================
    console.log('👨‍🏫 Creating 1200 faculty records...');
    const facultyUsers = allTeachingStaff.slice(0, 1200);
    const faculties = await Promise.all(
        facultyUsers.map((user, i) => {
            const school = schools[i % schools.length];
            return prisma.faculty.create({
                data: {
                    user_id: user.id,
                    school_id: school.id,
                    faculty_type: user.role === 'HEADMASTER' ? 'NON_TEACHING' : 'TEACHING',
                    designation: user.role === 'HEADMASTER' ? 'Principal' : randomElement(designations),
                    highest_qualification: randomElement(qualifications),
                    years_of_experience: randomInt(1, 30),
                    approval_status: randomBoolean(0.9) ? 'APPROVED' : randomElement(['PENDING', 'REJECTED'] as ApprovalStatus[]),
                    approved_by: randomBoolean(0.9) ? randomElement(admins).id : null,
                    is_profile_locked: randomBoolean(0.7),
                    created_at: generateDate(2022, 2025),
                }
            });
        })
    );
    console.log(`✅ Created ${faculties.length} faculty records\n`);

    const teachingFaculty = faculties.filter(f => f.faculty_type === 'TEACHING');

    // ==================== TEACHING ASSIGNMENTS (1800+ records) ====================
    console.log('📚 Creating teaching assignments...');
    const classLevels = [8, 9, 10, 11, 12];
    const assignmentSet = new Set<string>();
    const teachingAssignments = [];

    // Each teaching faculty gets 1-3 assignments
    for (const faculty of teachingFaculty) {
        const numAssignments = randomInt(1, 3);
        for (let j = 0; j < numAssignments; j++) {
            const classLevel = randomElement(classLevels);
            const subject = randomElement(subjects);
            const key = `${faculty.id}-${classLevel}-${subject}`;
            
            if (!assignmentSet.has(key)) {
                assignmentSet.add(key);
                teachingAssignments.push({
                    faculty_id: faculty.id,
                    class_level: classLevel,
                    subject: subject,
                });
            }
        }
    }

    await prisma.teachingAssignment.createMany({ data: teachingAssignments });
    console.log(`✅ Created ${teachingAssignments.length} teaching assignments\n`);

    // ==================== NON-TEACHING STAFF (600 records - avg 2 per school) ====================
    console.log('🧹 Creating 600 non-teaching staff...');
    await prisma.nonTeachingStaff.createMany({
        data: Array.from({ length: 600 }, (_, i) => ({
            school_id: schools[i % schools.length].id,
            full_name: generateName(),
            qualification: randomElement(['10th Pass', '12th Pass', 'Graduate', 'Post Graduate', 'ITI']),
            nature_of_work: randomElement(nonTeachingRoles),
            years_of_service: randomInt(1, 25),
            phone: `${randomInt(60000, 79999)}${String(i).padStart(5, '0')}`,
            created_at: generateDate(2018, 2025),
        }))
    });
    console.log(`✅ Created 600 non-teaching staff\n`);

    // ==================== STUDENT STRENGTH (1500 records - 5 classes × 300 schools) ====================
    console.log('🎓 Creating student strength records...');
    const studentStrengthData = [];
    for (const school of schools) {
        for (const classLevel of classLevels) {
            studentStrengthData.push({
                school_id: school.id,
                class_level: classLevel,
                boys: randomInt(30, 180),
                girls: randomInt(30, 180),
                sections: randomInt(1, 6),
                created_at: generateDate(2023, 2025),
            });
        }
    }
    await prisma.studentStrength.createMany({ data: studentStrengthData });
    console.log(`✅ Created ${studentStrengthData.length} student strength records\n`);

    // ==================== TASKS (400 records) ====================
    console.log('📦 Creating 400 tasks...');
    const tasks = await Promise.all(
        Array.from({ length: 400 }, async (_, i) => {
            const startTime = generateFutureDate(60);
            const endTime = new Date(startTime);
            endTime.setHours(endTime.getHours() + randomInt(2, 10));
            
            let status: TaskStatus;
            if (i < 200) status = 'COMPLETED';
            else if (i < 320) status = 'IN_PROGRESS';
            else if (i < 370) status = 'PENDING';
            else status = 'SUSPICIOUS';

            return prisma.task.create({
                data: {
                    sealed_pack_code: generatePackCode(i),
                    source_location: `${randomElement(locations)}, ${randomElement(districtNames)}`,
                    destination_location: `${randomElement(locations)}, ${randomElement(districtNames)}`,
                    assigned_user_id: randomElement(sebaOfficers).id,
                    start_time: startTime,
                    end_time: endTime,
                    status,
                    is_double_shift: randomBoolean(0.3),
                    shift_type: randomElement(['MORNING', 'AFTERNOON']),
                    expected_travel_time: randomInt(60, 300),
                    created_at: generateDate(2024, 2025),
                }
            });
        })
    );
    console.log(`✅ Created ${tasks.length} tasks\n`);

    // ==================== TASK EVENTS (800+ records) ====================
    console.log('📍 Creating task events...');
    const eventTypesTask: EventType[] = ['PICKUP_POLICE_STATION', 'ARRIVAL_EXAM_CENTER', 'OPENING_SEAL', 'SEALING_ANSWER_SHEETS', 'SUBMISSION_POST_OFFICE'];
    const legacyEventTypes: EventType[] = ['PICKUP', 'TRANSIT', 'FINAL'];
    const taskEvents = [];

    for (const task of tasks) {
        const isLegacy = randomBoolean(0.3);
        const types = isLegacy ? legacyEventTypes : eventTypesTask;
        
        if (task.status === 'COMPLETED') {
            // All events for completed tasks
            for (const eventType of types) {
                taskEvents.push({
                    task_id: task.id,
                    event_type: eventType,
                    image_url: `https://storage.example.com/events/${task.id}/${eventType}.jpg`,
                    image_hash: generateImageHash(),
                    latitude: randomDecimal(24.0, 28.0),
                    longitude: randomDecimal(88.0, 96.0),
                    server_timestamp: new Date(),
                    created_at: new Date(),
                });
            }
        } else if (task.status === 'IN_PROGRESS') {
            // Partial events
            const numEvents = randomInt(1, types.length - 1);
            for (let j = 0; j < numEvents; j++) {
                taskEvents.push({
                    task_id: task.id,
                    event_type: types[j],
                    image_url: `https://storage.example.com/events/${task.id}/${types[j]}.jpg`,
                    image_hash: generateImageHash(),
                    latitude: randomDecimal(24.0, 28.0),
                    longitude: randomDecimal(88.0, 96.0),
                    server_timestamp: new Date(),
                    created_at: new Date(),
                });
            }
        }
    }

    await prisma.taskEvent.createMany({ data: taskEvents });
    console.log(`✅ Created ${taskEvents.length} task events\n`);

    // ==================== AUDIT LOGS (500 records) ====================
    console.log('📋 Creating 500 audit logs...');
    const auditActions = [
        'USER_LOGIN', 'USER_LOGOUT', 'USER_REGISTERED', 'TASK_CREATED', 'TASK_UPDATED',
        'PROFILE_UPDATED', 'FACULTY_APPROVED', 'EVENT_CREATED', 'NOTICE_PUBLISHED'
    ];
    await prisma.auditLog.createMany({
        data: Array.from({ length: 500 }, () => ({
            user_id: randomBoolean(0.95) ? randomElement(users).id : null,
            action: randomElement(auditActions),
            entity_type: randomElement(['User', 'Task', 'Faculty', 'Event', 'Notice']),
            entity_id: randomElement(users).id,
            ip_address: `192.168.${randomInt(1, 255)}.${randomInt(1, 255)}`,
            created_at: generateDate(2024, 2025),
        }))
    });
    console.log(`✅ Created 500 audit logs\n`);

    // ==================== EVENTS (200 records) ====================
    console.log('📅 Creating 200 events...');
    const events = await Promise.all(
        Array.from({ length: 200 }, async (_, i) => {
            const isSchoolLevel = randomBoolean(0.7);
            return prisma.event.create({
                data: {
                    title: `${randomElement(['Annual', 'Monthly', 'Special'])} ${randomElement(eventTypes)} ${i + 1}`,
                    description: `Event description for ${randomElement(eventTypes)}`,
                    event_date: generateFutureDate(120),
                    event_time: `${randomInt(8, 17)}:${randomElement(['00', '30'])}`,
                    location: `${randomElement(locations)}, ${randomElement(districtNames)}`,
                    event_type: randomElement(eventTypes),
                    flyer_url: randomBoolean(0.3) ? `https://storage.example.com/flyers/event_${i}.jpg` : null,
                    is_active: randomBoolean(0.9),
                    school_id: isSchoolLevel ? randomElement(schools).id : null,
                    district_id: !isSchoolLevel ? randomElement(districts).id : null,
                    created_by: randomElement([...headmasters, ...admins]).id,
                    created_at: generateDate(2024, 2025),
                }
            });
        })
    );
    console.log(`✅ Created ${events.length} events\n`);

    // ==================== EVENT INVITATIONS (300 records) ====================
    console.log('✉️  Creating 300 event invitations...');
    const invitationSet = new Set<string>();
    const invitations = [];
    
    for (const event of events.slice(0, 100)) {
        const numInvites = randomInt(2, 5);
        for (let j = 0; j < numInvites; j++) {
            const user = randomElement([...teachers, ...headmasters]);
            const key = `${event.id}-${user.id}`;
            if (!invitationSet.has(key)) {
                invitationSet.add(key);
                invitations.push({
                    event_id: event.id,
                    user_id: user.id,
                    status: randomElement(['PENDING', 'ACCEPTED', 'REJECTED'] as InvitationStatus[]),
                    rejection_reason: randomBoolean(0.1) ? 'Unable to attend' : null,
                    responded_at: randomBoolean(0.7) ? new Date() : null,
                    created_at: generateDate(2024, 2025),
                });
            }
        }
    }
    
    await prisma.eventInvitation.createMany({ data: invitations });
    console.log(`✅ Created ${invitations.length} event invitations\n`);

    // ==================== NOTICES (150 records - ADMIN ONLY) ====================
    // Notices can ONLY be created by ADMIN/SUPER_ADMIN from CMS
    // Visible to all users in mobile app (no notices tab in bottom bar)
    console.log('📢 Creating 150 notices (admin-created only)...');
    await prisma.notice.createMany({
        data: Array.from({ length: 150 }, (_, i) => {
            const type = randomElement(noticeTypes);
            const isSchoolLevel = randomBoolean(0.4);
            return {
                title: `${type} Notice ${i + 1} - ${randomElement(['Exam', 'Holiday', 'Meeting', 'Training'])}`,
                content: `This is an important ${type.toLowerCase()} notice for all stakeholders.`,
                type: type,
                subject: (type === 'Paper Setter' || type === 'Paper Checker') ? randomElement(subjects) : null,
                venue: type === 'Invitation' ? randomElement(locations) : null,
                event_time: type === 'Invitation' ? `${randomInt(9, 16)}:00` : null,
                event_date: type === 'Invitation' ? generateFutureDate(60) : null,
                published_at: new Date(),
                expires_at: randomBoolean(0.8) ? generateFutureDate(90) : null,
                is_active: randomBoolean(0.95),
                school_id: isSchoolLevel ? randomElement(schools).id : null,
                created_by: randomElement(admins).id,
                file_url: randomBoolean(0.3) ? `https://storage.example.com/notices/notice_${i}.pdf` : null,
                file_name: randomBoolean(0.3) ? `notice_${i}.pdf` : null,
                created_at: generateDate(2024, 2025),
            };
        })
    });
    console.log(`✅ Created 150 notices\n`);

    // ==================== CIRCULARS (100 records - ADMIN ONLY) ====================
    // Circulars can ONLY be created by ADMIN/SUPER_ADMIN from CMS
    // Visible to all users in mobile app
    console.log('📄 Creating 100 circulars (admin-created only)...');
    await prisma.circular.createMany({
        data: Array.from({ length: 100 }, (_, i) => {
            const isDistrictLevel = randomBoolean(0.5);
            return {
                circular_no: generateCircularNo(i + 1),
                title: `Circular ${i + 1} - ${randomElement(['Exam', 'Policy', 'Guidelines', 'Instructions'])}`,
                description: `Official circular regarding administrative and academic matters.`,
                file_url: randomBoolean(0.8) ? `https://storage.example.com/circulars/circular_${i}.pdf` : null,
                issued_by: randomElement(['SEBA', 'State Government', 'District Office', 'Education Department']),
                issued_date: generateDate(2024, 2025),
                effective_date: generateFutureDate(30),
                is_active: randomBoolean(0.95),
                district_id: isDistrictLevel ? randomElement(districts).id : null,
                school_id: !isDistrictLevel && randomBoolean(0.3) ? randomElement(schools).id : null,
                created_by: randomElement(admins).id,
                created_at: generateDate(2024, 2025),
            };
        })
    });
    console.log(`✅ Created 100 circulars\n`);

    // ==================== HELPDESK TICKETS (80 records) ====================
    console.log('🎫 Creating 80 helpdesk tickets...');
    await prisma.helpdesk.createMany({
        data: Array.from({ length: 80 }, (_, i) => {
            const user = randomElement(users);
            return {
                user_id: user.id,
                full_name: user.name,
                phone: user.phone,
                message: `Help needed with ${randomElement(['login issue', 'profile update', 'password reset', 'data correction', 'technical problem'])}`,
                is_resolved: randomBoolean(0.6),
                created_at: generateDate(2024, 2025),
            };
        })
    });
    console.log(`✅ Created 80 helpdesk tickets\n`);

    // ==================== NOTIFICATION LOGS (200 records) ====================
    console.log('🔔 Creating 200 notification logs...');
    await prisma.notificationLog.createMany({
        data: Array.from({ length: 200 }, () => {
            const user = randomElement(users);
            return {
                user_id: user.id,
                title: randomElement(['Task Update', 'Profile Approved', 'New Event', 'Important Notice']),
                body: `You have a new notification regarding your ${randomElement(['task', 'profile', 'event', 'application'])}`,
                type: randomElement(['TASK', 'PROFILE', 'NOTICE', 'EVENT']),
                is_read: randomBoolean(0.5),
                created_at: generateDate(2024, 2025),
            };
        })
    });
    console.log(`✅ Created 200 notification logs\n`);

    // ==================== PAPER SETTER SELECTIONS (120 records) ====================
    console.log('📝 Creating 120 paper setter selections...');
    const selectionSet = new Set<string>();
    const paperSetterSelections = [];

    for (let i = 0; i < 120; i++) {
        const teacher = randomElement(teachers.slice(0, 800));
        const coordinator = randomElement(admins); // Use admins as coordinators
        const subject = randomElement(subjects);
        const classLevel = randomElement([10, 12]);
        const key = `${teacher.id}-${subject}-${classLevel}`;
        
        if (!selectionSet.has(key)) {
            selectionSet.add(key);
            paperSetterSelections.push({
                teacher_id: teacher.id,
                coordinator_id: coordinator.id,
                subject: subject,
                class_level: classLevel,
                selection_type: randomElement(['PAPER_SETTER', 'EXAMINER']),
                status: randomElement(['INVITED', 'ACCEPTED'] as SelectionStatus[]),
                official_order_url: randomBoolean(0.5) ? `https://storage.example.com/orders/order_${i}.pdf` : null,
                invitation_message: 'You are invited to participate in paper setting process',
                accepted_at: randomBoolean(0.4) ? new Date() : null,
                created_at: generateDate(2024, 2025),
            });
        }
    }

    await prisma.paperSetterSelection.createMany({ data: paperSetterSelections });
    console.log(`✅ Created ${paperSetterSelections.length} paper setter selections\n`);

    // ==================== BANK DETAILS (80 records) ====================
    console.log('🏦 Creating 80 bank details...');
    const bankNames = ['State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'Punjab National Bank'];
    await prisma.bankDetails.createMany({
        data: teachers.slice(0, 80).map((teacher, i) => ({
            user_id: teacher.id,
            account_number: `${randomInt(100000000, 999999999)}`,
            account_name: teacher.name,
            ifsc_code: `${randomElement(['SBIN', 'HDFC', 'ICIC', 'UTIB', 'PUNB'])}0${randomInt(100000, 999999)}`,
            bank_name: randomElement(bankNames),
            branch_name: `${randomElement(districtNames)} Branch`,
            upi_id: randomBoolean(0.6) ? `${teacher.phone}@paytm` : null,
            created_at: generateDate(2023, 2025),
        }))
    });
    console.log(`✅ Created 80 bank details\n`);

    // ==================== USER STARS (50 records) ====================
    console.log('⭐ Creating 50 user stars...');
    const starSet = new Set<string>();
    const userStars = [];
    
    for (let i = 0; i < 50; i++) {
        const admin = randomElement(admins);
        const starredUser = randomElement([...teachers, ...headmasters]);
        const key = `${admin.id}-${starredUser.id}`;
        
        if (!starSet.has(key)) {
            starSet.add(key);
            userStars.push({
                admin_id: admin.id,
                starred_user_id: starredUser.id,
                created_at: generateDate(2024, 2025),
            });
        }
    }
    
    await prisma.userStar.createMany({ data: userStars });
    console.log(`✅ Created ${userStars.length} user stars\n`);

    // ==================== FORM SUBMISSIONS (100 records) ====================
    console.log('📋 Creating 100 form submissions...');
    const formSubmissionSet = new Set<string>();
    const formSubmissions = [];
    
    for (let i = 0; i < 100; i++) {
        const school = randomElement(schools);
        const headmaster = randomElement(headmasters);
        const formType = randomElement(formTypes);
        const key = `${school.id}-${formType}`;
        
        if (!formSubmissionSet.has(key)) {
            formSubmissionSet.add(key);
            const status = randomElement(['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'] as FormSubmissionStatus[]);
            formSubmissions.push({
                school_id: school.id,
                submitted_by: headmaster.id,
                form_type: formType,
                status: status,
                rejection_reason: status === 'REJECTED' ? 'Incomplete information provided' : null,
                approved_by: (status === 'APPROVED' || status === 'REJECTED') ? randomElement(admins).id : null,
                submitted_at: status !== 'DRAFT' ? new Date() : null,
                approved_at: (status === 'APPROVED' || status === 'REJECTED') ? new Date() : null,
                created_at: generateDate(2024, 2025),
            });
        }
    }
    
    await prisma.formSubmission.createMany({ data: formSubmissions });
    console.log(`✅ Created ${formSubmissions.length} form submissions\n`);

    // ==================== SUMMARY ====================
    console.log('\n═══════════════════════════════════════════════');
    console.log('📊 SEEDING COMPLETE - BALANCED DATASET SUMMARY');
    console.log('═══════════════════════════════════════════════');
    console.log(`👥 Users:                    ${users.length}`);
    console.log(`🗺️  Districts:                ${districts.length}`);
    console.log(`🏫 Schools:                  ${schools.length}`);
    console.log(`👨‍🏫 Faculty:                  ${faculties.length}`);
    console.log(`📚 Teaching Assignments:     ${teachingAssignments.length}`);
    console.log(`🧹 Non-Teaching Staff:       600`);
    console.log(`🎓 Student Strength:         ${studentStrengthData.length}`);
    console.log(`📦 Tasks:                    ${tasks.length}`);
    console.log(`📍 Task Events:              ${taskEvents.length}`);
    console.log(`📋 Audit Logs:               500`);
    console.log(`📅 Events:                   ${events.length}`);
    console.log(`✉️  Event Invitations:        ${invitations.length}`);
    console.log(`📢 Notices:                  150`);
    console.log(`📄 Circulars:                100`);
    console.log(`🎫 Helpdesk Tickets:         80`);
    console.log(`🔔 Notification Logs:        200`);
    console.log(`📝 Paper Setter Selections:  ${paperSetterSelections.length}`);
    console.log(`🏦 Bank Details:             80`);
    console.log(`⭐ User Stars:               ${userStars.length}`);
    console.log(`📋 Form Submissions:         ${formSubmissions.length}`);
    console.log('═══════════════════════════════════════════════');
    console.log('\n🎉 Database seeding completed successfully!');
    console.log('📝 Default password for all users: 12345678');
    console.log('\n💡 Data Proportions:');
    console.log(`   - Avg ${(schools.length / districts.length).toFixed(1)} schools per district`);
    console.log(`   - Avg ${(faculties.length / schools.length).toFixed(1)} faculty per school`);
    console.log(`   - Avg ${(teachingAssignments.length / teachingFaculty.length).toFixed(1)} assignments per teaching faculty`);
    console.log(`   - ${studentStrengthData.length} student records (all classes for all schools)`);
}

main()
    .catch((e) => {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
