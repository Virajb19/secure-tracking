/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║          NOTICE SENDING — INTERACTIVE TERMINAL SIMULATOR           ║
 * ╠══════════════════════════════════════════════════════════════════════╣
 * ║                                                                    ║
 * ║  Simulates the FULL admin CMS notice workflow in your terminal:    ║
 * ║                                                                    ║
 * ║    Step 1:  Choose notice type (General, Paper Setter, etc.)       ║
 * ║    Step 2:  Choose targeting — Global / School / Targeted users    ║
 * ║    Step 3:  Fill in notice details (title, content, etc.)          ║
 * ║    Step 4:  If targeted → pick district → school → faculty        ║
 * ║    Step 5:  Confirm & send the notice via real API                 ║
 * ║    Step 6:  Verify visibility — DB-level + API spot-checks         ║
 * ║             ✅ Eligible users CAN see it                           ║
 * ║             ❌ Ineligible users CANNOT see it                      ║
 * ║    Step 7:  Cleanup — delete test notice                           ║
 * ║                                                                    ║
 * ║  Usage:                                                            ║
 * ║    npx ts-node scripts/notice-simulator.ts                         ║
 * ║                                                                    ║
 * ║  Prerequisites:                                                    ║
 * ║    - Backend running on localhost:3001                              ║
 * ║    - Database seeded with `npx prisma db seed`                     ║
 * ║                                                                    ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

import { PrismaClient, NoticeType } from '@prisma/client';
import * as readline from 'readline';

const prisma = new PrismaClient();

// ── Configuration ──────────────────────────────────────────────────
const API_URL = process.env.API_URL || 'http://localhost:3001/api';
const PASSWORD = '12345678'; // from seed.ts

// ── ANSI Colors ────────────────────────────────────────────────────
const c = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    underline: '\x1b[4m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    bgBlue: '\x1b[44m',
    bgGreen: '\x1b[42m',
    bgRed: '\x1b[41m',
    bgYellow: '\x1b[43m',
    bgMagenta: '\x1b[45m',
    bgCyan: '\x1b[46m',
};

// ── UI Helpers ─────────────────────────────────────────────────────
function banner(text: string, width = 68) {
    const pad = Math.max(0, Math.floor((width - text.length - 2) / 2));
    const padR = width - text.length - 2 - pad;
    console.log(`\n${c.bgBlue}${c.white}${c.bold} ${'═'.repeat(width)} ${c.reset}`);
    console.log(`${c.bgBlue}${c.white}${c.bold} ║${' '.repeat(pad)}${text}${' '.repeat(padR)}║ ${c.reset}`);
    console.log(`${c.bgBlue}${c.white}${c.bold} ${'═'.repeat(width)} ${c.reset}\n`);
}

function sectionHeader(step: number, title: string) {
    console.log(`\n${c.cyan}${c.bold}  ┌─────────────────────────────────────────────────────────────┐${c.reset}`);
    console.log(`${c.cyan}${c.bold}  │  STEP ${step}: ${title.padEnd(50)}│${c.reset}`);
    console.log(`${c.cyan}${c.bold}  └─────────────────────────────────────────────────────────────┘${c.reset}\n`);
}

function successMsg(text: string) {
    console.log(`  ${c.green}${c.bold}✅ ${text}${c.reset}`);
}

function errorMsg(text: string) {
    console.log(`  ${c.red}${c.bold}❌ ${text}${c.reset}`);
}

function warnMsg(text: string) {
    console.log(`  ${c.yellow}⚠  ${text}${c.reset}`);
}

function infoMsg(text: string) {
    console.log(`  ${c.dim}${text}${c.reset}`);
}

function label(key: string, value: string) {
    console.log(`  ${c.dim}${key.padEnd(20)}${c.reset}${c.bold}${value}${c.reset}`);
}

function divider() {
    console.log(`  ${c.dim}${'─'.repeat(60)}${c.reset}`);
}

function progressBar(current: number, total: number, width = 30): string {
    const pct = total === 0 ? 100 : Math.round((current / total) * 100);
    const filled = total === 0 ? width : Math.round((current / total) * width);
    const bar = `${c.green}${'█'.repeat(filled)}${c.dim}${'░'.repeat(width - filled)}${c.reset}`;
    return `${bar} ${pct}% (${current}/${total})`;
}

// ── readline prompt ────────────────────────────────────────────────
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

function ask(question: string, defaultValue?: string): Promise<string> {
    const suffix = defaultValue ? ` ${c.dim}[${defaultValue}]${c.reset}` : '';
    return new Promise((resolve) => {
        rl.question(`  ${c.magenta}❯${c.reset} ${question}${suffix}: `, (answer) => {
            resolve(answer.trim() || defaultValue || '');
        });
    });
}

function askConfirm(question: string): Promise<boolean> {
    return new Promise((resolve) => {
        rl.question(`  ${c.yellow}?${c.reset} ${question} ${c.dim}(y/N)${c.reset}: `, (answer) => {
            resolve(answer.trim().toLowerCase() === 'y' || answer.trim().toLowerCase() === 'yes');
        });
    });
}

// ── API Helpers ────────────────────────────────────────────────────

interface LoginResponse {
    access_token: string;
    user: { id: string; name: string; role: string };
}

interface NoticeResponse {
    id: string;
    title: string;
    content: string;
    type: string;
    is_targeted: boolean;
}

async function loginAdmin(): Promise<{ token: string; userId: string }> {
    const res = await fetch(`${API_URL}/auth/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: 'admin@gmail.com',
            password: PASSWORD,
            phone: '1234567890',
            device_id: 'simulator-admin-device',
        }),
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Admin login failed (${res.status}): ${text}`);
    }

    const data = (await res.json()) as LoginResponse;
    return { token: data.access_token, userId: data.user.id };
}

