/**
 * Prisma Seed Script
 * 
 * Generates large amounts of dummy data for all tables.
 * Run with: npx prisma db seed
 * 
 * TABLES SEEDED:
 * - Users (800 records) - More users than schools
 * - Districts (30 records)
 * - Schools (100 records)
 * - Faculty (600 records)
 * - TeachingAssignment (800 records)
 * - NonTeachingStaff (300 records)
 * - StudentStrength (400 records)
 * - Tasks (200 records)
 * - TaskEvents (400 records)
 * - AuditLogs (300 records)
 * - Events (50 records)
 * - Notices (40 records)
 * - Circulars (30 records)
 */

import { PrismaClient, UserRole, Gender, TaskStatus, EventType, FacultyType, ApprovalStatus } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

// Helper functions for generating random data
const randomElement = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min;
const randomDecimal = (min: number, max: number, decimals: number = 7): number => 
    parseFloat((Math.random() * (max - min) + min).toFixed(decimals));

// Sample data arrays
const firstNames = [
    'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Ayaan', 'Krishna', 'Ishaan',
    'Ananya', 'Aadhya', 'Myra', 'Aanya', 'Diya', 'Pari', 'Sara', 'Ira', 'Aisha', 'Navya',
    'Rahul', 'Amit', 'Suresh', 'Ramesh', 'Vijay', 'Sanjay', 'Priya', 'Neha', 'Sunita', 'Kavita',
    'Rajesh', 'Mahesh', 'Ganesh', 'Dinesh', 'Rakesh', 'Pooja', 'Deepa', 'Rekha', 'Seema', 'Geeta'
];

const lastNames = [
    'Sharma', 'Verma', 'Gupta', 'Singh', 'Kumar', 'Patel', 'Das', 'Reddy', 'Rao', 'Nair',
    'Pillai', 'Menon', 'Iyer', 'Naidu', 'Choudhury', 'Banerjee', 'Mukherjee', 'Chatterjee', 'Bose', 'Roy',
    'Joshi', 'Tiwari', 'Pandey', 'Mishra', 'Saxena', 'Agarwal', 'Malhotra', 'Kapoor', 'Khanna', 'Mehta'
];

const states = [
    'Assam', 'West Bengal', 'Bihar', 'Jharkhand', 'Odisha', 'Uttar Pradesh', 
    'Madhya Pradesh', 'Maharashtra', 'Gujarat', 'Rajasthan'
];

const districtPrefixes = [
    'North', 'South', 'East', 'West', 'Central', 'Upper', 'Lower', 'Greater', 'New', 'Old'
];

const districtSuffixes = [
    'pur', 'nagar', 'garh', 'bad', 'ganj', 'pura', 'khera', 'khand', 'tal', 'wadi'
];

const schoolTypes = ['Government', 'Public', 'Central', 'Model', 'Higher Secondary', 'Senior Secondary'];
const schoolSuffixes = ['School', 'Vidyalaya', 'Academy', 'Institution', 'College'];

const designations = [
    'Principal', 'Vice Principal', 'Senior Teacher', 'Teacher', 'Assistant Teacher',
    'Head of Department', 'Lecturer', 'PGT', 'TGT', 'Primary Teacher'
];

const qualifications = [
    'M.Ed', 'B.Ed', 'M.A.', 'M.Sc.', 'M.Com.', 'Ph.D.', 'B.A.', 'B.Sc.', 'B.Com.', 
    'M.Phil.', 'NET Qualified', 'SET Qualified'
];

const subjects = [
    'Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'Hindi', 'Sanskrit',
    'History', 'Geography', 'Political Science', 'Economics', 'Computer Science',
    'Physical Education', 'Music', 'Art', 'Environmental Science'
];

const nonTeachingRoles = [
    'Clerk', 'Accountant', 'Peon', 'Watchman', 'Lab Assistant', 'Librarian',
    'Office Assistant', 'Computer Operator', 'Store Keeper', 'Driver'
];

const locations = [
    'SEBA Head Office, Guwahati',
    'District Education Office, Kamrup',
    'Government HS School, Jorhat',
    'Model School, Dibrugarh',
    'Central School, Silchar',
    'Public School, Tezpur',
    'Higher Secondary School, Nagaon',
    'Senior Secondary, Barpeta',
    'Education Complex, Goalpara',
    'School Campus, Darrang'
];

