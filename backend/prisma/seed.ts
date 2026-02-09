/**
 * Prisma Seed Script - LARGE SCALE NAGALAND DATASET
 * 
 * Creates thousands of records with focus on Nagaland districts.
 * Run with: npx prisma db seed
 * 
 * SCALED DATA STRUCTURE:
 * - 16 Districts (Nagaland only with uneven distribution)
 * - 4000 Schools
 * - 18000+ Users (very uneven distribution for histogram)
 * - 15000 Teachers
 * - 4000 Headmasters
 * - 25000+ Teaching Assignments
 * - 8000 Non-Teaching Staff (avg 2 per school)
 * - 20000 Student Strength records (5 classes × 4000 schools)
 * - 2000 Tasks for delivery officers
 * - 5000+ Task Events
 * - 3000 Audit Logs
 * - 1500 Events
 * - 2500 Event Invitations
 * - 1000 Notices
 * - 800 Circulars
 * - 500 Helpdesk Tickets
 * - 1500 Notification Logs
 * - 800 Paper Setter Selections
 * - 500 Bank Details
 * - 300 User Stars
 * - 600 Form Submissions
 */

import { PrismaClient, UserRole, Gender, TaskStatus, EventType, FacultyType, ApprovalStatus, InvitationStatus, SelectionStatus, FormSubmissionStatus, NoticeType, SchoolEventType } from '@prisma/client';

const prisma = new PrismaClient();

// ==================== HELPER FUNCTIONS ====================

const randomElement = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min;
const randomDecimal = (min: number, max: number, decimals: number = 7): number =>
    parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
const randomBoolean = (probability: number = 0.5): boolean => Math.random() < probability;

// Weighted random selection
const weightedRandom = <T>(items: T[], weights: number[]): T => {
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;
    for (let i = 0; i < items.length; i++) {
        random -= weights[i];
        if (random <= 0) return items[i];
    }
    return items[items.length - 1];
};

// ==================== DATA ARRAYS ====================

const firstNames = [
    'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Ayaan', 'Krishna', 'Ishaan',
    'Ananya', 'Aadhya', 'Myra', 'Aanya', 'Diya', 'Pari', 'Sara', 'Ira', 'Aisha', 'Navya',
    'Rahul', 'Amit', 'Suresh', 'Ramesh', 'Vijay', 'Sanjay', 'Priya', 'Neha', 'Sunita', 'Kavita',
    'Rajesh', 'Mahesh', 'Ganesh', 'Dinesh', 'Rakesh', 'Pooja', 'Deepa', 'Rekha', 'Seema', 'Geeta',
    'Vikas', 'Ravi', 'Ajay', 'Prakash', 'Manoj', 'Ashok', 'Pankaj', 'Suman', 'Anjali', 'Ritu',
    // Naga names
    'Temjen', 'Bendang', 'Imchen', 'Meren', 'Nungsang', 'Limasen', 'Akum', 'Moatoshi', 'Imkong',
    'Vezoto', 'Khriezotuo', 'Menguzelie', 'Neiketuolie', 'Vihoto', 'Khrielakuo', 'Mhasilie',
    'Sentila', 'Arenla', 'Imtinaro', 'Temsunaro', 'Sentirenla', 'Akanglila', 'Chubalem',
    'Lipokmar', 'Temsuwati', 'Imtisunep', 'Sentisangla', 'Watirenla', 'Imtisangla', 'Keviseno'
];

const lastNames = [
    'Sharma', 'Verma', 'Gupta', 'Singh', 'Kumar', 'Patel', 'Das', 'Reddy', 'Rao', 'Nair',
    // Naga surnames
    'Ao', 'Sema', 'Angami', 'Lotha', 'Konyak', 'Chang', 'Phom', 'Yimchunger', 'Khiamniungan',
    'Sangtam', 'Pochury', 'Rengma', 'Zeliang', 'Chakhesang', 'Tikhir', 'Kuki', 'Rongmei',
    'Jamir', 'Longchar', 'Ozukum', 'Imchen', 'Walling', 'Kikon', 'Kithan', 'Kichu', 'Murry',
    'Lemtur', 'Pongen', 'Yaden', 'Patton', 'Kath', 'Thong', 'Shohe', 'Achumi', 'Swu'
];

// Nagaland districts with UNEVEN weights for histogram visualization
// Larger weights = more users/schools in that district
const nagalandDistricts = [
    { name: 'Dimapur', weight: 25 },      // Commercial hub - highest
    { name: 'Kohima', weight: 20 },       // Capital - second highest
    { name: 'Mokokchung', weight: 15 },   // Major town
    { name: 'Tuensang', weight: 12 },     // Largest district by area
    { name: 'Mon', weight: 10 },          // Konyak dominant
    { name: 'Wokha', weight: 8 },
    { name: 'Zunheboto', weight: 7 },
    { name: 'Phek', weight: 6 },
    { name: 'Peren', weight: 5 },
    { name: 'Longleng', weight: 4 },
    { name: 'Kiphire', weight: 3 },
    { name: 'Chumukedima', weight: 3 },   // Newly created
    { name: 'Noklak', weight: 2 },        // Newly created - smallest
    { name: 'Shamator', weight: 2 },      // Newly created
    { name: 'Tseminyu', weight: 2 },      // Newly created
    { name: 'Niuland', weight: 1 },       // Newly created - very small
];

const districtWeights = nagalandDistricts.map(d => d.weight);
const totalWeight = districtWeights.reduce((a, b) => a + b, 0);

const schoolPrefixes = ['Government', 'State', 'Public', 'Central', 'Model', 'Higher Secondary', 'Senior Secondary', 'Kendriya Vidyalaya', 'Baptist', 'Christian', 'St. Joseph', 'St. Mary', 'Don Bosco'];
const schoolSuffixes = ['High School', 'Higher Secondary School', 'Vidyalaya', 'Academy', 'Institution', 'School', 'College'];