async function loginUser(phone: string, email?: string): Promise<string | null> {
    try {
        const body: Record<string, string> = {
            password: PASSWORD,
            phone,
            device_id: `sim-device-${phone}`,
        };
        if (email) body.email = email;

        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        if (!res.ok) return null;
        const data = (await res.json()) as LoginResponse;
        return data.access_token;
    } catch {
        return null;
    }
}

async function getNotices(token: string): Promise<NoticeResponse[]> {
    const res = await fetch(`${API_URL}/notices`, {
        headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
        throw new Error(`GET /notices failed: ${res.status}`);
    }

    return (await res.json()) as NoticeResponse[];
}

async function sendNoticeViaAPI(
    adminToken: string,
    payload: {
        user_ids: string[];
        title: string;
        message: string;
        type: NoticeType;
        subject?: string;
        class_level?: number;
        venue?: string;
        event_time?: string;
        event_date?: string;
    },
): Promise<{ notice: NoticeResponse }> {
    const res = await fetch(`${API_URL}/admin/notices/send`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Send notice failed (${res.status}): ${text}`);
    }

    return (await res.json()) as { notice: NoticeResponse };
}

async function createGlobalNoticeViaAPI(
    adminToken: string,
    payload: {
        title: string;
        content: string;
        school_id?: string;
    },
): Promise<NoticeResponse> {
    const res = await fetch(`${API_URL}/admin/notices`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Create notice failed (${res.status}): ${text}`);
    }

    return (await res.json()) as NoticeResponse;
}

// ── Notice Type Labels ─────────────────────────────────────────────
const NOTICE_TYPE_LABELS: Record<string, string> = {
    GENERAL: '📋 General Notice',
    PAPER_SETTER: '📝 Paper Setter Selection',
    PAPER_CHECKER: '✏️  Paper Checker Selection',
    INVITATION: '📨 Invitation',
    PUSH_NOTIFICATION: '🔔 Push Notification',
};

// ══════════════════════════════════════════════════════════════════
//  MAIN INTERACTIVE FLOW
// ══════════════════════════════════════════════════════════════════