const auditActions = [
    'USER_LOGIN', 'USER_LOGOUT', 'USER_REGISTERED', 'USER_LOGIN_FAILED',
    'TASK_CREATED', 'TASK_UPDATED', 'TASK_STATUS_CHANGED',
    'EVENT_CREATED', 'DEVICE_ID_BOUND', 'DEVICE_ID_MISMATCH',
    'FACULTY_APPROVED', 'FACULTY_REJECTED', 'PROFILE_UPDATED'
];

// Generate random name
const generateName = (): string => 
    `${randomElement(firstNames)} ${randomElement(lastNames)}`;

// Generate random email
const generateEmail = (index: number): string => 
    `user${index}_${Date.now() % 10000}@example.com`;

// Generate random phone (without +91)
const generatePhone = (index: number): string => 
    `${randomInt(70000, 99999)}${String(index).padStart(5, '0')}`;

// Generate random district name
const generateDistrictName = (index: number): string => 
    `${randomElement(districtPrefixes)}${randomElement(districtSuffixes)}_${index}`;

// Generate random school name
const generateSchoolName = (index: number): string => 
    `${randomElement(schoolTypes)} ${randomElement(schoolSuffixes)} #${index}`;

// Generate random registration code
const generateRegCode = (index: number): string => 
    `SCH${String(index).padStart(5, '0')}${randomInt(100, 999)}`;

// Generate random sealed pack code
const generatePackCode = (index: number): string => 
    `SP${new Date().getFullYear()}${String(index).padStart(6, '0')}`;

// Generate random image hash (SHA-256 like)
const generateImageHash = (): string => {
    const chars = '0123456789abcdef';
    return Array.from({ length: 64 }, () => randomElement(chars.split(''))).join('');
};

// Generate random date within range
const generateDate = (startYear: number, endYear: number): Date => {
    const start = new Date(startYear, 0, 1).getTime();
    const end = new Date(endYear, 11, 31).getTime();
    return new Date(start + Math.random() * (end - start));
};

// Generate future date for tasks
const generateFutureDate = (daysAhead: number): Date => {
    const now = new Date();
    now.setDate(now.getDate() + randomInt(1, daysAhead));
    return now;
};