const designations = [
    'Principal', 'Vice Principal', 'Senior Teacher', 'Teacher', 'Assistant Teacher',
    'Head of Department', 'Lecturer', 'PGT', 'TGT', 'Primary Teacher', 'Subject Teacher'
];

const qualifications = [
    'M.Ed', 'B.Ed', 'M.A.', 'M.Sc.', 'M.Com.', 'Ph.D.', 'B.A.', 'B.Sc.', 'B.Com.',
    'M.Phil.', 'NET', 'SET', 'D.Ed', 'M.A. (English)', 'M.Sc. (Mathematics)', 'M.Sc. (Physics)'
];

const subjects = [
    'Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'Hindi', 'Alternative English', 'Tenyidie',
    'History', 'Geography', 'Political Science', 'Economics', 'Computer Science', 'Accountancy',
    'Business Studies', 'Physical Education', 'Music', 'Art', 'Environmental Science', 'Social Science'
];

const nonTeachingRoles = [
    'Clerk', 'Accountant', 'Peon', 'Watchman', 'Lab Assistant', 'Librarian',
    'Office Assistant', 'Computer Operator', 'Store Keeper', 'Driver', 'Sweeper', 'Mali'
];

const locations = [
    'NBSE Head Office', 'District Education Office', 'Police Station', 'Post Office',
    'Government School', 'Exam Center', 'Administrative Building', 'Storage Facility',
    'Treasury Office', 'Sub-Divisional Office'
];

const schoolEventTypes: SchoolEventType[] = [
    SchoolEventType.MEETING,
    SchoolEventType.EXAM,
    SchoolEventType.HOLIDAY,
    SchoolEventType.SEMINAR,
    SchoolEventType.WORKSHOP,
    SchoolEventType.SPORTS,
    SchoolEventType.CULTURAL,
    SchoolEventType.OTHER,
];

const activityTypes = [
    'Teachers Training Program',
    'Parent-Teacher Meeting',
    'Annual Day Celebration',
    'Sports Day',
    'Science Exhibition',
    'Cultural Festival',
    'Workshop on NEP 2020',
    'Orientation Program',
    'Republic Day Celebration',
    'Independence Day Celebration',
    'Career Guidance Seminar',
    'Health Camp',
    'Environmental Awareness Program',
    'Hornbill Festival Celebration',
    'Naga Heritage Day',
];

const unsplashEventPhotos = [
    'https://images.unsplash.com/photo-1540575467063-178a50e2fd87?w=800&q=80',
    'https://images.unsplash.com/photo-1577896851231-70ef18881754?w=800&q=80',
    'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&q=80',
    'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800&q=80',
    'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=800&q=80',
    'https://images.unsplash.com/photo-1571260899304-425eee4c7efc?w=800&q=80',
    'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=800&q=80',
    'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=800&q=80',
    'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&q=80',
    'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&q=80',
];

const noticeTypes: NoticeType[] = [
    NoticeType.GENERAL,
    NoticeType.PAPER_SETTER,
    NoticeType.PAPER_CHECKER,
    NoticeType.INVITATION,
    NoticeType.PUSH_NOTIFICATION,
];

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

// Batch processing helper
const processBatch = async <T>(
    items: T[],
    batchSize: number,
    processor: (batch: T[]) => Promise<void>
): Promise<void> => {
    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        await processor(batch);
    }
};

// ==================== MAIN SEEDING FUNCTION ====================

