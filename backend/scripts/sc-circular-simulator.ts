/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║   SUBJECT COORDINATOR CIRCULAR — INTERACTIVE TERMINAL SIMULATOR    ║
 * ╠══════════════════════════════════════════════════════════════════════╣
 * ║                                                                    ║
 * ║  Simulates a SUBJECT COORDINATOR sending a circular and verifies:  ║
 * ║                                                                    ║
 * ║    ✅ Teachers of the SAME subject CAN see it                      ║
 * ║    ❌ Teachers of OTHER subjects CANNOT see it                     ║
 * ║    ❌ Headmasters CANNOT see it                                    ║
 * ║    ❌ Faculty from OTHER schools CANNOT see it (DB + API)          ║
 * ║                                                                    ║
 * ║  Steps:                                                            ║
 * ║    1. Login as Subject Coordinator                                 ║
 * ║    2. Select district → select schools                             ║
 * ║    3. Create circular via API (auto-sets target_subject)           ║
 * ║    4. Verify subject-based visibility (DB + API)                   ║
 * ║    5. Cleanup                                                      ║
 * ║                                                                    ║
 * ║  Usage:                                                            ║
 * ║    npx ts-node scripts/sc-circular-simulator.ts                    ║
 * ║                                                                    ║
 * ║  Prerequisites:                                                    ║
 * ║    - Backend running on localhost:3001                              ║
 * ║    - Database seeded with `npx prisma db seed`                     ║
 * ║                                                                    ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

import { PrismaClient } from '@prisma/client';
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
    console.log(`\n${c.bgMagenta}${c.white}${c.bold} ${'═'.repeat(width)} ${c.reset}`);
    console.log(`${c.bgMagenta}${c.white}${c.bold} ║${' '.repeat(pad)}${text}${' '.repeat(padR)}║ ${c.reset}`);
    console.log(`${c.bgMagenta}${c.white}${c.bold} ${'═'.repeat(width)} ${c.reset}\n`);
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

interface CircularsResponse {
    data: Array<{ id: string; title: string; circular_no: string; target_subject?: string }>;
    total: number;
    hasMore: boolean;
}

async function loginCmsUser(email: string): Promise<{ token: string; user: LoginResponse['user'] }> {
    const res = await fetch(`${API_URL}/auth/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email,
            password: PASSWORD,
            phone: '9896008137', // Not validated for CMS login
            device_id: 'sc-simulator-device',
        }),
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`CMS login failed (${res.status}): ${text}`);
    }

    const data = (await res.json()) as LoginResponse;
    return { token: data.access_token, user: data.user };
}

async function loginMobileUser(phone: string, email?: string | null): Promise<string | null> {
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

async function getCirculars(token: string, limit = 200): Promise<CircularsResponse> {
    const res = await fetch(`${API_URL}/circulars?limit=${limit}&offset=0`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`GET /circulars failed: ${res.status}`);
    return (await res.json()) as CircularsResponse;
}

async function createCircularViaAPI(
    token: string,
    title: string,
    description: string,
    issuedBy: string,
    issuedDate: string,
    districtId: string | null,
    schoolIds: string[],
): Promise<{ id: string; circular_no: string; target_subject?: string }> {
    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('issued_by', issuedBy);
    formData.append('issued_date', issuedDate);
    if (districtId) formData.append('district_id', districtId);
    for (const sid of schoolIds) {
        formData.append('school_ids[]', sid);
    }

    const res = await fetch(`${API_URL}/circulars`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Create circular failed (${res.status}): ${text}`);
    }

    return (await res.json()) as { id: string; circular_no: string; target_subject?: string };
}

// ══════════════════════════════════════════════════════════════════
//  MAIN INTERACTIVE FLOW
// ══════════════════════════════════════════════════════════════════