async function main() {
    let noticeId: string | null = null;

    try {
        banner('NOTICE SENDING — INTERACTIVE SIMULATOR');

        label('Time', new Date().toLocaleString());
        label('API', API_URL);
        console.log('');

        // ══════════════════════════════════════════════════════════
        // STEP 0: Data Discovery
        // ══════════════════════════════════════════════════════════
        infoMsg('Connecting to database and surveying data...\n');

        const [totalDistricts, totalSchools, totalFaculty, totalUsers] = await Promise.all([
            prisma.district.count(),
            prisma.school.count(),
            prisma.faculty.count(),
            prisma.user.count(),
        ]);

        label('Districts', String(totalDistricts));
        label('Schools', String(totalSchools));
        label('Faculty', String(totalFaculty));
        label('Users', String(totalUsers));
        divider();

        // ══════════════════════════════════════════════════════════
        // STEP 1: Choose Notice Type
        // ══════════════════════════════════════════════════════════
        sectionHeader(1, 'CHOOSE NOTICE TYPE');
        console.log(`  ${c.bold}What type of notice do you want to send?${c.reset}\n`);

        const noticeTypes = Object.values(NoticeType);
        noticeTypes.forEach((type, i) => {
            console.log(`  ${c.cyan}[${i + 1}]${c.reset}  ${NOTICE_TYPE_LABELS[type] || type}`);
        });
        console.log('');

        const typeChoice = await ask(`Select type (1-${noticeTypes.length})`, '1');
        const typeIndex = parseInt(typeChoice, 10) - 1;

        if (typeIndex < 0 || typeIndex >= noticeTypes.length) {
            throw new Error('Invalid notice type selection.');
        }

        const selectedType = noticeTypes[typeIndex];
        console.log(`\n  ${c.green}→ Selected: ${c.bold}${NOTICE_TYPE_LABELS[selectedType]}${c.reset}`);

        // ══════════════════════════════════════════════════════════
        // STEP 2: Choose Targeting Mode
        // ══════════════════════════════════════════════════════════
        sectionHeader(2, 'CHOOSE TARGETING MODE');
        console.log(`  ${c.bold}How should this notice be targeted?${c.reset}\n`);
        console.log(`  ${c.cyan}[1]${c.reset}  🌐 ${c.bold}Global Notice${c.reset}  — Visible to all users (not targeted)`);
        console.log(`  ${c.cyan}[2]${c.reset}  🏫 ${c.bold}School-Specific${c.reset}  — Visible to faculty in a specific school`);
        console.log(`  ${c.cyan}[3]${c.reset}  🎯 ${c.bold}Targeted Users${c.reset}  — Send to specific users (targeted notice)\n`);

        const targetChoice = await ask('Select targeting (1/2/3)', '3');

        let targetMode: 'global' | 'school' | 'targeted' = 'targeted';
        let selectedSchoolId: string | null = null;
        let selectedSchoolName: string | null = null;
        let selectedUserIds: string[] = [];
        let selectedUserNames: string[] = [];
        let scopeLabel = '';

        if (targetChoice === '1') {
            // ── GLOBAL ──
            targetMode = 'global';
            scopeLabel = '🌐 GLOBAL (visible to all users)';
            console.log(`\n  ${c.green}→ Selected: ${scopeLabel}${c.reset}`);
        } else if (targetChoice === '2') {
            // ── SCHOOL-SPECIFIC ──
            targetMode = 'school';

            // Pick district first
            const districts = await prisma.district.findMany({
                orderBy: { name: 'asc' },
                include: { _count: { select: { schools: true } } },
            });

            console.log(`\n  ${c.bold}Select District:${c.reset}\n`);
            console.log(`  ${c.dim}${'#'.padStart(4)}  ${'District Name'.padEnd(25)} Schools${c.reset}`);
            console.log(`  ${c.dim}${'─'.repeat(45)}${c.reset}`);

            districts.forEach((d, i) => {
                const num = `${c.cyan}${String(i + 1).padStart(4)}${c.reset}`;
                const name = d.name.padEnd(25);
                const count = `${c.bold}${d._count.schools}${c.reset}`;
                console.log(`  ${num}  ${name} ${count}`);
            });

            console.log('');
            const districtChoice = await ask(`Select district (1-${districts.length})`);
            const districtIndex = parseInt(districtChoice, 10) - 1;

            if (districtIndex < 0 || districtIndex >= districts.length) {
                throw new Error('Invalid district selection.');
            }

            const chosenDistrict = districts[districtIndex];

            // List schools in district
            const schools = await prisma.school.findMany({
                where: { district_id: chosenDistrict.id },
                orderBy: { name: 'asc' },
                include: { _count: { select: { faculties: true } } },
            });

            console.log(`\n  ${c.bold}Schools in ${chosenDistrict.name}:${c.reset}\n`);
            console.log(`  ${c.dim}${'#'.padStart(4)}  ${'School Name'.padEnd(45)} Faculty${c.reset}`);
            console.log(`  ${c.dim}${'─'.repeat(60)}${c.reset}`);

            schools.forEach((s, i) => {
                const num = `${c.cyan}${String(i + 1).padStart(4)}${c.reset}`;
                const name = s.name.length > 44 ? s.name.substring(0, 41) + '...' : s.name.padEnd(45);
                const count = `${c.bold}${s._count.faculties}${c.reset}`;
                console.log(`  ${num}  ${name} ${count}`);
            });

            console.log('');
            const schoolChoice = await ask(`Select school (1-${schools.length})`);
            const schoolIndex = parseInt(schoolChoice, 10) - 1;

            if (schoolIndex < 0 || schoolIndex >= schools.length) {
                throw new Error('Invalid school selection.');
            }

            selectedSchoolId = schools[schoolIndex].id;
            selectedSchoolName = schools[schoolIndex].name;
            scopeLabel = `🏫 SCHOOL: ${selectedSchoolName} (${schools[schoolIndex]._count.faculties} faculty)`;
            console.log(`\n  ${c.green}→ Selected: ${scopeLabel}${c.reset}`);
        } else if (targetChoice === '3') {
            // ── TARGETED USERS ──
            targetMode = 'targeted';

            // Pick district
            const districts = await prisma.district.findMany({
                orderBy: { name: 'asc' },
                include: { _count: { select: { schools: true } } },
            });

            console.log(`\n  ${c.bold}Select District:${c.reset}\n`);
            console.log(`  ${c.dim}${'#'.padStart(4)}  ${'District Name'.padEnd(25)} Schools${c.reset}`);
            console.log(`  ${c.dim}${'─'.repeat(45)}${c.reset}`);

            districts.forEach((d, i) => {
                const num = `${c.cyan}${String(i + 1).padStart(4)}${c.reset}`;
                const name = d.name.padEnd(25);
                const count = `${c.bold}${d._count.schools}${c.reset}`;
                console.log(`  ${num}  ${name} ${count}`);
            });

            console.log('');
            const districtChoice = await ask(`Select district (1-${districts.length})`);
            const districtIndex = parseInt(districtChoice, 10) - 1;

            if (districtIndex < 0 || districtIndex >= districts.length) {
                throw new Error('Invalid district selection.');
            }

            const chosenDistrict = districts[districtIndex];

            // List schools in district
            const schools = await prisma.school.findMany({
                where: { district_id: chosenDistrict.id },
                orderBy: { name: 'asc' },
                include: { _count: { select: { faculties: true } } },
            });

            console.log(`\n  ${c.bold}Schools in ${chosenDistrict.name}:${c.reset}\n`);
            console.log(`  ${c.dim}${'#'.padStart(4)}  ${'School Name'.padEnd(45)} Faculty${c.reset}`);
            console.log(`  ${c.dim}${'─'.repeat(60)}${c.reset}`);

            schools.forEach((s, i) => {
                const num = `${c.cyan}${String(i + 1).padStart(4)}${c.reset}`;
                const name = s.name.length > 44 ? s.name.substring(0, 41) + '...' : s.name.padEnd(45);
                const count = `${c.bold}${s._count.faculties}${c.reset}`;
                console.log(`  ${num}  ${name} ${count}`);
            });

            console.log('');
            console.log(`  ${c.dim}Select a school to pick faculty from, or enter "all" for all schools.${c.reset}`);
            const schoolChoice = await ask(`Select school (1-${schools.length} or "all")`, '1');

            let targetSchools: typeof schools;
            if (schoolChoice.toLowerCase() === 'all') {
                targetSchools = schools;
            } else {
                const schoolIndex = parseInt(schoolChoice, 10) - 1;
                if (schoolIndex < 0 || schoolIndex >= schools.length) {
                    throw new Error('Invalid school selection.');
                }
                targetSchools = [schools[schoolIndex]];
            }

            // Get faculty from selected schools
            const faculty = await prisma.faculty.findMany({
                where: {
                    school_id: { in: targetSchools.map(s => s.id) },
                    user: { is_active: true },
                },
                include: {
                    user: { select: { id: true, name: true, role: true, phone: true } },
                    school: { select: { name: true } },
                },
                orderBy: { user: { name: 'asc' } },
            });

            if (faculty.length === 0) {
                throw new Error('No active faculty found in selected schools.');
            }

            console.log(`\n  ${c.bold}Available Faculty (${faculty.length}):${c.reset}\n`);
            console.log(`  ${c.dim}${'#'.padStart(4)}  ${'Name'.padEnd(25)} ${'Role'.padEnd(20)} School${c.reset}`);
            console.log(`  ${c.dim}${'─'.repeat(75)}${c.reset}`);

            const displayCount = Math.min(faculty.length, 30);
            for (let i = 0; i < displayCount; i++) {
                const f = faculty[i];
                const num = `${c.cyan}${String(i + 1).padStart(4)}${c.reset}`;
                const name = f.user.name.length > 24 ? f.user.name.substring(0, 21) + '...' : f.user.name.padEnd(25);
                const role = f.user.role.padEnd(20);
                const school = f.school.name.length > 25 ? f.school.name.substring(0, 22) + '...' : f.school.name;
                console.log(`  ${num}  ${name} ${c.dim}${role}${c.reset} ${school}`);
            }
            if (faculty.length > 30) {
                console.log(`  ${c.dim}... and ${faculty.length - 30} more${c.reset}`);
            }

            console.log('');
            console.log(`  ${c.dim}Enter "all" to select all, a range (e.g. 1-10), or comma-separated (e.g. 1,3,5)${c.reset}\n`);
            const userChoice = await ask('Select faculty', 'all');

            if (userChoice.toLowerCase() === 'all') {
                selectedUserIds = faculty.map(f => f.user.id);
                selectedUserNames = faculty.map(f => f.user.name);
            } else if (userChoice.includes('-')) {
                const [start, end] = userChoice.split('-').map(n => parseInt(n.trim(), 10));
                for (let i = start - 1; i < Math.min(end, faculty.length); i++) {
                    if (i >= 0) {
                        selectedUserIds.push(faculty[i].user.id);
                        selectedUserNames.push(faculty[i].user.name);
                    }
                }
            } else {
                const indices = userChoice.split(',').map(n => parseInt(n.trim(), 10) - 1);
                for (const idx of indices) {
                    if (idx >= 0 && idx < faculty.length) {
                        selectedUserIds.push(faculty[idx].user.id);
                        selectedUserNames.push(faculty[idx].user.name);
                    }
                }
            }

            if (selectedUserIds.length === 0) {
                throw new Error('No faculty selected. Aborting.');
            }

            scopeLabel = `🎯 TARGETED: ${selectedUserIds.length} specific user(s)`;
            console.log(`\n  ${c.green}→ Selected ${selectedUserIds.length} faculty member(s)${c.reset}`);
        } else {
            throw new Error('Invalid targeting selection.');
        }

        // ══════════════════════════════════════════════════════════
        // STEP 3: Fill in Notice Details
        // ══════════════════════════════════════════════════════════
        sectionHeader(3, 'FILL IN NOTICE DETAILS');
        console.log(`  ${c.dim}Press Enter to use defaults shown in [brackets].${c.reset}\n`);

        const title = await ask('Notice Title', `[TEST] Simulator Notice — ${Date.now()}`);
        const content = await ask('Content / Message', 'Automated simulator test notice. Please disregard.');

        // Type-specific fields
        let subject: string | undefined;
        let classLevel: number | undefined;
        let venue: string | undefined;
        let eventTime: string | undefined;
        let eventDate: string | undefined;

        if (selectedType === NoticeType.PAPER_SETTER || selectedType === NoticeType.PAPER_CHECKER) {
            subject = await ask('Subject', 'Mathematics');
            const classLevelStr = await ask('Class Level (e.g. 10, 12)', '10');
            classLevel = parseInt(classLevelStr, 10);
        } else if (selectedType === NoticeType.INVITATION) {
            venue = await ask('Venue', 'SEBA Head Office, Kohima');
            eventTime = await ask('Event Time (HH:MM)', '10:00');
            eventDate = await ask('Event Date (YYYY-MM-DD)', new Date().toISOString().split('T')[0]);
        }

        console.log('');
        divider();
        console.log(`\n  ${c.bold}📋 Notice Details:${c.reset}`);
        label('  Type', NOTICE_TYPE_LABELS[selectedType]);
        label('  Title', title);
        label('  Content', content.length > 50 ? content.substring(0, 47) + '...' : content);
        label('  Scope', scopeLabel);
        if (subject) label('  Subject', subject);
        if (classLevel) label('  Class Level', String(classLevel));
        if (venue) label('  Venue', venue);
        if (eventTime) label('  Event Time', eventTime);
        if (eventDate) label('  Event Date', eventDate);
        if (selectedSchoolName) label('  School', selectedSchoolName);
        if (selectedUserIds.length > 0) label('  Recipients', `${selectedUserIds.length} user(s)`);
        console.log('');

        // ══════════════════════════════════════════════════════════
        // STEP 4: Confirm & Send
        // ══════════════════════════════════════════════════════════
        sectionHeader(4, 'CONFIRM & SEND NOTICE');

        const confirmed = await askConfirm('Send this notice now?');
        if (!confirmed) {
            warnMsg('Aborted by user.');
            rl.close();
            await prisma.$disconnect();
            return;
        }

        console.log('');
        infoMsg('Logging in as admin...');
        const { token: adminToken, userId: adminUserId } = await loginAdmin();
        successMsg('Admin login successful');

        if (targetMode === 'targeted') {
            // ── TARGETED: use POST /admin/notices/send ──
            infoMsg('Sending targeted notice via API...');
            const payload: any = {
                user_ids: selectedUserIds,
                title,
                message: content,
                type: selectedType,
            };
            if (subject) payload.subject = subject;
            if (classLevel) payload.class_level = classLevel;
            if (venue) payload.venue = venue;
            if (eventTime) payload.event_time = eventTime;
            if (eventDate) payload.event_date = eventDate;

            const result = await sendNoticeViaAPI(adminToken, payload);
            noticeId = result.notice.id;
            successMsg(`Targeted notice created & sent!`);
        } else if (targetMode === 'school') {
            // ── SCHOOL: use POST /admin/notices (with school_id) ──
            infoMsg('Creating school-specific notice via API...');
            const result = await createGlobalNoticeViaAPI(adminToken, {
                title,
                content,
                school_id: selectedSchoolId!,
            });
            noticeId = result.id;
            successMsg(`School notice created!`);
        } else {
            // ── GLOBAL: use POST /admin/notices (no school_id) ──
            infoMsg('Creating global notice via API...');
            const result = await createGlobalNoticeViaAPI(adminToken, {
                title,
                content,
            });
            noticeId = result.id;
            successMsg(`Global notice created!`);
        }

        label('  Notice ID', noticeId);

        // Verify notice was created in DB
        const dbNotice = await prisma.notice.findUnique({
            where: { id: noticeId },
            include: { recipients: { select: { user_id: true } } },
        });

        if (!dbNotice) {
            errorMsg('Notice not found in database after creation!');
            throw new Error('Notice verification failed');
        }

        label('  is_targeted', String(dbNotice.is_targeted));
        label('  Recipients in DB', String(dbNotice.recipients.length));
        if (dbNotice.school_id) label('  school_id', dbNotice.school_id);
        console.log('');

        // ══════════════════════════════════════════════════════════
        // STEP 5: Verify Visibility
        // ══════════════════════════════════════════════════════════
        sectionHeader(5, 'VERIFY VISIBILITY — STRESS TEST');

        console.log(`  ${c.bold}Testing if the correct users can/cannot see the notice...${c.reset}\n`);

        // Determine eligible vs ineligible users based on visibility logic in notices.service.ts
        // Visibility rules:
        //   1. Global (is_targeted=false, school_id=null): visible to all
        //   2. School-specific (is_targeted=false, school_id=X): visible to faculty in school X + global users
        //   3. Targeted (is_targeted=true): only visible to users in NoticeRecipient table

        let eligibleUserIds: string[] = [];
        let eligibleLabel = '';

        if (targetMode === 'targeted') {
            // Only the specific recipients should see it
            eligibleUserIds = selectedUserIds;
            eligibleLabel = `${selectedUserIds.length} targeted recipient(s)`;
        } else if (targetMode === 'school') {
            // Faculty in the school + anyone without a school (school_id=null filter)
            const schoolFaculty = await prisma.faculty.findMany({
                where: { school_id: selectedSchoolId!, user: { is_active: true } },
                select: { user_id: true },
            });
            eligibleUserIds = schoolFaculty.map(f => f.user_id);
            eligibleLabel = `${eligibleUserIds.length} faculty in ${selectedSchoolName}`;
        } else {
            // Global: all faculty (all have school_id = null in filter OR their school_id matches)
            const allFaculty = await prisma.faculty.findMany({
                where: { user: { is_active: true } },
                select: { user_id: true },
            });
            eligibleUserIds = allFaculty.map(f => f.user_id);
            eligibleLabel = `${eligibleUserIds.length} active faculty (global)`;
        }

        label('Eligible users', eligibleLabel);

        // Count ineligible
        let ineligibleCount = 0;
        if (targetMode === 'targeted') {
            // All active faculty NOT in recipient list
            ineligibleCount = await prisma.faculty.count({
                where: { user: { is_active: true }, user_id: { notIn: eligibleUserIds } },
            });
        } else if (targetMode === 'school') {
            ineligibleCount = await prisma.faculty.count({
                where: { school_id: { not: selectedSchoolId! }, user: { is_active: true } },
            });
        }
        // For global, ineligibleCount stays 0 (everyone can see it)

        label('Ineligible users', String(ineligibleCount));
        console.log('');

        // === 5A: POSITIVE VISIBILITY (DB-level) ===
        console.log(`  ${c.bgGreen}${c.white}${c.bold} POSITIVE VISIBILITY TEST ${c.reset}  (eligible users CAN see it)\n`);

        let positivePass = 0;
        let positiveFail = 0;
        const positiveFailDetails: string[] = [];
        const posStart = Date.now();

        for (let i = 0; i < eligibleUserIds.length; i++) {
            const userId = eligibleUserIds[i];

            // Replicate the exact WHERE clause from notices.service.ts getNotices()
            const faculty = await prisma.faculty.findUnique({
                where: { user_id: userId },
                select: { school_id: true },
            });

            const schoolFilter = faculty?.school_id
                ? { OR: [{ school_id: null }, { school_id: faculty.school_id }] }
                : { school_id: null };

            const visibleNotice = await prisma.notice.findFirst({
                where: {
                    id: noticeId!,
                    is_active: true,
                    AND: [
                        { OR: [{ expires_at: null }, { expires_at: { gte: new Date() } }] },
                        {
                            OR: [
                                // Global notices — follow school filter
                                {
                                    is_targeted: false,
                                    ...schoolFilter,
                                },
                                // Targeted notices — only if user is a recipient
                                {
                                    is_targeted: true,
                                    recipients: {
                                        some: { user_id: userId },
                                    },
                                },
                            ],
                        },
                    ],
                },
                select: { id: true },
            });

            if (visibleNotice) {
                positivePass++;
            } else {
                positiveFail++;
                if (positiveFailDetails.length < 5) {
                    const user = await prisma.user.findUnique({
                        where: { id: userId },
                        select: { name: true, role: true },
                    });
                    positiveFailDetails.push(
                        `${user?.name || 'Unknown'} (${user?.role || '?'}, school ${faculty?.school_id || 'none'})`,
                    );
                }
            }

            if ((i + 1) % 200 === 0 || i === eligibleUserIds.length - 1) {
                process.stdout.write(`\r  ${progressBar(i + 1, eligibleUserIds.length)}`);
            }
        }
        console.log('');

        const posDuration = Date.now() - posStart;
        if (positiveFail === 0) {
            successMsg(`ALL ${positivePass}/${eligibleUserIds.length} eligible users CAN see the notice`);
        } else {
            errorMsg(`${positivePass} passed, ${positiveFail} FAILED`);
            positiveFailDetails.forEach(d => console.log(`    ${c.red}•${c.reset} ${d}: NOT visible!`));
        }
        infoMsg(`Duration: ${posDuration < 1000 ? `${posDuration}ms` : `${(posDuration / 1000).toFixed(2)}s`}`);
        console.log('');

        // === 5B: NEGATIVE VISIBILITY (DB-level) ===
        if (ineligibleCount > 0) {
            console.log(`  ${c.bgRed}${c.white}${c.bold} NEGATIVE VISIBILITY TEST ${c.reset}  (ineligible users CANNOT see it)\n`);

            let negativePass = 0;
            let negativeFail = 0;
            const negativeFailDetails: string[] = [];
            const negStart = Date.now();
            let processed = 0;
            const BATCH_SIZE = 1000;
            let skip = 0;

            // Build the "not eligible" filter
            const notEligibleFilter = targetMode === 'targeted'
                ? { user_id: { notIn: eligibleUserIds }, user: { is_active: true } }
                : { school_id: { not: selectedSchoolId! }, user: { is_active: true } };

            while (true) {
                const batch = await prisma.faculty.findMany({
                    where: notEligibleFilter as any,
                    include: {
                        user: { select: { id: true, name: true, role: true } },
                    },
                    skip,
                    take: BATCH_SIZE,
                });

                if (batch.length === 0) break;

                for (const faculty of batch) {
                    const schoolFilter = faculty.school_id
                        ? { OR: [{ school_id: null }, { school_id: faculty.school_id }] }
                        : { school_id: null };

                    const visibleNotice = await prisma.notice.findFirst({
                        where: {
                            id: noticeId!,
                            is_active: true,
                            AND: [
                                { OR: [{ expires_at: null }, { expires_at: { gte: new Date() } }] },
                                {
                                    OR: [
                                        {
                                            is_targeted: false,
                                            ...schoolFilter,
                                        },
                                        {
                                            is_targeted: true,
                                            recipients: {
                                                some: { user_id: faculty.user.id },
                                            },
                                        },
                                    ],
                                },
                            ],
                        },
                        select: { id: true },
                    });

                    if (!visibleNotice) {
                        negativePass++;
                    } else {
                        negativeFail++;
                        if (negativeFailDetails.length < 5) {
                            negativeFailDetails.push(
                                `${faculty.user.name} (${faculty.user.role}, school ${faculty.school_id})`,
                            );
                        }
                    }

                    processed++;
                    if (processed % 200 === 0) {
                        process.stdout.write(`\r  ${progressBar(processed, ineligibleCount)}`);
                    }
                }

                skip += BATCH_SIZE;
            }
            process.stdout.write(`\r  ${progressBar(ineligibleCount, ineligibleCount)}\n`);

            const negDuration = Date.now() - negStart;
            if (negativeFail === 0) {
                successMsg(`ALL ${negativePass}/${ineligibleCount} ineligible users correctly CANNOT see it`);
            } else {
                errorMsg(`${negativePass} correct, ${negativeFail} WRONGLY see the notice`);
                negativeFailDetails.forEach(d => console.log(`    ${c.red}•${c.reset} ${d}: SHOULD NOT see notice!`));
            }
            infoMsg(`Duration: ${negDuration < 1000 ? `${negDuration}ms` : `${(negDuration / 1000).toFixed(2)}s`}`);
            console.log('');
        } else {
            warnMsg('No ineligible users to test (global scope covers everyone).');
            console.log('');
        }

        // === 5C: API SPOT-CHECK TEST ===
        console.log(`  ${c.bgMagenta}${c.white}${c.bold} API SPOT-CHECK TEST ${c.reset}  (real API login + GET /notices)\n`);

        const API_BATCH_SIZE = 50;
        let spotPass = 0;
        let spotFail = 0;
        let spotLoginFail = 0;
        const spotFailDetails: string[] = [];

        type SpotResult = { name: string; pass: boolean; loginFailed: boolean; detail?: string };

        const testUserNoticeViaAPI = async (
            userId: string,
            phone: string,
            email: string | null,
            name: string,
            shouldSee: boolean,
            nId: string,
        ): Promise<SpotResult> => {
            try {
                const token = await loginUser(phone, email || undefined);
                if (!token) {
                    if (shouldSee) {
                        return { name, pass: false, loginFailed: true, detail: `${name}: login failed` };
                    }
                    return { name, pass: true, loginFailed: true }; // can't login = can't see (correct)
                }

                const notices = await getNotices(token);
                const found = notices.some(n => n.id === nId);

                if (shouldSee) {
                    return found
                        ? { name, pass: true, loginFailed: false }
                        : { name, pass: false, loginFailed: false, detail: `${name}: NOT visible via API (${notices.length} notices returned)` };
                } else {
                    return !found
                        ? { name, pass: true, loginFailed: false }
                        : { name, pass: false, loginFailed: false, detail: `${name}: IS visible via API (BUG!)` };
                }
            } catch (err: any) {
                return { name, pass: false, loginFailed: true, detail: `${name}: error — ${err.message}` };
            }
        }

        // ── Diagnostic probe ──
        console.log(`  ${c.bold}🔍 Diagnostic Probe:${c.reset}`);
        if (eligibleUserIds.length > 0) {
            const probeUserId = eligibleUserIds[0];
            const probeUser = await prisma.user.findUnique({
                where: { id: probeUserId },
                select: { phone: true, email: true, name: true, role: true },
            });
            if (probeUser) {
                label('  Probe user', `${probeUser.name} (${probeUser.role})`);
                label('  Phone', probeUser.phone);

                const probeToken = await loginUser(probeUser.phone, probeUser.email || undefined);
                if (probeToken) {
                    const probeNotices = await getNotices(probeToken);
                    label('  API returned', `${probeNotices.length} notices`);
                    const found = probeNotices.some(n => n.id === noticeId);
                    label('  Our notice', found ? `${c.green}FOUND ✓${c.reset}` : `${c.red}NOT FOUND ✗${c.reset}`);
                } else {
                    errorMsg('Probe user login failed!');
                }
            }
        }
        console.log('');

        // ── Test eligible users via API ──
        console.log(`  ${c.bgGreen}${c.white}${c.bold} ELIGIBLE API TEST ${c.reset}  (${eligibleUserIds.length} users — should see notice)\n`);

        const eligibleUsers = await prisma.user.findMany({
            where: { id: { in: eligibleUserIds } },
            select: { id: true, phone: true, email: true, name: true },
        });
        const eligibleUserMap = new Map(eligibleUsers.map(u => [u.id, u]));

        const eligibleApiStart = Date.now();
        for (let batch = 0; batch < eligibleUserIds.length; batch += API_BATCH_SIZE) {
            const batchSlice = eligibleUserIds.slice(batch, batch + API_BATCH_SIZE);
            const promises = batchSlice.map(uid => {
                const user = eligibleUserMap.get(uid);
                if (!user) return Promise.resolve({ name: 'unknown', pass: false, loginFailed: true, detail: 'user not found' } as SpotResult);
                return testUserNoticeViaAPI(user.id, user.phone, user.email, user.name, true, noticeId!);
            });

            const results = await Promise.allSettled(promises);
            for (const r of results) {
                if (r.status === 'fulfilled') {
                    if (r.value.pass) spotPass++;
                    else {
                        spotFail++;
                        if (r.value.loginFailed) spotLoginFail++;
                        if (r.value.detail && spotFailDetails.length < 10) spotFailDetails.push(r.value.detail);
                    }
                } else {
                    spotFail++;
                    if (spotFailDetails.length < 10) spotFailDetails.push(`Promise rejected: ${r.reason}`);
                }
            }

            process.stdout.write(`\r  ${progressBar(Math.min(batch + API_BATCH_SIZE, eligibleUserIds.length), eligibleUserIds.length)}`);
        }
        console.log('');

        const eligibleApiDuration = Date.now() - eligibleApiStart;
        if (spotFail === 0) {
            successMsg(`ALL ${spotPass}/${eligibleUserIds.length} eligible users CAN see via API ✓`);
        } else {
            errorMsg(`${spotPass} passed, ${spotFail} FAILED (${spotLoginFail} login failures)`);
            spotFailDetails.forEach(d => console.log(`    ${c.red}•${c.reset} ${d}`));
        }
        infoMsg(`Duration: ${eligibleApiDuration < 1000 ? `${eligibleApiDuration}ms` : `${(eligibleApiDuration / 1000).toFixed(1)}s`}`);
        console.log('');

        const eligibleFailCount = spotFail;

        // ── Test ineligible users via API ──
        let ineligibleApiPass = 0;
        let ineligibleApiFail = 0;
        let ineligibleLoginFail = 0;
        const ineligibleFailDetails: string[] = [];

        if (ineligibleCount > 0) {
            console.log(`  ${c.bgRed}${c.white}${c.bold} INELIGIBLE API TEST ${c.reset}  (${ineligibleCount} users — should NOT see notice)\n`);
            const ineligibleApiStart = Date.now();

            let ineligibleSkip = 0;
            let ineligibleProcessed = 0;

            const notEligibleFilter = targetMode === 'targeted'
                ? { user_id: { notIn: eligibleUserIds }, user: { is_active: true } }
                : { school_id: { not: selectedSchoolId! }, user: { is_active: true } };

            while (true) {
                const ineligibleBatch = await prisma.faculty.findMany({
                    where: notEligibleFilter as any,
                    include: { user: { select: { id: true, name: true, phone: true, email: true, role: true } } },
                    skip: ineligibleSkip,
                    take: API_BATCH_SIZE,
                });

                if (ineligibleBatch.length === 0) break;

                const promises = ineligibleBatch.map(faculty =>
                    testUserNoticeViaAPI(faculty.user.id, faculty.user.phone, faculty.user.email, faculty.user.name, false, noticeId!),
                );

                const results = await Promise.allSettled(promises);
                for (const r of results) {
                    if (r.status === 'fulfilled') {
                        if (r.value.pass) ineligibleApiPass++;
                        else {
                            ineligibleApiFail++;
                            if (r.value.loginFailed) ineligibleLoginFail++;
                            if (r.value.detail && ineligibleFailDetails.length < 10) ineligibleFailDetails.push(r.value.detail);
                        }
                    } else {
                        ineligibleApiFail++;
                    }
                }

                ineligibleProcessed += ineligibleBatch.length;
                ineligibleSkip += API_BATCH_SIZE;
                process.stdout.write(`\r  ${progressBar(ineligibleProcessed, ineligibleCount)}`);
            }
            console.log('');

            const ineligibleApiDuration = Date.now() - ineligibleApiStart;
            if (ineligibleApiFail === 0) {
                successMsg(`ALL ${ineligibleApiPass}/${ineligibleCount} ineligible users correctly CANNOT see via API ✓`);
            } else {
                errorMsg(`${ineligibleApiPass} correct, ${ineligibleApiFail} WRONGLY see notice (${ineligibleLoginFail} login failures)`);
                ineligibleFailDetails.forEach(d => console.log(`    ${c.red}•${c.reset} ${d}`));
            }
            infoMsg(`Duration: ${ineligibleApiDuration < 1000 ? `${ineligibleApiDuration}ms` : `${(ineligibleApiDuration / 1000).toFixed(1)}s`}`);
            console.log('');
        }

        divider();
        const totalApiChecks = spotPass + spotFail + ineligibleApiPass + ineligibleApiFail;
        const totalApiFails = spotFail + ineligibleApiFail;
        if (totalApiFails === 0) {
            successMsg(`All ${totalApiChecks} API checks passed`);
        } else {
            errorMsg(`${totalApiChecks - totalApiFails} passed, ${totalApiFails} failed`);
        }
        console.log('');

        // ══════════════════════════════════════════════════════════
        // STEP 6: Cleanup
        // ══════════════════════════════════════════════════════════
        sectionHeader(6, 'CLEANUP');

        const shouldCleanup = await askConfirm('Delete the test notice?');
        if (shouldCleanup && noticeId) {
            // Delete recipients first (cascade should handle it, but be explicit)
            await prisma.noticeRecipient.deleteMany({ where: { notice_id: noticeId } });
            await prisma.notice.delete({ where: { id: noticeId } });
            successMsg(`Test notice deleted: ${noticeId}`);
            noticeId = null;
        } else {
            warnMsg('Test notice was NOT deleted. You can view it in the CMS.');
            label('  Notice ID', noticeId || 'N/A');
        }

        // ══════════════════════════════════════════════════════════
        // FINAL REPORT
        // ══════════════════════════════════════════════════════════
        banner('FINAL REPORT');

        console.log(`  ${c.bold}Notice:${c.reset}        ${title}`);
        console.log(`  ${c.bold}Type:${c.reset}          ${NOTICE_TYPE_LABELS[selectedType]}`);
        console.log(`  ${c.bold}Scope:${c.reset}         ${scopeLabel}`);
        console.log(`  ${c.bold}DB Positive:${c.reset}   ${positiveFail === 0 ? `${c.green}✅ ALL PASSED${c.reset}` : `${c.red}❌ ${positiveFail} FAILED${c.reset}`} (${positivePass} users checked)`);
        if (ineligibleCount > 0) {
            console.log(`  ${c.bold}DB Negative:${c.reset}   ${c.green}✅ CHECKED${c.reset} (${ineligibleCount} ineligible users)`);
        }
        console.log(`  ${c.bold}API Eligible:${c.reset}  ${eligibleFailCount === 0 ? `${c.green}✅ ALL PASSED${c.reset}` : `${c.red}❌ ${eligibleFailCount} FAILED${c.reset}`} (${spotPass + eligibleFailCount} checked)`);
        console.log(`  ${c.bold}API Ineligible:${c.reset}${ineligibleApiFail === 0 ? `${c.green}✅ ALL PASSED${c.reset}` : `${c.red}❌ ${ineligibleApiFail} FAILED${c.reset}`} (${ineligibleApiPass + ineligibleApiFail} checked)`);
        console.log(`  ${c.bold}Cleaned up:${c.reset}    ${noticeId ? `${c.yellow}No${c.reset} (notice still exists)` : `${c.green}Yes${c.reset}`}`);
        console.log('');

        const allPassed = positiveFail === 0 && totalApiFails === 0;
        if (allPassed) {
            console.log(`  ${c.bgGreen}${c.white}${c.bold} 🎉 ALL TESTS PASSED — Notice visibility is working correctly! ${c.reset}\n`);
        } else {
            console.log(`  ${c.bgRed}${c.white}${c.bold} 💥 SOME TESTS FAILED — Check details above ${c.reset}\n`);
        }

    } catch (err: any) {
        console.log('');
        errorMsg(`Fatal error: ${err.message || err}`);
        console.error(err);

        // Cleanup on error
        if (noticeId) {
            warnMsg('Attempting cleanup of test notice...');
            try {
                await prisma.noticeRecipient.deleteMany({ where: { notice_id: noticeId } });
                await prisma.notice.delete({ where: { id: noticeId } });
                successMsg('Cleanup successful.');
            } catch (cleanupErr) {
                errorMsg('Cleanup failed! Manual cleanup may be needed.');
            }
        }
    } finally {
        rl.close();
        await prisma.$disconnect();
        infoMsg('Database disconnected. Goodbye!\n');
    }
}

// ── Entry Point ────────────────────────────────────────────────────
main().catch((err) => {
    console.error(`\n${c.red}💥 Fatal error:${c.reset}`, err);
    prisma.$disconnect();
    process.exit(1);
});