async function main() {
    console.log('🌱 Starting database seeding with LARGE SCALE NAGALAND data...\n');

    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await prisma.formSubmission.deleteMany();
    await prisma.userStar.deleteMany();
    await prisma.bankDetails.deleteMany();
    await prisma.paperSetterSelection.deleteMany();
    await prisma.notificationLog.deleteMany();
    await prisma.helpdesk.deleteMany();
    await prisma.circularSchool.deleteMany();  // M2M join table - delete before circulars
    await prisma.circular.deleteMany();
    await prisma.noticeRecipient.deleteMany();
    await prisma.notice.deleteMany();
    await prisma.eventInvitation.deleteMany();
    await prisma.event.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.taskEvent.deleteMany();
    await prisma.agentCurrentLocation.deleteMany();
    await prisma.agentLocationHistory.deleteMany();
    await prisma.attendance.deleteMany();
    await prisma.task.deleteMany();
    await prisma.studentStrength.deleteMany();
    await prisma.nonTeachingStaff.deleteMany();
    await prisma.teachingAssignment.deleteMany();
    await prisma.faculty.deleteMany();
    await prisma.examTrackerEvent.deleteMany();
    await prisma.school.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.district.deleteMany();
    await prisma.user.deleteMany();
    console.log('✅ Existing data cleared\n');

    const plainPassword = '12345678';

    // ==================== ADMIN, SUBJECT COORDINATOR, ASSISTANT (KEEP INTACT) ====================
    console.log('Creating Admin, Subject Coordinator, Assistant...');
    await prisma.user.create({ data: { name: 'Ritik Raj', email: 'admin@gmail.com', password: plainPassword, role: 'ADMIN', is_active: true, phone: '1234567890', gender: 'MALE', profile_image_url: 'https://cloud.appwrite.io/v1/storage/buckets/69713da5003bc351cdad/files/6987171300319c9aa594/view?project=69711b25002e71bb9eae&mode=admin', created_at: new Date() } });
    // Subject Coordinator with assigned subject and class group
    await prisma.user.create({
        data: {
            name: 'Viraj Bhardwaj',
            email: 'viraj@gmail.com',
            password: plainPassword,
            role: 'SUBJECT_COORDINATOR',
            is_active: true,
            phone: '9896008137',
            gender: 'MALE',
            profile_image_url: 'https://cloud.appwrite.io/v1/storage/buckets/69713da5003bc351cdad/files/6987171300319c9aa594/view?project=69711b25002e71bb9eae&mode=admin',
            coordinator_subject: 'Mathematics',
            coordinator_class_group: '8-10',
            created_at: new Date()
        }
    });
    await prisma.user.create({ data: { name: 'Bittu Raja', email: 'bittu@gmail.com', password: plainPassword, role: 'ASSISTANT', is_active: true, phone: '9876543210', gender: 'MALE', profile_image_url: 'https://cloud.appwrite.io/v1/storage/buckets/69713da5003bc351cdad/files/6987171300319c9aa594/view?project=69711b25002e71bb9eae&mode=admin', created_at: new Date() } });
    console.log('✅ Admin, Subject Coordinator, Assistant created\n');

    // ==================== DISTRICTS (16 Nagaland Districts) ====================
    console.log('🗺️  Creating 16 Nagaland districts...');
    const districts = await Promise.all(
        nagalandDistricts.map((d, i) =>
            prisma.district.create({
                data: {
                    name: d.name,
                    state: 'Nagaland',
                    created_at: generateDate(2018, 2022),
                }
            })
        )
    );
    console.log(`✅ Created ${districts.length} districts\n`);

    // Create district lookup with weights
    const districtData = districts.map((d, i) => ({
        ...d,
        weight: nagalandDistricts[i].weight
    }));

    const getWeightedDistrict = () => {
        return weightedRandom(districtData, districtData.map(d => d.weight));
    };

    // ==================== SCHOOLS (4000 records - weighted by district) ====================
    console.log('🏫 Creating 4000 schools (weighted distribution)...');
    const schoolData: { name: string; registration_code: string; district_id: string; created_at: Date }[] = [];

    for (let i = 0; i < 4000; i++) {
        const district = getWeightedDistrict();
        schoolData.push({
            name: generateSchoolName(district.name, i),
            registration_code: generateRegCode(i),
            district_id: district.id,
            created_at: generateDate(2010, 2023),
        });
    }

    // Insert in batches
    await processBatch(schoolData, 500, async (batch) => {
        await prisma.school.createMany({ data: batch });
    });

    const schools = await prisma.school.findMany();
    console.log(`✅ Created ${schools.length} schools\n`);

    // Print school distribution by district
    console.log('📊 School distribution by district:');
    for (const d of districtData) {
        const count = schools.filter(s => s.district_id === d.id).length;
        console.log(`   ${d.name}: ${count} schools`);
    }
    console.log('');

    // ==================== USERS (18000+ records with VERY UNEVEN distribution) ====================
    console.log('👥 Creating 18000+ users with uneven district distribution...');

    // User counts
    const SUPER_ADMIN_COUNT = 3;
    const ADMIN_COUNT = 20;
    const SEBA_OFFICER_COUNT = 500;
    const HEADMASTER_COUNT = 4000; // One per school approximately
    const TEACHER_COUNT = 15000;
    const CENTER_SUPERINTENDENT_COUNT = 800;

    const totalUsers = SUPER_ADMIN_COUNT + ADMIN_COUNT + SEBA_OFFICER_COUNT +
        HEADMASTER_COUNT + TEACHER_COUNT + CENTER_SUPERINTENDENT_COUNT;

    // Create uneven distribution - some districts have 10x more than others
    // This creates a nice histogram with varying bar heights
    const userDistribution: { district: typeof districtData[0]; count: number }[] = [];

    // Calculate user counts per district based on weights
    let assignedUsers = 0;
    for (let i = 0; i < districtData.length; i++) {
        const d = districtData[i];
        let count: number;
        if (i === districtData.length - 1) {
            count = TEACHER_COUNT - assignedUsers;
        } else {
            count = Math.floor((d.weight / totalWeight) * TEACHER_COUNT);
        }
        userDistribution.push({ district: d, count });
        assignedUsers += count;
    }

    console.log('📊 Planned teacher distribution by district:');
    userDistribution.forEach(ud => {
        console.log(`   ${ud.district.name}: ${ud.count} teachers (weight: ${ud.district.weight})`);
    });
    console.log('');

    // Create users in batches by role
    const allUserData: {
        name: string;
        email: string;
        password: string;
        phone: string;
        role: UserRole;
        gender: Gender;
        is_active: boolean;
        device_id: string | null;
        created_at: Date;
        districtId?: string;
    }[] = [];

    let userIndex = 0;

    // SUPER_ADMIN (3)
    for (let i = 0; i < SUPER_ADMIN_COUNT; i++) {
        allUserData.push({
            name: generateName(),
            email: generateEmail(userIndex),
            password: plainPassword,
            phone: generatePhone(userIndex),
            role: 'SUPER_ADMIN',
            gender: randomElement(['MALE', 'FEMALE'] as Gender[]),
            is_active: true,
            device_id: null,
            created_at: generateDate(2021, 2023),
        });
        userIndex++;
    }

    // ADMIN (20)
    for (let i = 0; i < ADMIN_COUNT; i++) {
        allUserData.push({
            name: generateName(),
            email: generateEmail(userIndex),
            password: plainPassword,
            phone: generatePhone(userIndex),
            role: 'ADMIN',
            gender: randomElement(['MALE', 'FEMALE'] as Gender[]),
            is_active: true,
            device_id: null,
            created_at: generateDate(2021, 2024),
        });
        userIndex++;
    }

    // SEBA_OFFICER (500) - distributed by district weight
    for (let i = 0; i < SEBA_OFFICER_COUNT; i++) {
        const district = getWeightedDistrict();
        allUserData.push({
            name: generateName(),
            email: generateEmail(userIndex),
            password: plainPassword,
            phone: generatePhone(userIndex),
            role: 'SEBA_OFFICER',
            gender: randomElement(['MALE', 'FEMALE'] as Gender[]),
            is_active: randomBoolean(0.95),
            device_id: `device_${userIndex}`,
            created_at: generateDate(2022, 2025),
            districtId: district.id,
        });
        userIndex++;
    }

    // HEADMASTER (4000) - one per school ideally
    for (let i = 0; i < HEADMASTER_COUNT; i++) {
        const district = getWeightedDistrict();
        allUserData.push({
            name: generateName(),
            email: generateEmail(userIndex),
            password: plainPassword,
            phone: generatePhone(userIndex),
            role: 'HEADMASTER',
            gender: randomElement(['MALE', 'FEMALE'] as Gender[]),
            is_active: randomBoolean(0.96),
            device_id: null,
            created_at: generateDate(2020, 2025),
            districtId: district.id,
        });
        userIndex++;
    }

    // TEACHER (15000) - distributed VERY unevenly by district
    for (const ud of userDistribution) {
        for (let i = 0; i < ud.count; i++) {
            allUserData.push({
                name: generateName(),
                email: generateEmail(userIndex),
                password: plainPassword,
                phone: generatePhone(userIndex),
                role: 'TEACHER',
                gender: randomElement(['MALE', 'FEMALE'] as Gender[]),
                is_active: randomBoolean(0.94),
                device_id: null,
                created_at: generateDate(2019, 2025),
                districtId: ud.district.id,
            });
            userIndex++;
        }
    }

    // CENTER_SUPERINTENDENT (800) - distributed by district weight
    for (let i = 0; i < CENTER_SUPERINTENDENT_COUNT; i++) {
        const district = getWeightedDistrict();
        allUserData.push({
            name: generateName(),
            email: generateEmail(userIndex),
            password: plainPassword,
            phone: generatePhone(userIndex),
            role: 'CENTER_SUPERINTENDENT',
            gender: randomElement(['MALE', 'FEMALE'] as Gender[]),
            is_active: randomBoolean(0.95),
            device_id: null,
            created_at: generateDate(2022, 2025),
            districtId: district.id,
        });
        userIndex++;
    }

    // Insert users in batches
    console.log(`📝 Inserting ${allUserData.length} users in batches...`);
    await processBatch(allUserData, 500, async (batch) => {
        await prisma.user.createMany({
            data: batch.map(({ districtId, ...user }) => user)
        });
    });

    const users = await prisma.user.findMany();
    console.log(`✅ Created ${users.length} users\n`);

    // Filter users by role
    const admins = users.filter(u => u.role === 'ADMIN' || u.role === 'SUPER_ADMIN');
    const sebaOfficers = users.filter(u => u.role === 'SEBA_OFFICER');
    const headmasters = users.filter(u => u.role === 'HEADMASTER');
    const teachers = users.filter(u => u.role === 'TEACHER');
    const centerSuperintendents = users.filter(u => u.role === 'CENTER_SUPERINTENDENT');

    console.log('📊 User role distribution:');
    console.log(`   SUPER_ADMIN: ${users.filter(u => u.role === 'SUPER_ADMIN').length}`);
    console.log(`   ADMIN: ${users.filter(u => u.role === 'ADMIN').length}`);
    console.log(`   SEBA_OFFICER: ${sebaOfficers.length}`);
    console.log(`   HEADMASTER: ${headmasters.length}`);
    console.log(`   TEACHER: ${teachers.length}`);
    console.log(`   CENTER_SUPERINTENDENT: ${centerSuperintendents.length}`);
    console.log('');

    // ==================== FACULTY (15000+ records) ====================
    console.log('👨‍🏫 Creating faculty records for teachers and headmasters...');

    const facultyData: {
        user_id: string;
        school_id: string;
        faculty_type: FacultyType;
        designation: string;
        highest_qualification: string;
        years_of_experience: number;
        approval_status: ApprovalStatus;
        approved_by: string | null;
        is_profile_locked: boolean;
        created_at: Date;
    }[] = [];

    // Assign headmasters to schools (1:1)
    for (let i = 0; i < Math.min(headmasters.length, schools.length); i++) {
        facultyData.push({
            user_id: headmasters[i].id,
            school_id: schools[i].id,
            faculty_type: 'NON_TEACHING',
            designation: 'Principal',
            highest_qualification: randomElement(qualifications),
            years_of_experience: randomInt(10, 35),
            approval_status: randomBoolean(0.95) ? 'APPROVED' : randomElement(['PENDING', 'REJECTED'] as ApprovalStatus[]),
            approved_by: randomBoolean(0.95) ? randomElement(admins).id : null,
            is_profile_locked: randomBoolean(0.8),
            created_at: generateDate(2020, 2025),
        });
    }

    // Assign teachers to schools (distributed based on school's district weight)
    // Each school gets approximately 3-4 teachers on average
    const schoolsById = new Map(schools.map(s => [s.id, s]));

    for (let i = 0; i < teachers.length; i++) {
        const school = schools[i % schools.length];
        facultyData.push({
            user_id: teachers[i].id,
            school_id: school.id,
            faculty_type: 'TEACHING',
            designation: randomElement(designations.filter(d => d !== 'Principal')),
            highest_qualification: randomElement(qualifications),
            years_of_experience: randomInt(1, 30),
            approval_status: randomBoolean(0.90) ? 'APPROVED' : randomElement(['PENDING', 'REJECTED'] as ApprovalStatus[]),
            approved_by: randomBoolean(0.90) ? randomElement(admins).id : null,
            is_profile_locked: randomBoolean(0.7),
            created_at: generateDate(2020, 2025),
        });
    }

    console.log(`📝 Inserting ${facultyData.length} faculty records in batches...`);
    await processBatch(facultyData, 500, async (batch) => {
        await prisma.faculty.createMany({ data: batch });
    });

    const faculties = await prisma.faculty.findMany();
    console.log(`✅ Created ${faculties.length} faculty records\n`);

    // ==================== TEACHING ASSIGNMENTS (25000+ records) ====================
    console.log('📚 Creating teaching assignments...');
    const classLevels = [8, 9, 10, 11, 12];
    const teachingFaculty = faculties.filter(f => f.faculty_type === 'TEACHING');
    const assignmentSet = new Set<string>();
    const teachingAssignments: { faculty_id: string; class_level: number; subject: string }[] = [];

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

    console.log(`📝 Inserting ${teachingAssignments.length} teaching assignments in batches...`);
    await processBatch(teachingAssignments, 1000, async (batch) => {
        await prisma.teachingAssignment.createMany({ data: batch });
    });
    console.log(`✅ Created ${teachingAssignments.length} teaching assignments\n`);

    // ==================== NON-TEACHING STAFF (8000 records - avg 2 per school) ====================
    console.log('🧹 Creating 8000 non-teaching staff...');
    const nonTeachingData = Array.from({ length: 8000 }, (_, i) => ({
        school_id: schools[i % schools.length].id,
        full_name: generateName(),
        qualification: randomElement(['10th Pass', '12th Pass', 'Graduate', 'Post Graduate', 'ITI']),
        nature_of_work: randomElement(nonTeachingRoles),
        years_of_service: randomInt(1, 25),
        phone: `${randomInt(60000, 79999)}${String(i).padStart(5, '0')}`,
        created_at: generateDate(2015, 2025),
    }));

    await processBatch(nonTeachingData, 500, async (batch) => {
        await prisma.nonTeachingStaff.createMany({ data: batch });
    });
    console.log(`✅ Created 8000 non-teaching staff\n`);

    // ==================== STUDENT STRENGTH (20000 records - 5 classes × 4000 schools) ====================
    console.log('🎓 Creating student strength records...');
    const studentStrengthData: {
        school_id: string;
        class_level: number;
        boys: number;
        girls: number;
        sections: number;
        created_at: Date
    }[] = [];

    for (const school of schools) {
        for (const classLevel of classLevels) {
            studentStrengthData.push({
                school_id: school.id,
                class_level: classLevel,
                boys: randomInt(20, 200),
                girls: randomInt(20, 200),
                sections: randomInt(1, 6),
                created_at: generateDate(2023, 2025),
            });
        }
    }

    console.log(`📝 Inserting ${studentStrengthData.length} student strength records in batches...`);
    await processBatch(studentStrengthData, 1000, async (batch) => {
        await prisma.studentStrength.createMany({ data: batch });
    });
    console.log(`✅ Created ${studentStrengthData.length} student strength records\n`);

    // ==================== TASKS (2000 records) ====================
    console.log('📦 Creating 2000 tasks...');
    const taskData: {
        sealed_pack_code: string;
        source_location: string;
        destination_location: string;
        assigned_user_id: string;
        start_time: Date;
        end_time: Date;
        status: TaskStatus;
        is_double_shift: boolean;
        shift_type: string;
        expected_travel_time: number;
        created_at: Date;
    }[] = [];

    for (let i = 0; i < 2000; i++) {
        const startTime = generateFutureDate(90);
        const endTime = new Date(startTime);
        endTime.setHours(endTime.getHours() + randomInt(2, 10));

        let status: TaskStatus;
        if (i < 1000) status = 'COMPLETED';
        else if (i < 1600) status = 'IN_PROGRESS';
        else if (i < 1850) status = 'PENDING';
        else status = 'SUSPICIOUS';

        const sourceDistrict = getWeightedDistrict();
        const destDistrict = getWeightedDistrict();

        taskData.push({
            sealed_pack_code: generatePackCode(i),
            source_location: `${randomElement(locations)}, ${sourceDistrict.name}`,
            destination_location: `${randomElement(locations)}, ${destDistrict.name}`,
            assigned_user_id: randomElement(sebaOfficers).id,
            start_time: startTime,
            end_time: endTime,
            status,
            is_double_shift: randomBoolean(0.3),
            shift_type: randomElement(['MORNING', 'AFTERNOON']),
            expected_travel_time: randomInt(60, 300),
            created_at: generateDate(2024, 2025),
        });
    }

    await processBatch(taskData, 200, async (batch) => {
        await prisma.task.createMany({ data: batch });
    });

    const tasks = await prisma.task.findMany();
    console.log(`✅ Created ${tasks.length} tasks\n`);

    // ==================== TASK EVENTS (5000+ records) ====================
    console.log('📍 Creating task events...');
    const eventTypesTask: EventType[] = ['PICKUP_POLICE_STATION', 'ARRIVAL_EXAM_CENTER', 'OPENING_SEAL', 'SEALING_ANSWER_SHEETS', 'SUBMISSION_POST_OFFICE'];
    const legacyEventTypes: EventType[] = ['PICKUP', 'TRANSIT', 'FINAL'];
    const taskEvents: {
        task_id: string;
        event_type: EventType;
        image_url: string;
        image_hash: string;
        latitude: number;
        longitude: number;
        server_timestamp: Date;
        created_at: Date;
    }[] = [];

    for (const task of tasks) {
        const isLegacy = randomBoolean(0.2);
        const types = isLegacy ? legacyEventTypes : eventTypesTask;

        if (task.status === 'COMPLETED') {
            for (const eventType of types) {
                taskEvents.push({
                    task_id: task.id,
                    event_type: eventType,
                    image_url: `https://storage.example.com/events/${task.id}/${eventType}.jpg`,
                    image_hash: generateImageHash(),
                    latitude: randomDecimal(25.0, 27.0), // Nagaland latitude range
                    longitude: randomDecimal(93.0, 95.5), // Nagaland longitude range
                    server_timestamp: new Date(),
                    created_at: new Date(),
                });
            }
        } else if (task.status === 'IN_PROGRESS') {
            const numEvents = randomInt(1, types.length - 1);
            for (let j = 0; j < numEvents; j++) {
                taskEvents.push({
                    task_id: task.id,
                    event_type: types[j],
                    image_url: `https://storage.example.com/events/${task.id}/${types[j]}.jpg`,
                    image_hash: generateImageHash(),
                    latitude: randomDecimal(25.0, 27.0),
                    longitude: randomDecimal(93.0, 95.5),
                    server_timestamp: new Date(),
                    created_at: new Date(),
                });
            }
        }
    }

    console.log(`📝 Inserting ${taskEvents.length} task events in batches...`);
    await processBatch(taskEvents, 500, async (batch) => {
        await prisma.taskEvent.createMany({ data: batch });
    });
    console.log(`✅ Created ${taskEvents.length} task events\n`);

    // ==================== AUDIT LOGS (3000 records) ====================
    console.log('📋 Creating 3000 audit logs...');
    const auditActions = [
        'USER_LOGIN', 'USER_LOGOUT', 'USER_REGISTERED', 'TASK_CREATED', 'TASK_UPDATED',
        'PROFILE_UPDATED', 'FACULTY_APPROVED', 'EVENT_CREATED', 'NOTICE_PUBLISHED'
    ];

    const auditData = Array.from({ length: 3000 }, () => ({
        user_id: randomBoolean(0.95) ? randomElement(users).id : null,
        action: randomElement(auditActions),
        entity_type: randomElement(['User', 'Task', 'Faculty', 'Event', 'Notice']),
        entity_id: randomElement(users).id,
        ip_address: `192.168.${randomInt(1, 255)}.${randomInt(1, 255)}`,
        created_at: generateDate(2024, 2025),
    }));

    await processBatch(auditData, 500, async (batch) => {
        await prisma.auditLog.createMany({ data: batch });
    });
    console.log(`✅ Created 3000 audit logs\n`);

    // ==================== EVENTS (1500 records) ====================
    console.log('📅 Creating 1500 events...');
    const eventData: {
        title: string;
        description: string;
        event_date: Date;
        event_end_date: Date | null;
        event_time: string;
        location: string;
        event_type: SchoolEventType;
        activity_type: string;
        flyer_url: string | null;
        male_participants: number;
        female_participants: number;
        is_active: boolean;
        school_id: string | null;
        district_id: string | null;
        created_by: string;
        created_at: Date;
    }[] = [];

    for (let i = 0; i < 1500; i++) {
        const isSchoolLevel = randomBoolean(0.7);
        const eventType = randomElement(schoolEventTypes);
        const eventDate = generateFutureDate(180);
        const eventEndDate = randomBoolean(0.3) ? new Date(eventDate.getTime() + randomInt(1, 3) * 24 * 60 * 60 * 1000) : null;
        const district = getWeightedDistrict();

        eventData.push({
            title: `${randomElement(['Annual', 'Monthly', 'Special', 'District'])} ${eventType} ${i + 1}`,
            description: `Event description for ${eventType}. This event aims to enhance the educational experience and bring together students, teachers, and parents for collaborative learning.`,
            event_date: eventDate,
            event_end_date: eventEndDate,
            event_time: `${randomInt(8, 17)}:${randomElement(['00', '30'])}`,
            location: `${randomElement(locations)}, ${district.name}`,
            event_type: eventType,
            activity_type: randomElement(activityTypes),
            flyer_url: randomBoolean(0.6) ? randomElement(unsplashEventPhotos) : null,
            male_participants: randomInt(5, 100),
            female_participants: randomInt(5, 120),
            is_active: randomBoolean(0.9),
            school_id: isSchoolLevel ? randomElement(schools).id : null,
            district_id: !isSchoolLevel ? district.id : null,
            created_by: randomElement([...headmasters.slice(0, 500), ...admins]).id,
            created_at: generateDate(2024, 2025),
        });
    }

    await processBatch(eventData, 200, async (batch) => {
        await prisma.event.createMany({ data: batch });
    });

    const events = await prisma.event.findMany();
    console.log(`✅ Created ${events.length} events\n`);

    // ==================== EVENT INVITATIONS (2500 records) ====================
    console.log('✉️  Creating 2500 event invitations...');
    const invitationSet = new Set<string>();
    const invitations: {
        event_id: string;
        user_id: string;
        status: InvitationStatus;
        rejection_reason: string | null;
        responded_at: Date | null;
        created_at: Date;
    }[] = [];

    for (const event of events.slice(0, 800)) {
        const numInvites = randomInt(2, 5);
        for (let j = 0; j < numInvites; j++) {
            const user = randomElement([...teachers.slice(0, 5000), ...headmasters.slice(0, 1000)]);
            const key = `${event.id}-${user.id}`;
            if (!invitationSet.has(key)) {
                invitationSet.add(key);
                invitations.push({
                    event_id: event.id,
                    user_id: user.id,
                    status: randomElement(['PENDING', 'ACCEPTED', 'REJECTED'] as InvitationStatus[]),
                    rejection_reason: randomBoolean(0.1) ? 'Unable to attend due to prior commitments' : null,
                    responded_at: randomBoolean(0.7) ? new Date() : null,
                    created_at: generateDate(2024, 2025),
                });
            }
        }
    }

    await processBatch(invitations, 500, async (batch) => {
        await prisma.eventInvitation.createMany({ data: batch });
    });
    console.log(`✅ Created ${invitations.length} event invitations\n`);

    // ==================== NOTICES (1000 records - ADMIN ONLY) ====================
    console.log('📢 Creating 1000 notices (admin-created only)...');
    const noticeData = Array.from({ length: 1000 }, (_, i) => {
        const type = randomElement(noticeTypes);
        const isSchoolLevel = randomBoolean(0.4);
        return {
            title: `${type} Notice ${i + 1} - ${randomElement(['Exam', 'Holiday', 'Meeting', 'Training', 'NBSE Update'])}`,
            content: `This is an important ${type.toLowerCase()} notice for all stakeholders. Please read carefully and take necessary action.`,
            type: type,
            subject: (type === NoticeType.PAPER_SETTER || type === NoticeType.PAPER_CHECKER) ? randomElement(subjects) : null,
            venue: type === NoticeType.INVITATION ? `${randomElement(locations)}, ${getWeightedDistrict().name}` : null,
            event_time: type === NoticeType.INVITATION ? `${randomInt(9, 16)}:00` : null,
            event_date: type === NoticeType.INVITATION ? generateFutureDate(60) : null,
            published_at: new Date(),
            expires_at: randomBoolean(0.8) ? generateFutureDate(90) : null,
            is_active: randomBoolean(0.95),
            school_id: isSchoolLevel ? randomElement(schools).id : null,
            created_by: randomElement(admins).id,
            file_url: randomBoolean(0.3) ? `https://storage.example.com/notices/notice_${i}.pdf` : null,
            file_name: randomBoolean(0.3) ? `notice_${i}.pdf` : null,
            created_at: generateDate(2024, 2025),
        };
    });

    await processBatch(noticeData, 200, async (batch) => {
        await prisma.notice.createMany({ data: batch });
    });
    console.log(`✅ Created 1000 notices\n`);

    // ==================== CIRCULARS (800 records - ADMIN ONLY) ====================
    console.log('📄 Creating 800 circulars (admin-created only)...');
    const circularData = Array.from({ length: 800 }, (_, i) => {
        const isDistrictLevel = randomBoolean(0.3);  // 30% district-level
        const isMultiSchool = !isDistrictLevel && randomBoolean(0.4);  // 40% of remaining are multi-school
        const district = getWeightedDistrict();
        return {
            circular_no: generateCircularNo(i + 1),
            title: `Circular ${i + 1} - ${randomElement(['Exam Schedule', 'Policy Update', 'Guidelines', 'Instructions', 'NBSE Notification'])}`,
            description: `Official circular regarding administrative and academic matters for ${randomElement(['HSLC', 'HSSLC', 'Board Exams'])} examinations.`,
            file_url: randomBoolean(0.8) ? `https://storage.example.com/circulars/circular_${i}.pdf` : null,
            issued_by: randomElement(['NBSE', 'State Government', 'District Office', 'Education Department', 'Chief Secretary']),
            issued_date: generateDate(2024, 2025),
            effective_date: generateFutureDate(30),
            is_active: randomBoolean(0.95),
            district_id: isDistrictLevel ? district.id : null,
            // Only set school_id for single-school circulars (not multi-school)
            school_id: (!isDistrictLevel && !isMultiSchool && randomBoolean(0.5)) ? randomElement(schools).id : null,
            created_by: randomElement(admins).id,
            created_at: generateDate(2024, 2025),
            _isMultiSchool: isMultiSchool,  // Marker for CircularSchool creation
            _districtId: district.id,  // Store for filtering schools
        };
    });

    await processBatch(circularData, 200, async (batch) => {
        await prisma.circular.createMany({
            data: batch.map(({ _isMultiSchool, _districtId, ...c }) => c)
        });
    });

    const circulars = await prisma.circular.findMany();
    console.log(`✅ Created ${circulars.length} circulars\n`);

    // ==================== CIRCULAR SCHOOLS (M2M for multi-school circulars) ====================
    console.log('🔗 Creating CircularSchool M2M entries for multi-school circulars...');
    const circularSchoolData: { circular_id: string; school_id: string }[] = [];

    // For each multi-school circular, link it to 3-8 random schools from a district
    for (let i = 0; i < circularData.length; i++) {
        const circularMeta = circularData[i];
        if (circularMeta._isMultiSchool) {
            const circular = circulars[i];
            // Get schools from the district
            const districtSchools = schools.filter(s => s.district_id === circularMeta._districtId);
            const numSchools = Math.min(randomInt(3, 8), districtSchools.length);

            // Pick random schools
            const shuffled = [...districtSchools].sort(() => 0.5 - Math.random());
            for (let j = 0; j < numSchools; j++) {
                circularSchoolData.push({
                    circular_id: circular.id,
                    school_id: shuffled[j].id,
                });
            }
        }
    }

    if (circularSchoolData.length > 0) {
        await processBatch(circularSchoolData, 500, async (batch) => {
            await prisma.circularSchool.createMany({ data: batch });
        });
    }
    console.log(`✅ Created ${circularSchoolData.length} CircularSchool M2M entries\n`);

    // ==================== HELPDESK TICKETS (500 records) ====================
    console.log('🎫 Creating 500 helpdesk tickets...');
    const helpdeskData = Array.from({ length: 500 }, () => {
        const user = randomElement(users);
        return {
            user_id: user.id,
            full_name: user.name,
            phone: user.phone,
            message: `Help needed with ${randomElement(['login issue', 'profile update', 'password reset', 'data correction', 'technical problem', 'form submission error', 'certificate request'])}`,
            is_resolved: randomBoolean(0.5),
            created_at: generateDate(2024, 2025),
        };
    });

    await processBatch(helpdeskData, 200, async (batch) => {
        await prisma.helpdesk.createMany({ data: batch });
    });
    console.log(`✅ Created 500 helpdesk tickets\n`);

    // ==================== NOTIFICATION LOGS (1500 records) ====================
    console.log('🔔 Creating 1500 notification logs...');
    const notificationData = Array.from({ length: 1500 }, () => {
        const user = randomElement(users);
        return {
            user_id: user.id,
            title: randomElement(['Task Update', 'Profile Approved', 'New Event', 'Important Notice', 'Exam Alert', 'Circular Published']),
            body: `You have a new notification regarding your ${randomElement(['task', 'profile', 'event', 'application', 'exam', 'school'])}`,
            type: randomElement(['TASK', 'PROFILE', 'NOTICE', 'EVENT', 'CIRCULAR']),
            is_read: randomBoolean(0.4),
            created_at: generateDate(2024, 2025),
        };
    });

    await processBatch(notificationData, 300, async (batch) => {
        await prisma.notificationLog.createMany({ data: batch });
    });
    console.log(`✅ Created 1500 notification logs\n`);

    // ==================== PAPER SETTER SELECTIONS (800 records) ====================
    console.log('📝 Creating 800 paper setter selections...');
    const selectionSet = new Set<string>();
    const paperSetterSelections: {
        teacher_id: string;
        coordinator_id: string;
        subject: string;
        class_level: number;
        selection_type: string;
        status: SelectionStatus;
        official_order_url: string | null;
        invitation_message: string;
        accepted_at: Date | null;
        created_at: Date;
    }[] = [];

    for (let i = 0; i < 800; i++) {
        const teacher = randomElement(teachers.slice(0, 5000));
        const coordinator = randomElement(admins);
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
                invitation_message: 'You are invited to participate in the paper setting process for NBSE examinations.',
                accepted_at: randomBoolean(0.4) ? new Date() : null,
                created_at: generateDate(2024, 2025),
            });
        }
    }

    await processBatch(paperSetterSelections, 200, async (batch) => {
        await prisma.paperSetterSelection.createMany({ data: batch });
    });
    console.log(`✅ Created ${paperSetterSelections.length} paper setter selections\n`);

    // ==================== BANK DETAILS (500 records) ====================
    console.log('🏦 Creating 500 bank details...');
    const bankNames = ['State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'Punjab National Bank', 'Bank of Baroda', 'Canara Bank'];
    const selectedTeachers = teachers.slice(0, 500);

    const bankData = selectedTeachers.map((teacher, i) => ({
        user_id: teacher.id,
        account_number: `${randomInt(100000000, 999999999)}`,
        account_name: teacher.name,
        ifsc_code: `${randomElement(['SBIN', 'HDFC', 'ICIC', 'UTIB', 'PUNB', 'BARB', 'CNRB'])}0${randomInt(100000, 999999)}`,
        bank_name: randomElement(bankNames),
        branch_name: `${getWeightedDistrict().name} Branch`,
        upi_id: randomBoolean(0.6) ? `${teacher.phone}@paytm` : null,
        created_at: generateDate(2023, 2025),
    }));

    await processBatch(bankData, 100, async (batch) => {
        await prisma.bankDetails.createMany({ data: batch });
    });
    console.log(`✅ Created 500 bank details\n`);

    // ==================== USER STARS (300 records) ====================
    console.log('⭐ Creating 300 user stars...');
    const starSet = new Set<string>();
    const userStars: {
        admin_id: string;
        starred_user_id: string;
        created_at: Date;
    }[] = [];

    for (let i = 0; i < 300; i++) {
        const admin = randomElement(admins);
        const starredUser = randomElement([...teachers.slice(0, 3000), ...headmasters.slice(0, 1000)]);
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

    // ==================== FORM SUBMISSIONS (600 records) ====================
    console.log('📋 Creating 600 form submissions...');
    const formSubmissionSet = new Set<string>();
    const formSubmissions: {
        school_id: string;
        submitted_by: string;
        form_type: string;
        status: FormSubmissionStatus;
        rejection_reason: string | null;
        approved_by: string | null;
        submitted_at: Date | null;
        approved_at: Date | null;
        created_at: Date;
    }[] = [];

    for (let i = 0; i < 600; i++) {
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
                rejection_reason: status === 'REJECTED' ? 'Incomplete information provided. Please verify and resubmit.' : null,
                approved_by: (status === 'APPROVED' || status === 'REJECTED') ? randomElement(admins).id : null,
                submitted_at: status !== 'DRAFT' ? new Date() : null,
                approved_at: (status === 'APPROVED' || status === 'REJECTED') ? new Date() : null,
                created_at: generateDate(2024, 2025),
            });
        }
    }

    await processBatch(formSubmissions, 200, async (batch) => {
        await prisma.formSubmission.createMany({ data: batch });
    });
    console.log(`✅ Created ${formSubmissions.length} form submissions\n`);

    // ==================== SUMMARY ====================
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('📊 SEEDING COMPLETE - LARGE SCALE NAGALAND DATASET SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`👥 Users:                    ${users.length}`);
    console.log(`   - SUPER_ADMIN:            ${users.filter(u => u.role === 'SUPER_ADMIN').length}`);
    console.log(`   - ADMIN:                  ${users.filter(u => u.role === 'ADMIN').length}`);
    console.log(`   - SEBA_OFFICER:           ${sebaOfficers.length}`);
    console.log(`   - HEADMASTER:             ${headmasters.length}`);
    console.log(`   - TEACHER:                ${teachers.length}`);
    console.log(`   - CENTER_SUPERINTENDENT:  ${centerSuperintendents.length}`);
    console.log(`🗺️  Districts:                ${districts.length} (Nagaland only)`);
    console.log(`🏫 Schools:                  ${schools.length}`);
    console.log(`👨‍🏫 Faculty:                  ${faculties.length}`);
    console.log(`📚 Teaching Assignments:     ${teachingAssignments.length}`);
    console.log(`🧹 Non-Teaching Staff:       8000`);
    console.log(`🎓 Student Strength:         ${studentStrengthData.length}`);
    console.log(`📦 Tasks:                    ${tasks.length}`);
    console.log(`📍 Task Events:              ${taskEvents.length}`);
    console.log(`📋 Audit Logs:               3000`);
    console.log(`📅 Events:                   ${events.length}`);
    console.log(`✉️  Event Invitations:        ${invitations.length}`);
    console.log(`📢 Notices:                  1000`);
    console.log(`📄 Circulars:                800`);
    console.log(`🎫 Helpdesk Tickets:         500`);
    console.log(`🔔 Notification Logs:        1500`);
    console.log(`📝 Paper Setter Selections:  ${paperSetterSelections.length}`);
    console.log(`🏦 Bank Details:             500`);
    console.log(`⭐ User Stars:               ${userStars.length}`);
    console.log(`📋 Form Submissions:         ${formSubmissions.length}`);
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('\n🎉 Database seeding completed successfully!');
    console.log('📝 Default password for all users: 12345678');
    console.log('\n💡 Data Proportions:');
    console.log(`   - Avg ${(schools.length / districts.length).toFixed(1)} schools per district`);
    console.log(`   - Avg ${(faculties.length / schools.length).toFixed(1)} faculty per school`);
    console.log(`   - Avg ${(teachingAssignments.length / teachingFaculty.length).toFixed(1)} assignments per teaching faculty`);

    console.log('\n📊 District-wise User Distribution (for histogram):');
    for (const d of districtData) {
        const districtSchools = schools.filter(s => s.district_id === d.id);
        console.log(`   ${d.name.padEnd(15)}: ${districtSchools.length} schools (weight: ${d.weight})`);
    }
}

main()
    .catch((e) => {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