async function main() {
    let circularId: string | null = null;

    try {
        banner('SUBJECT COORDINATOR CIRCULAR — SIMULATOR');

        label('Time', new Date().toLocaleString());
        label('API', API_URL);
        console.log('');

        // ══════════════════════════════════════════════════════════
        // STEP 0: Find Subject Coordinator(s)
        // ══════════════════════════════════════════════════════════
        infoMsg('Finding Subject Coordinators in the database...\n');

        const coordinators = await prisma.user.findMany({
            where: { role: 'SUBJECT_COORDINATOR', is_active: true },
            select: {
                id: true, name: true, email: true, phone: true,
                coordinator_subject: true, coordinator_class_group: true,
            },
        });

        if (coordinators.length === 0) {
            throw new Error('No Subject Coordinators found in the database! Run `npx prisma db seed` first.');
        }

        console.log(`  ${c.bold}Available Subject Coordinators:${c.reset}\n`);
        console.log(`  ${c.dim}${'#'.padStart(4)}  ${'Name'.padEnd(25)} ${'Subject'.padEnd(20)} Class Group${c.reset}`);
        console.log(`  ${c.dim}${'─'.repeat(65)}${c.reset}`);

        coordinators.forEach((sc, i) => {
            const num = `${c.cyan}${String(i + 1).padStart(4)}${c.reset}`;
            console.log(`  ${num}  ${sc.name.padEnd(25)} ${(sc.coordinator_subject || 'N/A').padEnd(20)} ${sc.coordinator_class_group || 'N/A'}`);
        });

        console.log('');
        let selectedSC = coordinators[0];
        if (coordinators.length > 1) {
            const scChoice = await ask(`Select coordinator (1-${coordinators.length})`, '1');
            selectedSC = coordinators[parseInt(scChoice, 10) - 1] || coordinators[0];
        }

        const scSubject = selectedSC.coordinator_subject;
        if (!scSubject) {
            throw new Error(`Coordinator ${selectedSC.name} has no coordinator_subject set!`);
        }

        console.log(`\n  ${c.green}→ Using: ${c.bold}${selectedSC.name}${c.reset}${c.green} — Subject: ${c.bold}${scSubject}${c.reset}${c.green}, Class Group: ${c.bold}${selectedSC.coordinator_class_group || 'N/A'}${c.reset}`);

        // Data discovery
        const [totalDistricts, totalSchools, totalFaculty] = await Promise.all([
            prisma.district.count(),
            prisma.school.count(),
            prisma.faculty.count(),
        ]);

        console.log('');
        label('Districts', String(totalDistricts));
        label('Schools', String(totalSchools));
        label('Faculty', String(totalFaculty));
        divider();

        // ══════════════════════════════════════════════════════════
        // STEP 1: Create Circular Details
        // ══════════════════════════════════════════════════════════
        sectionHeader(1, 'CREATE CIRCULAR — Fill in Details');
        console.log(`  ${c.dim}Subject auto-filled from coordinator profile: ${c.bold}${scSubject}${c.reset}`);
        console.log(`  ${c.dim}Press Enter to use defaults shown in [brackets].${c.reset}\n`);

        const title = await ask('Circular Title', `[TEST-SC] ${scSubject} Circular — ${Date.now()}`);
        const description = await ask('Description', `Subject Coordinator test circular for ${scSubject} teachers`);
        const issuedBy = await ask('Issued By', selectedSC.name);
        const issuedDate = await ask('Issued Date (YYYY-MM-DD)', new Date().toISOString().split('T')[0]);

        console.log('');
        divider();
        console.log(`\n  ${c.bold}📋 Circular Details:${c.reset}`);
        label('  Title', title);
        label('  Description', description);
        label('  Issued By', issuedBy);
        label('  Issued Date', issuedDate);
        label('  Target Subject', `${c.magenta}${scSubject}${c.reset} ${c.dim}(auto-set)${c.reset}`);
        console.log('');

        // ══════════════════════════════════════════════════════════
        // STEP 2: Select District
        // ══════════════════════════════════════════════════════════
        sectionHeader(2, 'SELECT DISTRICT');

        const districts = await prisma.district.findMany({
            orderBy: { name: 'asc' },
            include: { _count: { select: { schools: true } } },
        });

        console.log(`  ${c.bold}Available Districts:${c.reset}\n`);
        console.log(`  ${c.dim}${'#'.padStart(4)}  ${'District Name'.padEnd(25)} Schools${c.reset}`);
        console.log(`  ${c.dim}${'─'.repeat(45)}${c.reset}`);

        districts.forEach((d, i) => {
            const num = `${c.cyan}${String(i + 1).padStart(4)}${c.reset}`;
            console.log(`  ${num}  ${d.name.padEnd(25)} ${c.bold}${d._count.schools}${c.reset}`);
        });

        console.log('');
        const districtChoice = await ask(`Select district (1-${districts.length})`);
        const districtIndex = parseInt(districtChoice, 10) - 1;

        if (districtIndex < 0 || districtIndex >= districts.length) {
            throw new Error('Invalid district selection.');
        }

        const chosenDistrict = districts[districtIndex];
        const selectedDistrictId = chosenDistrict.id;
        console.log(`\n  ${c.green}→ Selected: ${c.bold}${chosenDistrict.name}${c.reset}${c.green} (${chosenDistrict._count.schools} schools)${c.reset}`);

        // ══════════════════════════════════════════════════════════
        // STEP 3: Select Schools
        // ══════════════════════════════════════════════════════════
        sectionHeader(3, 'SELECT SCHOOLS');

        const schools = await prisma.school.findMany({
            where: { district_id: chosenDistrict.id },
            orderBy: { name: 'asc' },
            include: { _count: { select: { faculties: true } } },
        });

        console.log(`  ${c.bold}Send to which schools in ${chosenDistrict.name}?${c.reset}\n`);
        console.log(`  ${c.cyan}[1]${c.reset}  ⭐ ${c.bold}All Schools${c.reset}  — Send to all ${schools.length} schools`);
        console.log(`  ${c.cyan}[2]${c.reset}  🏫 ${c.bold}Select Specific Schools${c.reset}\n`);

        const schoolScopeChoice = await ask('Select (1/2)', '2');

        let selectedSchoolIds: string[] = [];
        let selectedSchoolNames: string[] = [];
        let scopeLabel = '';

        if (schoolScopeChoice === '1') {
            selectedSchoolIds = schools.map(s => s.id);
            selectedSchoolNames = schools.map(s => s.name);
            scopeLabel = `All ${schools.length} schools in ${chosenDistrict.name}`;
        } else {
            console.log(`\n  ${c.bold}Schools in ${chosenDistrict.name}:${c.reset}\n`);
            console.log(`  ${c.dim}${'#'.padStart(4)}  ${'School Name'.padEnd(45)} Faculty${c.reset}`);
            console.log(`  ${c.dim}${'─'.repeat(60)}${c.reset}`);

            schools.forEach((s, i) => {
                const num = `${c.cyan}${String(i + 1).padStart(4)}${c.reset}`;
                const name = s.name.length > 44 ? s.name.substring(0, 41) + '...' : s.name.padEnd(45);
                console.log(`  ${num}  ${name} ${c.bold}${s._count.faculties}${c.reset}`);
            });

            console.log('');
            console.log(`  ${c.dim}Enter school numbers: comma-separated (1,3,5) or range (1-10)${c.reset}\n`);
            const schoolChoice = await ask('Select schools');

            if (schoolChoice.includes('-')) {
                const [start, end] = schoolChoice.split('-').map(n => parseInt(n.trim(), 10));
                for (let i = start - 1; i < Math.min(end, schools.length); i++) {
                    if (i >= 0) {
                        selectedSchoolIds.push(schools[i].id);
                        selectedSchoolNames.push(schools[i].name);
                    }
                }
            } else {
                const indices = schoolChoice.split(',').map(n => parseInt(n.trim(), 10) - 1);
                for (const idx of indices) {
                    if (idx >= 0 && idx < schools.length) {
                        selectedSchoolIds.push(schools[idx].id);
                        selectedSchoolNames.push(schools[idx].name);
                    }
                }
            }

            if (selectedSchoolIds.length === 0) throw new Error('No schools selected.');
            scopeLabel = `${selectedSchoolIds.length} specific schools in ${chosenDistrict.name}`;
        }

        // Show summary with subject-specific faculty counts
        const targetTeachers = await prisma.faculty.count({
            where: {
                school_id: { in: selectedSchoolIds },
                user: { role: 'TEACHER', is_active: true },
                teaching_assignments: { some: { subject: scSubject } },
            },
        });

        const otherTeachers = await prisma.faculty.count({
            where: {
                school_id: { in: selectedSchoolIds },
                user: { role: 'TEACHER', is_active: true },
                teaching_assignments: { none: { subject: scSubject } },
            },
        });

        const headmasters = await prisma.faculty.count({
            where: {
                school_id: { in: selectedSchoolIds },
                user: { role: 'HEADMASTER', is_active: true },
            },
        });

        console.log('');
        divider();
        console.log(`\n  ${c.bold}📊 Targeted Population:${c.reset}\n`);
        label(`  ✅ ${scSubject} Teachers`, `${targetTeachers} (SHOULD see circular)`);
        label(`  ❌ Other Teachers`, `${otherTeachers} (should NOT see)`);
        label(`  ❌ Headmasters`, `${headmasters} (should NOT see)`);
        console.log('');

        // ══════════════════════════════════════════════════════════
        // STEP 4: Confirm & Send
        // ══════════════════════════════════════════════════════════
        sectionHeader(4, 'CONFIRM & SEND CIRCULAR');

        console.log(`  ${c.bold}📋 Circular Summary:${c.reset}\n`);
        label('  Title', title);
        label('  Issued By', issuedBy);
        label('  Subject', `${c.magenta}${scSubject}${c.reset}`);
        label('  Scope', scopeLabel);
        label('  Schools', `${selectedSchoolIds.length} selected`);
        console.log('');

        const confirmed = await askConfirm('Send this circular now?');
        if (!confirmed) {
            warnMsg('Aborted by user.');
            rl.close();
            await prisma.$disconnect();
            return;
        }

        console.log('');
        infoMsg(`Logging in as ${selectedSC.name} (${selectedSC.email})...`);
        const { token: scToken } = await loginCmsUser(selectedSC.email!);
        successMsg('Subject Coordinator login successful');

        infoMsg('Creating circular via API...');
        const created = await createCircularViaAPI(
            scToken,
            title,
            description,
            issuedBy,
            issuedDate,
            selectedDistrictId,
            selectedSchoolIds,
        );
        circularId = created.id;
        successMsg(`Circular created: ${c.bold}${created.circular_no}${c.reset}`);
        label('  Circular ID', circularId);

        // Verify target_subject was set
        const dbCircular = await prisma.circular.findUnique({
            where: { id: circularId },
            select: { target_subject: true } as any,
        }) as any;
        if (dbCircular?.target_subject === scSubject) {
            successMsg(`target_subject correctly set to: ${c.bold}${scSubject}${c.reset}`);
        } else {
            errorMsg(`target_subject is "${dbCircular?.target_subject}" — expected "${scSubject}"!`);
        }

        // ══════════════════════════════════════════════════════════
        // STEP 5: Verify Subject-Based Visibility
        // ══════════════════════════════════════════════════════════
        sectionHeader(5, 'VERIFY SUBJECT-BASED VISIBILITY');

        // === 5A: DB-level — POSITIVE (same-subject teachers in selected schools) ===
        console.log(`  ${c.bgGreen}${c.white}${c.bold} POSITIVE — ${scSubject} Teachers ${c.reset}  (should see circular)\n`);

        const eligibleFaculty = await prisma.faculty.findMany({
            where: {
                school_id: { in: selectedSchoolIds },
                user: { role: 'TEACHER', is_active: true },
                teaching_assignments: { some: { subject: scSubject } },
            },
            include: {
                user: { select: { id: true, name: true, phone: true, email: true, role: true, is_active: true } },
                school: { select: { district_id: true } },
                teaching_assignments: { select: { subject: true } },
            },
        });

        let posPass = 0, posFail = 0;
        const posFailDetails: string[] = [];

        for (let i = 0; i < eligibleFaculty.length; i++) {
            const f = eligibleFaculty[i];
            const subjects = f.teaching_assignments.map(ta => ta.subject);

            // DB visibility check: matches school + subject
            const visible = await prisma.circular.findFirst({
                where: {
                    id: circularId!,
                    is_active: true,
                    OR: [
                        { school_id: f.school_id },
                        { targetedSchools: { some: { school_id: f.school_id } } },
                    ],
                    AND: [
                        { OR: [{ target_subject: null }, { target_subject: { in: subjects } }] },
                    ],
                } as any,
                select: { id: true },
            });

            if (visible) posPass++;
            else {
                posFail++;
                if (posFailDetails.length < 5) posFailDetails.push(`${f.user.name} — teaches ${subjects.join(', ')}`);
            }

            if ((i + 1) % 100 === 0 || i === eligibleFaculty.length - 1)
                process.stdout.write(`\r  ${progressBar(i + 1, eligibleFaculty.length)}`);
        }
        console.log('');

        if (posFail === 0) successMsg(`ALL ${posPass}/${eligibleFaculty.length} ${scSubject} teachers CAN see the circular`);
        else { errorMsg(`${posPass} passed, ${posFail} FAILED`); posFailDetails.forEach(d => console.log(`    ${c.red}•${c.reset} ${d}`)); }
        console.log('');

        // === 5B: DB-level — NEGATIVE: Other-subject teachers in selected schools ===
        console.log(`  ${c.bgRed}${c.white}${c.bold} NEGATIVE — Other Teachers (same schools) ${c.reset}  (should NOT see)\n`);

        const otherSubjectFaculty = await prisma.faculty.findMany({
            where: {
                school_id: { in: selectedSchoolIds },
                user: { role: 'TEACHER', is_active: true },
                teaching_assignments: { none: { subject: scSubject } },
            },
            include: {
                user: { select: { id: true, name: true, phone: true, email: true, role: true } },
                school: { select: { district_id: true } },
                teaching_assignments: { select: { subject: true } },
            },
        });

        let negTeachPass = 0, negTeachFail = 0;
        const negTeachFailDetails: string[] = [];

        for (let i = 0; i < otherSubjectFaculty.length; i++) {
            const f = otherSubjectFaculty[i];
            const subjects = f.teaching_assignments.map(ta => ta.subject);

            const visible = await prisma.circular.findFirst({
                where: {
                    id: circularId!,
                    is_active: true,
                    OR: [
                        { school_id: f.school_id },
                        { targetedSchools: { some: { school_id: f.school_id } } },
                    ],
                    AND: [
                        { OR: [{ target_subject: null }, { target_subject: { in: subjects.length > 0 ? subjects : ['__none__'] } }] },
                    ],
                } as any,
                select: { id: true },
            });

            if (!visible) negTeachPass++;
            else {
                negTeachFail++;
                if (negTeachFailDetails.length < 5) negTeachFailDetails.push(`${f.user.name} — teaches ${subjects.join(', ')} — WRONGLY sees it!`);
            }

            if ((i + 1) % 100 === 0 || i === otherSubjectFaculty.length - 1)
                process.stdout.write(`\r  ${progressBar(i + 1, otherSubjectFaculty.length)}`);
        }
        console.log('');

        if (negTeachFail === 0) successMsg(`ALL ${negTeachPass}/${otherSubjectFaculty.length} other-subject teachers correctly CANNOT see it`);
        else { errorMsg(`${negTeachPass} correct, ${negTeachFail} WRONGLY see it`); negTeachFailDetails.forEach(d => console.log(`    ${c.red}•${c.reset} ${d}`)); }
        console.log('');

        // === 5C: DB-level — NEGATIVE: Headmasters in selected schools ===
        console.log(`  ${c.bgRed}${c.white}${c.bold} NEGATIVE — Headmasters (same schools) ${c.reset}  (should NOT see)\n`);

        const hmFaculty = await prisma.faculty.findMany({
            where: {
                school_id: { in: selectedSchoolIds },
                user: { role: 'HEADMASTER', is_active: true },
            },
            include: {
                user: { select: { id: true, name: true, phone: true, email: true, role: true } },
                school: { select: { district_id: true } },
            },
        });

        let negHmPass = 0, negHmFail = 0;
        const negHmFailDetails: string[] = [];

        for (let i = 0; i < hmFaculty.length; i++) {
            const f = hmFaculty[i];
            // Headmasters have no teaching_assignments ⇒ subjects = []
            // Only circulars with target_subject=null (admin-created) are visible to HMs
            // Our SC circular has target_subject=scSubject, so HMs should NOT see it
            const visibleToHM = await prisma.circular.findFirst({
                where: {
                    id: circularId!,
                    is_active: true,
                    OR: [
                        { school_id: f.school_id },
                        { targetedSchools: { some: { school_id: f.school_id } } },
                    ],
                    // HMs have no subjects, so only target_subject=null matches
                    AND: [{ OR: [{ target_subject: null }] }],
                } as any,
                select: { id: true },
            });

            if (!visibleToHM) negHmPass++;
            else {
                negHmFail++;
                if (negHmFailDetails.length < 5) negHmFailDetails.push(`${f.user.name} — WRONGLY sees it!`);
            }

            if ((i + 1) % 50 === 0 || i === hmFaculty.length - 1)
                process.stdout.write(`\r  ${progressBar(i + 1, hmFaculty.length)}`);
        }
        console.log('');

        if (negHmFail === 0) successMsg(`ALL ${negHmPass}/${hmFaculty.length} headmasters correctly CANNOT see it`);
        else { errorMsg(`${negHmPass} correct, ${negHmFail} WRONGLY see it`); negHmFailDetails.forEach(d => console.log(`    ${c.red}•${c.reset} ${d}`)); }
        console.log('');

        // === 5D: DB-level — NEGATIVE: Faculty from OTHER schools (not targeted) ===
        console.log(`  ${c.bgRed}${c.white}${c.bold} NEGATIVE — Faculty from OTHER Schools ${c.reset}  (should NOT see)\n`);

        const otherSchoolFaculty = await prisma.faculty.findMany({
            where: {
                school_id: { notIn: selectedSchoolIds },
                user: { is_active: true },
            },
            include: {
                user: { select: { id: true, name: true, phone: true, email: true, role: true } },
                school: { select: { district_id: true } },
            },
        });

        let negOtherSchoolPass = 0, negOtherSchoolFail = 0;
        const negOtherSchoolFailDetails: string[] = [];

        for (let i = 0; i < otherSchoolFaculty.length; i++) {
            const f = otherSchoolFaculty[i];

            const visible = await prisma.circular.findFirst({
                where: {
                    id: circularId!,
                    is_active: true,
                    OR: [
                        { school_id: f.school_id },
                        { targetedSchools: { some: { school_id: f.school_id } } },
                    ],
                } as any,
                select: { id: true },
            });

            if (!visible) negOtherSchoolPass++;
            else {
                negOtherSchoolFail++;
                if (negOtherSchoolFailDetails.length < 5) negOtherSchoolFailDetails.push(`${f.user.name} (${f.user.role}, school ${f.school_id}) — WRONGLY sees it!`);
            }

            if ((i + 1) % 200 === 0 || i === otherSchoolFaculty.length - 1)
                process.stdout.write(`\r  ${progressBar(i + 1, otherSchoolFaculty.length)}`);
        }
        console.log('');

        if (negOtherSchoolFail === 0) successMsg(`ALL ${negOtherSchoolPass}/${otherSchoolFaculty.length} faculty from other schools correctly CANNOT see it`);
        else { errorMsg(`${negOtherSchoolPass} correct, ${negOtherSchoolFail} WRONGLY see it`); negOtherSchoolFailDetails.forEach(d => console.log(`    ${c.red}•${c.reset} ${d}`)); }
        console.log('');

        // === 5E: API-level Tests (batched) ===
        const API_BATCH_SIZE = 50;

        // ── Eligible teachers via API ──
        console.log(`  ${c.bgGreen}${c.white}${c.bold} API — ${scSubject} Teachers ${c.reset}  (should see circular)\n`);

        const eligibleUsers = await prisma.user.findMany({
            where: { id: { in: eligibleFaculty.map(f => f.user.id) } },
            select: { id: true, phone: true, email: true, name: true },
        });
        const eligibleMap = new Map(eligibleUsers.map(u => [u.id, u]));

        let apiPosPass = 0, apiPosFail = 0, apiPosLoginFail = 0;
        const apiPosFailDetails: string[] = [];

        for (let batch = 0; batch < eligibleFaculty.length; batch += API_BATCH_SIZE) {
            const slice = eligibleFaculty.slice(batch, batch + API_BATCH_SIZE);
            const promises = slice.map(async (fac) => {
                const u = eligibleMap.get(fac.user.id);
                if (!u) return { pass: false, detail: 'user not found' };
                const token = await loginMobileUser(u.phone, u.email);
                if (!token) return { pass: false, detail: `${u.name}: login failed` };
                const circulars = await getCirculars(token);
                const found = circulars.data.some(cc => cc.id === circularId);
                return found ? { pass: true } : { pass: false, detail: `${u.name}: NOT visible (total=${circulars.total})` };
            });

            const results = await Promise.allSettled(promises);
            for (const r of results) {
                if (r.status === 'fulfilled') {
                    if (r.value.pass) apiPosPass++;
                    else { apiPosFail++; if (r.value.detail && apiPosFailDetails.length < 10) apiPosFailDetails.push(r.value.detail); }
                } else { apiPosFail++; }
            }
            process.stdout.write(`\r  ${progressBar(Math.min(batch + API_BATCH_SIZE, eligibleFaculty.length), eligibleFaculty.length)}`);
        }
        console.log('');

        if (apiPosFail === 0) successMsg(`ALL ${apiPosPass}/${eligibleFaculty.length} eligible teachers CAN see via API ✓`);
        else { errorMsg(`${apiPosPass} passed, ${apiPosFail} FAILED`); apiPosFailDetails.forEach(d => console.log(`    ${c.red}•${c.reset} ${d}`)); }
        console.log('');

        // ── Other-subject teachers via API ──
        console.log(`  ${c.bgRed}${c.white}${c.bold} API — Other Teachers ${c.reset}  (should NOT see)\n`);

        const otherUsers = await prisma.user.findMany({
            where: { id: { in: otherSubjectFaculty.map(f => f.user.id) } },
            select: { id: true, phone: true, email: true, name: true },
        });
        const otherMap = new Map(otherUsers.map(u => [u.id, u]));

        let apiNegPass = 0, apiNegFail = 0;
        const apiNegFailDetails: string[] = [];

        for (let batch = 0; batch < otherSubjectFaculty.length; batch += API_BATCH_SIZE) {
            const slice = otherSubjectFaculty.slice(batch, batch + API_BATCH_SIZE);
            const promises = slice.map(async (fac) => {
                const u = otherMap.get(fac.user.id);
                if (!u) return { pass: true };
                const token = await loginMobileUser(u.phone, u.email);
                if (!token) return { pass: true }; // can't login = can't see
                const circulars = await getCirculars(token);
                const found = circulars.data.some(cc => cc.id === circularId);
                return !found ? { pass: true } : { pass: false, detail: `${u.name}: IS visible (BUG!)` };
            });

            const results = await Promise.allSettled(promises);
            for (const r of results) {
                if (r.status === 'fulfilled') {
                    if (r.value.pass) apiNegPass++;
                    else { apiNegFail++; if (r.value.detail && apiNegFailDetails.length < 10) apiNegFailDetails.push(r.value.detail); }
                } else { apiNegFail++; }
            }
            process.stdout.write(`\r  ${progressBar(Math.min(batch + API_BATCH_SIZE, otherSubjectFaculty.length), otherSubjectFaculty.length)}`);
        }
        console.log('');

        if (apiNegFail === 0) successMsg(`ALL ${apiNegPass}/${otherSubjectFaculty.length} other-subject teachers correctly CANNOT see via API ✓`);
        else { errorMsg(`${apiNegPass} correct, ${apiNegFail} WRONGLY see it`); apiNegFailDetails.forEach(d => console.log(`    ${c.red}•${c.reset} ${d}`)); }
        console.log('');

        // ── Headmasters via API ──
        console.log(`  ${c.bgRed}${c.white}${c.bold} API — Headmasters ${c.reset}  (should NOT see)\n`);

        const hmUsers = await prisma.user.findMany({
            where: { id: { in: hmFaculty.map(f => f.user.id) } },
            select: { id: true, phone: true, email: true, name: true },
        });
        const hmMap = new Map(hmUsers.map(u => [u.id, u]));

        let apiHmPass = 0, apiHmFail = 0;
        const apiHmFailDetails: string[] = [];

        for (let batch = 0; batch < hmFaculty.length; batch += API_BATCH_SIZE) {
            const slice = hmFaculty.slice(batch, batch + API_BATCH_SIZE);
            const promises = slice.map(async (fac) => {
                const u = hmMap.get(fac.user.id);
                if (!u) return { pass: true };
                const token = await loginMobileUser(u.phone, u.email);
                if (!token) return { pass: true };
                const circulars = await getCirculars(token);
                const found = circulars.data.some(cc => cc.id === circularId);
                return !found ? { pass: true } : { pass: false, detail: `${u.name}: IS visible (BUG!)` };
            });

            const results = await Promise.allSettled(promises);
            for (const r of results) {
                if (r.status === 'fulfilled') {
                    if (r.value.pass) apiHmPass++;
                    else { apiHmFail++; if (r.value.detail && apiHmFailDetails.length < 10) apiHmFailDetails.push(r.value.detail); }
                } else { apiHmFail++; }
            }
            process.stdout.write(`\r  ${progressBar(Math.min(batch + API_BATCH_SIZE, hmFaculty.length), hmFaculty.length)}`);
        }
        console.log('');

        if (apiHmFail === 0) successMsg(`ALL ${apiHmPass}/${hmFaculty.length} headmasters correctly CANNOT see via API ✓`);
        else { errorMsg(`${apiHmPass} correct, ${apiHmFail} WRONGLY see it`); apiHmFailDetails.forEach(d => console.log(`    ${c.red}•${c.reset} ${d}`)); }
        console.log('');

        // ── Faculty from other schools via API ──
        console.log(`  ${c.bgRed}${c.white}${c.bold} API — Faculty from OTHER Schools ${c.reset}  (should NOT see)\n`);

        const otherSchoolUsers = await prisma.user.findMany({
            where: { id: { in: otherSchoolFaculty.map(f => f.user.id) } },
            select: { id: true, phone: true, email: true, name: true },
        });
        const otherSchoolMap = new Map(otherSchoolUsers.map(u => [u.id, u]));

        let apiOtherSchoolPass = 0, apiOtherSchoolFail = 0;
        const apiOtherSchoolFailDetails: string[] = [];

        for (let batch = 0; batch < otherSchoolFaculty.length; batch += API_BATCH_SIZE) {
            const slice = otherSchoolFaculty.slice(batch, batch + API_BATCH_SIZE);
            const promises = slice.map(async (fac) => {
                const u = otherSchoolMap.get(fac.user.id);
                if (!u) return { pass: true };
                const token = await loginMobileUser(u.phone, u.email);
                if (!token) return { pass: true }; // can't login = can't see
                const circulars = await getCirculars(token);
                const found = circulars.data.some(cc => cc.id === circularId);
                return !found ? { pass: true } : { pass: false, detail: `${u.name}: IS visible (BUG!)` };
            });

            const results = await Promise.allSettled(promises);
            for (const r of results) {
                if (r.status === 'fulfilled') {
                    if (r.value.pass) apiOtherSchoolPass++;
                    else { apiOtherSchoolFail++; if (r.value.detail && apiOtherSchoolFailDetails.length < 10) apiOtherSchoolFailDetails.push(r.value.detail); }
                } else { apiOtherSchoolFail++; }
            }
            process.stdout.write(`\r  ${progressBar(Math.min(batch + API_BATCH_SIZE, otherSchoolFaculty.length), otherSchoolFaculty.length)}`);
        }
        console.log('');

        if (apiOtherSchoolFail === 0) successMsg(`ALL ${apiOtherSchoolPass}/${otherSchoolFaculty.length} faculty from other schools correctly CANNOT see via API ✓`);
        else { errorMsg(`${apiOtherSchoolPass} correct, ${apiOtherSchoolFail} WRONGLY see it`); apiOtherSchoolFailDetails.forEach(d => console.log(`    ${c.red}•${c.reset} ${d}`)); }
        console.log('');

        // ══════════════════════════════════════════════════════════
        // STEP 6: Cleanup
        // ══════════════════════════════════════════════════════════
        sectionHeader(6, 'CLEANUP');

        const shouldCleanup = await askConfirm('Delete the test circular?');
        if (shouldCleanup && circularId) {
            await prisma.circularSchool.deleteMany({ where: { circular_id: circularId } });
            await prisma.auditLog.deleteMany({ where: { entity_id: circularId, action: 'CIRCULAR_CREATED' } });
            await prisma.circular.delete({ where: { id: circularId } });
            successMsg(`Test circular deleted: ${circularId}`);
            circularId = null;
        } else {
            warnMsg('Test circular was NOT deleted.');
            if (circularId) label('  Circular ID', circularId);
        }

        // ══════════════════════════════════════════════════════════
        // FINAL REPORT
        // ══════════════════════════════════════════════════════════
        banner('FINAL REPORT');

        const totalDbFails = posFail + negTeachFail + negHmFail + negOtherSchoolFail;
        const totalApiFails = apiPosFail + apiNegFail + apiHmFail + apiOtherSchoolFail;

        console.log(`  ${c.bold}Circular:${c.reset}          ${title}`);
        console.log(`  ${c.bold}Subject:${c.reset}           ${c.magenta}${scSubject}${c.reset}`);
        console.log(`  ${c.bold}Scope:${c.reset}             ${scopeLabel}`);
        console.log('');
        console.log(`  ${c.bold}DB — Same-subject:${c.reset}  ${posFail === 0 ? `${c.green}✅ ALL PASSED${c.reset}` : `${c.red}❌ ${posFail} FAILED${c.reset}`} (${posPass} teachers)`);
        console.log(`  ${c.bold}DB — Other subj.:${c.reset}  ${negTeachFail === 0 ? `${c.green}✅ ALL PASSED${c.reset}` : `${c.red}❌ ${negTeachFail} FAILED${c.reset}`} (${negTeachPass} teachers)`);
        console.log(`  ${c.bold}DB — Headmasters:${c.reset}  ${negHmFail === 0 ? `${c.green}✅ ALL PASSED${c.reset}` : `${c.red}❌ ${negHmFail} FAILED${c.reset}`} (${negHmPass} HMs)`);
        console.log(`  ${c.bold}API — Same-subj.:${c.reset}  ${apiPosFail === 0 ? `${c.green}✅ ALL PASSED${c.reset}` : `${c.red}❌ ${apiPosFail} FAILED${c.reset}`} (${apiPosPass} checked)`);
        console.log(`  ${c.bold}API — Other subj.:${c.reset} ${apiNegFail === 0 ? `${c.green}✅ ALL PASSED${c.reset}` : `${c.red}❌ ${apiNegFail} FAILED${c.reset}`} (${apiNegPass} checked)`);
        console.log(`  ${c.bold}API — Headmasters:${c.reset} ${apiHmFail === 0 ? `${c.green}✅ ALL PASSED${c.reset}` : `${c.red}❌ ${apiHmFail} FAILED${c.reset}`} (${apiHmPass} checked)`);
        console.log(`  ${c.bold}DB — Other schls:${c.reset}  ${negOtherSchoolFail === 0 ? `${c.green}✅ ALL PASSED${c.reset}` : `${c.red}❌ ${negOtherSchoolFail} FAILED${c.reset}`} (${negOtherSchoolPass} faculty)`);
        console.log(`  ${c.bold}API — Other schls:${c.reset} ${apiOtherSchoolFail === 0 ? `${c.green}✅ ALL PASSED${c.reset}` : `${c.red}❌ ${apiOtherSchoolFail} FAILED${c.reset}`} (${apiOtherSchoolPass} checked)`);
        console.log(`  ${c.bold}Cleaned up:${c.reset}        ${circularId ? `${c.yellow}No${c.reset}` : `${c.green}Yes${c.reset}`}`);
        console.log('');

        const allPassed = totalDbFails === 0 && totalApiFails === 0;
        if (allPassed) {
            console.log(`  ${c.bgGreen}${c.white}${c.bold} 🎉 ALL TESTS PASSED — SC circular subject filtering works correctly! ${c.reset}\n`);
        } else {
            console.log(`  ${c.bgRed}${c.white}${c.bold} 💥 SOME TESTS FAILED — Check details above ${c.reset}\n`);
        }

    } catch (err: any) {
        console.log('');
        errorMsg(`Fatal error: ${err.message || err}`);
        console.error(err);

        if (circularId) {
            warnMsg('Attempting cleanup...');
            try {
                await prisma.circularSchool.deleteMany({ where: { circular_id: circularId } });
                await prisma.auditLog.deleteMany({ where: { entity_id: circularId, action: 'CIRCULAR_CREATED' } });
                await prisma.circular.delete({ where: { id: circularId } });
                successMsg('Cleanup successful.');
            } catch {
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