async function main() {
    console.log('🌱 Starting database seeding...\n');

    // Clear existing data (in reverse order of dependencies)
    console.log('🗑️  Clearing existing data...');
    await prisma.circular.deleteMany();
    await prisma.notice.deleteMany();
    await prisma.event.deleteMany();
    await prisma.taskEvent.deleteMany();
    await prisma.task.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.teachingAssignment.deleteMany();
    await prisma.faculty.deleteMany();
    await prisma.nonTeachingStaff.deleteMany();
    await prisma.studentStrength.deleteMany();
    await prisma.school.deleteMany();
    await prisma.district.deleteMany();
    await prisma.user.deleteMany();
    console.log('✅ Existing data cleared\n');

    // Plain text password for all users (not hashed)
    const plainPassword = '12345678';

    // ========== USERS (800 records) ==========
    console.log('👥 Creating 800 users...');
    const userRoles: UserRole[] = ['SUPER_ADMIN', 'ADMIN', 'SEBA_OFFICER', 'HEADMASTER', 'TEACHER', 'CENTER_SUPERINTENDENT'];
    const genders: Gender[] = ['MALE', 'FEMALE'];
    
    const users = await Promise.all(
        Array.from({ length: 800 }, async (_, i) => {
            let role: UserRole;
            if (i < 2) role = 'SUPER_ADMIN';
            else if (i < 12) role = 'ADMIN';
            else if (i < 100) role = 'SEBA_OFFICER';
            else if (i < 200) role = 'HEADMASTER';
            else if (i < 700) role = 'TEACHER';
            else role = 'CENTER_SUPERINTENDENT';

            return prisma.user.create({
                data: {
                    name: generateName(),
                    email: generateEmail(i),
                    password: plainPassword,
                    phone: generatePhone(i),
                    role,
                    gender: randomElement(genders),
                    is_active: i < 750, // Some users inactive for testing
                    device_id: role === 'SEBA_OFFICER' ? `device_${uuidv4().slice(0, 20)}` : null,
                    created_at: generateDate(2023, 2025),
                }
            });
        })
    );
    console.log(`✅ Created ${users.length} users\n`);

    // Filter users by role for relationships
    const sebaOfficers = users.filter(u => u.role === 'SEBA_OFFICER');
    const headmasters = users.filter(u => u.role === 'HEADMASTER');
    const teachers = users.filter(u => u.role === 'TEACHER');
    const admins = users.filter(u => u.role === 'ADMIN' || u.role === 'SUPER_ADMIN');

    // ========== DISTRICTS (30 records) ==========
    console.log('🗺️  Creating 30 districts...');
    const districts = await Promise.all(
        Array.from({ length: 30 }, (_, i) => 
            prisma.district.create({
                data: {
                    name: generateDistrictName(i),
                    state: randomElement(states),
                    created_at: generateDate(2020, 2024),
                }
            })
        )
    );
    console.log(`✅ Created ${districts.length} districts\n`);

    // ========== SCHOOLS (100 records) ==========
    console.log('🏫 Creating 100 schools...');
    const schools = await Promise.all(
        Array.from({ length: 100 }, (_, i) => 
            prisma.school.create({
                data: {
                    name: generateSchoolName(i),
                    registration_code: generateRegCode(i),
                    district_id: randomElement(districts).id,
                    created_at: generateDate(2020, 2024),
                }
            })
        )
    );
    console.log(`✅ Created ${schools.length} schools\n`);

    // ========== FACULTY (600 records) ==========
    console.log('👨‍🏫 Creating 600 faculty records...');
    const facultyTypes: FacultyType[] = ['TEACHING', 'NON_TEACHING'];
    const approvalStatuses: ApprovalStatus[] = ['PENDING', 'APPROVED', 'REJECTED'];
    
    // Combine headmasters and teachers for faculty
    const facultyUsers = [...headmasters, ...teachers].slice(0, 600);
    
    const faculties = await Promise.all(
        facultyUsers.map((user, i) => 
            prisma.faculty.create({
                data: {
                    user_id: user.id,
                    school_id: randomElement(schools).id,
                    faculty_type: user.role === 'HEADMASTER' ? 'NON_TEACHING' : randomElement(facultyTypes),
                    designation: user.role === 'HEADMASTER' ? 'Principal' : randomElement(designations),
                    highest_qualification: randomElement(qualifications),
                    years_of_experience: randomInt(1, 35),
                    approval_status: i < 500 ? 'APPROVED' : randomElement(approvalStatuses),
                    approved_by: i < 500 ? randomElement(admins).id : null,
                    is_profile_locked: i < 400,
                    created_at: generateDate(2022, 2025),
                }
            })
        )
    );
    console.log(`✅ Created ${faculties.length} faculty records\n`);

    // Filter teaching faculty for assignments
    const teachingFaculty = faculties.filter(f => f.faculty_type === 'TEACHING');

    // ========== TEACHING ASSIGNMENTS (800 records) ==========
    console.log('📚 Creating 800 teaching assignments...');
    const classLevels = [8, 9, 10, 11, 12];
    const assignmentSet = new Set<string>(); // Track unique combinations
    
    const teachingAssignments = [];
    let assignmentIndex = 0;
    
    while (teachingAssignments.length < 800 && assignmentIndex < 3000) {
        const faculty = randomElement(teachingFaculty);
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
        assignmentIndex++;
    }
    
    await prisma.teachingAssignment.createMany({ data: teachingAssignments });
    console.log(`✅ Created ${teachingAssignments.length} teaching assignments\n`);

    // ========== NON-TEACHING STAFF (300 records) ==========
    console.log('🧹 Creating 300 non-teaching staff...');
    const nonTeachingStaff = await prisma.nonTeachingStaff.createMany({
        data: Array.from({ length: 300 }, (_, i) => ({
            school_id: randomElement(schools).id,
            full_name: generateName(),
            qualification: randomElement(['10th Pass', '12th Pass', 'Graduate', 'Post Graduate', 'ITI Certified']),
            nature_of_work: randomElement(nonTeachingRoles),
            years_of_service: randomInt(1, 30),
            phone: `${randomInt(60000, 99999)}${String(i + 500).padStart(5, '0')}`,
            created_at: generateDate(2020, 2025),
        }))
    });
    console.log(`✅ Created ${nonTeachingStaff.count} non-teaching staff\n`);

    // ========== STUDENT STRENGTH (400 records) ==========
    console.log('🎓 Creating 400 student strength records...');
    const studentStrengthSet = new Set<string>();
    const studentStrengthData = [];
    let strengthIndex = 0;
    
    while (studentStrengthData.length < 400 && strengthIndex < 2000) {
        const school = randomElement(schools);
        const classLevel = randomElement(classLevels);
        const key = `${school.id}-${classLevel}`;
        
        if (!studentStrengthSet.has(key)) {
            studentStrengthSet.add(key);
            studentStrengthData.push({
                school_id: school.id,
                class_level: classLevel,
                boys: randomInt(20, 150),
                girls: randomInt(20, 150),
                sections: randomInt(1, 5),
                created_at: generateDate(2023, 2025),
            });
        }
        strengthIndex++;
    }
    
    await prisma.studentStrength.createMany({ data: studentStrengthData });
    console.log(`✅ Created ${studentStrengthData.length} student strength records\n`);

    // ========== TASKS (200 records) ==========
    console.log('📦 Creating 200 tasks...');
    const taskStatuses: TaskStatus[] = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'SUSPICIOUS'];
    
    const tasks = await Promise.all(
        Array.from({ length: 200 }, async (_, i) => {
            const startTime = generateFutureDate(30);
            const endTime = new Date(startTime);
            endTime.setHours(endTime.getHours() + randomInt(2, 8));
            
            let status: TaskStatus;
            if (i < 70) status = 'COMPLETED';
            else if (i < 130) status = 'IN_PROGRESS';
            else if (i < 180) status = 'PENDING';
            else status = 'SUSPICIOUS';
            
            return prisma.task.create({
                data: {
                    sealed_pack_code: generatePackCode(i),
                    source_location: randomElement(locations),
                    destination_location: randomElement(locations),
                    assigned_user_id: randomElement(sebaOfficers).id,
                    start_time: startTime,
                    end_time: endTime,
                    status,
                    created_at: generateDate(2024, 2025),
                }
            });
        })
    );
    console.log(`✅ Created ${tasks.length} tasks\n`);

    // ========== TASK EVENTS (600 records) ==========
    console.log('📍 Creating task events...');
    const eventTypes: EventType[] = ['PICKUP', 'TRANSIT', 'FINAL'];
    const completedTasks = tasks.filter(t => t.status === 'COMPLETED');
    const inProgressTasks = tasks.filter(t => t.status === 'IN_PROGRESS');
    
    const taskEvents = [];
    
    // Completed tasks have all 3 events
    for (const task of completedTasks) {
        for (const eventType of eventTypes) {
            taskEvents.push({
                task_id: task.id,
                event_type: eventType,
                image_url: `https://storage.example.com/events/${task.id}/${eventType.toLowerCase()}.jpg`,
                image_hash: generateImageHash(),
                latitude: randomDecimal(25.5, 27.5),
                longitude: randomDecimal(89.5, 96.0),
                server_timestamp: new Date(),
                created_at: new Date(),
            });
        }
    }
    
    // In-progress tasks have 1-2 events
    for (const task of inProgressTasks) {
        const numEvents = randomInt(1, 2);
        for (let j = 0; j < numEvents; j++) {
            taskEvents.push({
                task_id: task.id,
                event_type: eventTypes[j],
                image_url: `https://storage.example.com/events/${task.id}/${eventTypes[j].toLowerCase()}.jpg`,
                image_hash: generateImageHash(),
                latitude: randomDecimal(25.5, 27.5),
                longitude: randomDecimal(89.5, 96.0),
                server_timestamp: new Date(),
                created_at: new Date(),
            });
        }
    }
    
    await prisma.taskEvent.createMany({ data: taskEvents });
    console.log(`✅ Created ${taskEvents.length} task events\n`);

    // ========== AUDIT LOGS (300 records) ==========
    console.log('📋 Creating 300 audit logs...');
    const auditLogs = await prisma.auditLog.createMany({
        data: Array.from({ length: 300 }, (_, i) => ({
            user_id: randomElement(users).id,
            action: randomElement(auditActions),
            entity_type: randomElement(['User', 'Task', 'TaskEvent', 'Faculty', 'School']),
            entity_id: uuidv4(),
            ip_address: `192.168.${randomInt(1, 255)}.${randomInt(1, 255)}`,
            created_at: generateDate(2024, 2025),
        }))
    });
    console.log(`✅ Created ${auditLogs.count} audit logs\n`);

    // ========== EVENTS (50 records) - Created by Headmasters ==========
    console.log('📅 Creating 50 events...');
    const eventTypeNames = ['EXAM', 'MEETING', 'HOLIDAY', 'SPORTS', 'CULTURAL', 'WORKSHOP', 'SEMINAR'];
    const events = await prisma.event.createMany({
        data: Array.from({ length: 50 }, (_, i) => ({
            title: `${randomElement(['Annual', 'Monthly', 'Weekly', 'Special'])} ${randomElement(['Exam', 'Meeting', 'Event', 'Program', 'Function'])} ${i + 1}`,
            description: `This is a ${randomElement(['mandatory', 'optional', 'important'])} event for all ${randomElement(['students', 'teachers', 'staff', 'parents'])}.`,
            event_date: generateFutureDate(90),
            event_time: `${randomInt(8, 16)}:${randomElement(['00', '30'])} ${randomInt(8, 11) < 12 ? 'AM' : 'PM'}`,
            location: randomElement(locations),
            event_type: randomElement(eventTypeNames),
            is_active: true,
            school_id: i < 40 ? randomElement(schools).id : null, // Some are global
            created_by: randomElement(headmasters).id, // Headmasters create events
            created_at: generateDate(2024, 2025),
        }))
    });
    console.log(`✅ Created ${events.count} events\n`);

    // ========== NOTICES (40 records) - Created by Admins ==========
    console.log('📢 Creating 40 notices...');
    const priorities = ['HIGH', 'NORMAL', 'LOW'];
    const notices = await prisma.notice.createMany({
        data: Array.from({ length: 40 }, (_, i) => ({
            title: `${randomElement(['Important', 'Urgent', 'General', 'Official'])} Notice - ${randomElement(['Regarding', 'About', 'Concerning'])} ${randomElement(['Exams', 'Holidays', 'Admissions', 'Fee Payment', 'Meeting', 'Policy Update'])}`,
            content: `This notice is to inform all concerned that ${randomElement(['the scheduled event', 'the examination', 'the meeting', 'the deadline'])} has been ${randomElement(['rescheduled', 'updated', 'confirmed', 'announced'])}. Please ${randomElement(['take note', 'comply accordingly', 'report on time', 'contact administration for queries'])}.`,
            priority: randomElement(priorities),
            published_at: new Date(),
            expires_at: i < 30 ? generateFutureDate(60) : null,
            is_active: true,
            school_id: i < 30 ? randomElement(schools).id : null, // Some are global
            created_by: randomElement(admins).id, // Admins create notices
            created_at: generateDate(2024, 2025),
        }))
    });
    console.log(`✅ Created ${notices.count} notices\n`);

    // ========== CIRCULARS (30 records) - Created by Admins ONLY ==========
    console.log('📄 Creating 30 circulars...');
    const circularIssuers = ['SEBA', 'Directorate of Education', 'State Board', 'Ministry of Education', 'District Office'];
    const circulars = await prisma.circular.createMany({
        data: Array.from({ length: 30 }, (_, i) => ({
            circular_no: `CIRC/${new Date().getFullYear()}/${String(i + 1).padStart(4, '0')}`,
            title: `${randomElement(['Guidelines for', 'Instructions regarding', 'Notification about', 'Circular for'])} ${randomElement(['Annual Examination 2025', 'Teacher Training Program', 'Student Registration', 'Academic Calendar', 'Board Examination Schedule', 'Fee Structure Revision', 'Holiday List 2025'])}`,
            description: `This circular provides ${randomElement(['detailed guidelines', 'important instructions', 'necessary information', 'updated regulations'])} regarding ${randomElement(['examination conduct', 'administrative procedures', 'academic activities', 'school operations'])}.`,
            file_url: i % 3 === 0 ? `https://storage.example.com/circulars/circular_${i + 1}.pdf` : null,
            issued_by: randomElement(circularIssuers),
            issued_date: generateDate(2024, 2025),
            effective_date: generateFutureDate(30),
            is_active: true,
            school_id: null, // Circulars are global - created by admin
            created_by: randomElement(admins).id, // Only admins create circulars
            created_at: generateDate(2024, 2025),
        }))
    });
    console.log(`✅ Created ${circulars.count} circulars\n`);

    // ========== SUMMARY ==========
    console.log('═══════════════════════════════════════════════');
    console.log('📊 SEEDING COMPLETE - SUMMARY');
    console.log('═══════════════════════════════════════════════');
    console.log(`Users:              ${users.length}`);
    console.log(`Districts:          ${districts.length}`);
    console.log(`Schools:            ${schools.length}`);
    console.log(`Faculty:            ${faculties.length}`);
    console.log(`Teaching Assignments: ${teachingAssignments.length}`);
    console.log(`Non-Teaching Staff: ${nonTeachingStaff.count}`);
    console.log(`Student Strength:   ${studentStrengthData.length}`);
    console.log(`Tasks:              ${tasks.length}`);
    console.log(`Task Events:        ${taskEvents.length}`);
    console.log(`Audit Logs:         ${auditLogs.count}`);
    console.log(`Events:             ${events.count}`);
    console.log(`Notices:            ${notices.count}`);
    console.log(`Circulars:          ${circulars.count}`);
    console.log('═══════════════════════════════════════════════');
    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📝 Default password for all users: 12345678');
}

main()
    .catch((e) => {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
