/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║        CIRCULAR DISTRIBUTION — INTERACTIVE TERMINAL SIMULATOR      ║
 * ╠══════════════════════════════════════════════════════════════════════╣
 * ║                                                                    ║
 * ║  Simulates the FULL admin CMS circular workflow in your terminal:  ║
 * ║                                                                    ║
 * ║    Step 1:  Fill in circular details (title, description, etc.)    ║
 * ║    Step 2:  Choose scope — Global / District / Specific Schools    ║
 * ║    Step 3:  If district → select district from list                ║
 * ║    Step 4:  Select schools (all in district / pick specific ones)  ║
 * ║    Step 5:  Confirm & send the circular via real API               ║
 * ║    Step 6:  Verify visibility — DB-level + API spot-checks         ║
 * ║             ✅ Eligible faculty CAN see it                         ║ 
 * ║             ❌ Ineligible faculty CANNOT see it                    ║
 * ║    Step 7:  Cleanup — delete test circular                         ║
 * ║                                                                    ║
 * ║  Usage:                                                            ║
 * ║    npx ts-node scripts/circular-simulator.ts                       ║
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

interface CircularsResponse {
    data: Array<{ id: string; title: string; circular_no: string }>;
    total: number;
    hasMore: boolean;
}

async function loginAdmin(): Promise<string> {
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
    return data.access_token;
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

async function getCirculars(token: string, limit = 100): Promise<CircularsResponse> {
    const res = await fetch(`${API_URL}/circulars?limit=${limit}&offset=0`, {
        headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
        throw new Error(`GET /circulars failed: ${res.status}`);
    }

    return (await res.json()) as CircularsResponse;
}

async function createCircularViaAPI(
    adminToken: string,
    title: string,
    description: string,
    issuedBy: string,
    issuedDate: string,
    districtId: string | null,
    schoolIds: string[],
): Promise<{ id: string; circular_no: string }> {
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
        headers: { Authorization: `Bearer ${adminToken}` },
        body: formData,
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Create circular failed (${res.status}): ${text}`);
    }

    return (await res.json()) as { id: string; circular_no: string };
}

// ══════════════════════════════════════════════════════════════════
//  MAIN INTERACTIVE FLOW
// ══════════════════════════════════════════════════════════════════

async function main() {
    let circularId: string | null = null;

    try {
        banner('CIRCULAR DISTRIBUTION — INTERACTIVE SIMULATOR');

        label('Time', new Date().toLocaleString());
        label('API', API_URL);
        label('API test mode', 'Full-scale (all users, batches of 50)');
        console.log('');

        // ══════════════════════════════════════════════════════════
        // STEP 0: Data Discovery
        // ══════════════════════════════════════════════════════════
        infoMsg('Connecting to database and surveying data...\n');

        const [totalDistricts, totalSchools, totalFaculty] = await Promise.all([
            prisma.district.count(),
            prisma.school.count(),
            prisma.faculty.count(),
        ]);

        label('Districts', String(totalDistricts));
        label('Schools', String(totalSchools));
        label('Faculty', String(totalFaculty));
        divider();

        // ══════════════════════════════════════════════════════════
        // STEP 1: Create Circular — Fill in Details
        // ══════════════════════════════════════════════════════════
        sectionHeader(1, 'CREATE CIRCULAR — Fill in Details');
        console.log(`  ${c.dim}Just like the admin fills in the form in CMS.${c.reset}`);
        console.log(`  ${c.dim}Press Enter to use defaults shown in [brackets].${c.reset}\n`);

        const title = await ask('Circular Title', `[TEST] Simulator Circular — ${Date.now()}`);
        const description = await ask('Description', 'Automated simulator test circular');
        const issuedBy = await ask('Issued By', 'SEBA Test Script');
        const issuedDate = await ask('Issued Date (YYYY-MM-DD)', new Date().toISOString().split('T')[0]);

        console.log('');
        divider();
        console.log(`\n  ${c.bold}📋 Circular Details:${c.reset}`);
        label('  Title', title);
        label('  Description', description);
        label('  Issued By', issuedBy);
        label('  Issued Date', issuedDate);
        console.log('');

        // ══════════════════════════════════════════════════════════
        // STEP 2: Choose Distribution Scope
        // ══════════════════════════════════════════════════════════
        sectionHeader(2, 'CHOOSE DISTRIBUTION SCOPE');
        console.log(`  ${c.bold}How should this circular be distributed?${c.reset}\n`);
        console.log(`  ${c.cyan}[1]${c.reset}  🌐 ${c.bold}Send Global${c.reset}  — All schools, all districts`);
        console.log(`  ${c.cyan}[2]${c.reset}  🏛️  ${c.bold}Select a District${c.reset}  — Choose district, then pick schools\n`);

        const scopeChoice = await ask('Select scope (1/2)', '2');

        let selectedDistrictId: string | null = null;
        let selectedDistrictName: string | null = null;
        let selectedSchoolIds: string[] = [];
        let selectedSchoolNames: string[] = [];
        let scopeLabel = '';
        let isDistrictWide = false; // tracks if user chose "all schools" in district

        if (scopeChoice === '1') {
            // ── GLOBAL ──
            scopeLabel = '🌐 GLOBAL (all schools, all districts)';
            console.log(`\n  ${c.green}→ Selected: ${scopeLabel}${c.reset}`);
        } else if (scopeChoice === '2') {
            // ══════════════════════════════════════════════════════
            // STEP 3: Select District
            // ══════════════════════════════════════════════════════
            sectionHeader(3, 'SELECT DISTRICT');

            const districts = await prisma.district.findMany({
                orderBy: { name: 'asc' },
                include: { _count: { select: { schools: true } } },
            });

            console.log(`  ${c.bold}Available Districts:${c.reset}\n`);
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
            selectedDistrictId = chosenDistrict.id;
            selectedDistrictName = chosenDistrict.name;
            console.log(`\n  ${c.green}→ Selected district: ${c.bold}${chosenDistrict.name}${c.reset}${c.green} (${chosenDistrict._count.schools} schools)${c.reset}`);

            // ══════════════════════════════════════════════════════
            // STEP 4: Select Schools — All or Specific
            // ══════════════════════════════════════════════════════
            sectionHeader(4, 'SELECT SCHOOLS');

            console.log(`  ${c.bold}Send to which schools in ${chosenDistrict.name}?${c.reset}\n`);
            console.log(`  ${c.cyan}[1]${c.reset}  ⭐ ${c.bold}All Schools${c.reset}  — Send to all ${chosenDistrict._count.schools} schools in this district`);
            console.log(`  ${c.cyan}[2]${c.reset}  🏫 ${c.bold}Select Specific Schools${c.reset}  — Pick individual schools\n`);

            const schoolScopeChoice = await ask('Select (1/2)', '2');

            const schools = await prisma.school.findMany({
                where: { district_id: chosenDistrict.id },
                orderBy: { name: 'asc' },
                include: { _count: { select: { faculties: true } } },
            });

            if (schoolScopeChoice === '1') {
                // ── ALL SCHOOLS in district ──
                selectedSchoolIds = schools.map(s => s.id);
                selectedSchoolNames = schools.map(s => s.name);
                isDistrictWide = true;
                scopeLabel = `🏛️ DISTRICT: ${chosenDistrict.name} (all ${schools.length} schools)`;
                console.log(`\n  ${c.green}→ Selected ALL ${schools.length} schools in ${chosenDistrict.name}${c.reset}`);
            } else {
                // ── SPECIFIC SCHOOLS ──
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
                console.log(`  ${c.dim}Enter school numbers separated by commas (e.g., 1,3,5)${c.reset}`);
                console.log(`  ${c.dim}Enter a range like 1-10 for first 10 schools${c.reset}\n`);

                const schoolChoice = await ask('Select schools');

                if (schoolChoice.includes('-')) {
                    // Range: e.g., "1-10"
                    const [start, end] = schoolChoice.split('-').map(n => parseInt(n.trim(), 10));
                    for (let i = start - 1; i < Math.min(end, schools.length); i++) {
                        if (i >= 0) {
                            selectedSchoolIds.push(schools[i].id);
                            selectedSchoolNames.push(schools[i].name);
                        }
                    }
                    console.log(`\n  ${c.green}→ Selected ${selectedSchoolIds.length} schools (range ${start}-${end})${c.reset}`);
                } else {
                    // Comma-separated: e.g., "1,3,5"
                    const indices = schoolChoice.split(',').map(n => parseInt(n.trim(), 10) - 1);
                    for (const idx of indices) {
                        if (idx >= 0 && idx < schools.length) {
                            selectedSchoolIds.push(schools[idx].id);
                            selectedSchoolNames.push(schools[idx].name);
                        }
                    }
                    console.log(`\n  ${c.green}→ Selected ${selectedSchoolIds.length} school(s)${c.reset}`);
                }

                if (selectedSchoolIds.length === 0) {
                    throw new Error('No schools selected. Aborting.');
                }

                scopeLabel = `🏫 ${selectedSchoolIds.length} SPECIFIC SCHOOLS in ${chosenDistrict.name}`;
            }

            // Show selected schools summary
            const totalTargetedFaculty = await prisma.faculty.count({
                where: { school_id: { in: selectedSchoolIds } },
            });

            console.log('');
            divider();
            console.log(`\n  ${c.bold}🏫 Selected Schools:${c.reset}\n`);
            const displayCount = Math.min(selectedSchoolNames.length, 10);
            for (let i = 0; i < displayCount; i++) {
                console.log(`    ${c.green}✓${c.reset} ${selectedSchoolNames[i]}`);
            }
            if (selectedSchoolNames.length > 10) {
                console.log(`    ${c.dim}... and ${selectedSchoolNames.length - 10} more${c.reset}`);
            }
            console.log(`\n  ${c.bold}Total targeted faculty: ${totalTargetedFaculty}${c.reset}`);
        } else {
            throw new Error('Invalid scope selection.');
        }

        // ══════════════════════════════════════════════════════════
        // STEP 5: Confirm & Send
        // ══════════════════════════════════════════════════════════
        sectionHeader(5, 'CONFIRM & SEND CIRCULAR');

        console.log(`  ${c.bold}📋 Circular Summary:${c.reset}\n`);
        label('  Title', title);
        label('  Description', description);
        label('  Issued By', issuedBy);
        label('  Issued Date', issuedDate);
        label('  Scope', scopeLabel);
        if (selectedDistrictName) label('  District', selectedDistrictName);
        if (selectedSchoolIds.length > 0) label('  Schools', `${selectedSchoolIds.length} selected`);
        console.log('');

        const confirmed = await askConfirm('Send this circular now?');
        if (!confirmed) {
            warnMsg('Aborted by user.');
            rl.close();
            await prisma.$disconnect();
            return;
        }

        console.log('');
        infoMsg('Logging in as admin...');
        const adminToken = await loginAdmin();
        successMsg('Admin login successful');

        infoMsg('Creating circular via API...');
        const created = await createCircularViaAPI(
            adminToken,
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

        // Verify M2M entries
        if (selectedSchoolIds.length > 1) {
            const m2mCount = await prisma.circularSchool.count({
                where: { circular_id: circularId },
            });
            label('  CircularSchool M2M', `${m2mCount} entries`);
            if (m2mCount !== selectedSchoolIds.length) {
                errorMsg(`Expected ${selectedSchoolIds.length} M2M entries but got ${m2mCount}!`);
            }
        }

        // ══════════════════════════════════════════════════════════
        // STEP 6: Verify Visibility
        // ══════════════════════════════════════════════════════════
        sectionHeader(6, 'VERIFY VISIBILITY — STRESS TEST');

        console.log(`  ${c.bold}Testing if the correct faculty can/cannot see the circular...${c.reset}\n`);

        // === 6A: Determine eligible vs ineligible based on scope ===
        let eligibleSchoolIds: string[] = [];

        if (scopeChoice === '1') {
            // Global: everyone is eligible
            eligibleSchoolIds = (await prisma.school.findMany({ select: { id: true } })).map(s => s.id);
        } else {
            // District (all or specific): selectedSchoolIds is always populated
            eligibleSchoolIds = selectedSchoolIds;
        }

        const eligibleFaculty = await prisma.faculty.findMany({
            where: { school_id: { in: eligibleSchoolIds } },
            include: {
                user: { select: { id: true, name: true, role: true, is_active: true } },
                school: { select: { district_id: true } },
            },
        });

        const activeEligible = eligibleFaculty.filter(f => f.user.is_active);
        const totalIneligible = await prisma.faculty.count({
            where: { school_id: { notIn: eligibleSchoolIds } },
        });

        label('Eligible faculty', `${activeEligible.length} active (${eligibleFaculty.length} total)`);
        label('Ineligible faculty', String(totalIneligible));
        console.log('');

        // === 6B: POSITIVE VISIBILITY (DB-level) ===
        console.log(`  ${c.bgGreen}${c.white}${c.bold} POSITIVE VISIBILITY TEST ${c.reset}  (eligible faculty CAN see it)\n`);

        let positivePass = 0;
        let positiveFail = 0;
        const positiveFailDetails: string[] = [];
        const posStart = Date.now();

        for (let i = 0; i < activeEligible.length; i++) {
            const faculty = activeEligible[i];

            const visibleCircular = await prisma.circular.findFirst({
                where: {
                    id: circularId!,
                    is_active: true,
                    OR: [
                        { school_id: null, district_id: null, targetedSchools: { none: {} } },
                        { district_id: faculty.school.district_id, school_id: null, targetedSchools: { none: {} } },
                        { school_id: faculty.school_id },
                        { targetedSchools: { some: { school_id: faculty.school_id } } },
                    ],
                },
                select: { id: true },
            });

            if (visibleCircular) {
                positivePass++;
            } else {
                positiveFail++;
                if (positiveFailDetails.length < 5) {
                    positiveFailDetails.push(
                        `${faculty.user.name} (${faculty.user.role}, school ${faculty.school_id})`
                    );
                }
            }

            if ((i + 1) % 200 === 0 || i === activeEligible.length - 1) {
                process.stdout.write(`\r  ${progressBar(i + 1, activeEligible.length)}`);
            }
        }
        console.log('');

        const posDuration = Date.now() - posStart;
        if (positiveFail === 0) {
            successMsg(`ALL ${positivePass}/${activeEligible.length} eligible faculty CAN see the circular`);
        } else {
            errorMsg(`${positivePass} passed, ${positiveFail} FAILED`);
            positiveFailDetails.forEach(d => console.log(`    ${c.red}•${c.reset} ${d}: NOT visible!`));
        }
        infoMsg(`Duration: ${posDuration < 1000 ? `${posDuration}ms` : `${(posDuration / 1000).toFixed(2)}s`}`);
        console.log('');

        // === 6C: NEGATIVE VISIBILITY (DB-level) ===
        if (totalIneligible > 0) {
            console.log(`  ${c.bgRed}${c.white}${c.bold} NEGATIVE VISIBILITY TEST ${c.reset}  (ineligible faculty CANNOT see it)\n`);

            let negativePass = 0;
            let negativeFail = 0;
            const negativeFailDetails: string[] = [];
            const negStart = Date.now();
            let processed = 0;
            const BATCH_SIZE = 1000;
            let skip = 0;

            while (true) {
                const batch = await prisma.faculty.findMany({
                    where: { school_id: { notIn: eligibleSchoolIds } },
                    include: {
                        user: { select: { id: true, name: true, role: true, is_active: true } },
                        school: { select: { district_id: true } },
                    },
                    skip,
                    take: BATCH_SIZE,
                });

                if (batch.length === 0) break;

                for (const faculty of batch) {
                    if (!faculty.user.is_active) {
                        negativePass++;
                        processed++;
                        continue;
                    }

                    const visibleCircular = await prisma.circular.findFirst({
                        where: {
                            id: circularId!,
                            is_active: true,
                            OR: [
                                { school_id: null, district_id: null, targetedSchools: { none: {} } },
                                { district_id: faculty.school.district_id, school_id: null, targetedSchools: { none: {} } },
                                { school_id: faculty.school_id },
                                { targetedSchools: { some: { school_id: faculty.school_id } } },
                            ],
                        },
                        select: { id: true },
                    });

                    if (!visibleCircular) {
                        negativePass++;
                    } else {
                        negativeFail++;
                        if (negativeFailDetails.length < 5) {
                            negativeFailDetails.push(
                                `${faculty.user.name} (${faculty.user.role}, school ${faculty.school_id})`
                            );
                        }
                    }

                    processed++;
                    if (processed % 200 === 0) {
                        process.stdout.write(`\r  ${progressBar(processed, totalIneligible)}`);
                    }
                }

                skip += BATCH_SIZE;
            }
            process.stdout.write(`\r  ${progressBar(totalIneligible, totalIneligible)}\n`);

            const negDuration = Date.now() - negStart;
            if (negativeFail === 0) {
                successMsg(`ALL ${negativePass}/${totalIneligible} ineligible faculty correctly CANNOT see it`);
            } else {
                errorMsg(`${negativePass} correct, ${negativeFail} WRONGLY see the circular`);
                negativeFailDetails.forEach(d => console.log(`    ${c.red}•${c.reset} ${d}: SHOULD NOT see circular!`));
            }
            infoMsg(`Duration: ${negDuration < 1000 ? `${negDuration}ms` : `${(negDuration / 1000).toFixed(2)}s`}`);
            console.log('');
        } else {
            warnMsg('No ineligible faculty to test (global scope covers everyone).');
            console.log('');
        }

        // === 6D: API FULL-SCALE TEST ===
        console.log(`  ${c.bgMagenta}${c.white}${c.bold} API FULL-SCALE TEST ${c.reset}  (real API login + GET /circulars for EVERY user)\n`);

        const API_BATCH_SIZE = 50; // concurrent requests per batch

        // ── Diagnostic probe first ──
        console.log(`  ${c.bold}🔍 Diagnostic Probe:${c.reset}`);
        if (activeEligible.length > 0) {
            const probeUser = activeEligible[0];
            const probeFullUser = await prisma.user.findUnique({
                where: { id: probeUser.user.id },
                select: { phone: true, email: true, name: true, role: true },
            });
            if (probeFullUser) {
                label('  Probe user', `${probeFullUser.name} (${probeFullUser.role})`);
                label('  Phone', probeFullUser.phone);
                label('  Email', probeFullUser.email || 'null');
                label('  School ID', probeUser.school_id);

                const probeToken = await loginUser(probeFullUser.phone, probeFullUser.email || undefined);
                if (probeToken) {
                    const probeResult = await getCirculars(probeToken, 200);
                    label('  API returned', `${probeResult.data.length} circulars (total: ${probeResult.total})`);
                    const found = probeResult.data.some(cc => cc.id === circularId);
                    label('  Our circular', found ? `${c.green}FOUND ✓${c.reset}` : `${c.red}NOT FOUND ✗${c.reset}`);
                    if (!found && probeResult.data.length > 0) {
                        label('  First circular', `${probeResult.data[0].circular_no} — ${probeResult.data[0].title}`);
                    }
                } else {
                    errorMsg('Probe user login failed!');
                }
            }
        }
        console.log('');

        let spotPass = 0;
        let spotFail = 0;
        let spotLoginFail = 0;
        const spotFailDetails: string[] = [];

        // ── Helper: test a single user via API ──
        type SpotResult = { name: string; pass: boolean; loginFailed: boolean; detail?: string };

        async function testUserViaAPI(
            userId: string,
            phone: string,
            email: string | null,
            name: string,
            shouldSee: boolean,
            cId: string,
        ): Promise<SpotResult> {
            try {
                const token = await loginUser(phone, email || undefined);
                if (!token) {
                    if (shouldSee) {
                        return { name, pass: false, loginFailed: true, detail: `${name}: login failed` };
                    }
                    return { name, pass: true, loginFailed: true }; // can't login = can't see (correct)
                }

                const circulars = await getCirculars(token, 200);
                const found = circulars.data.some(cc => cc.id === cId);

                if (shouldSee) {
                    return found
                        ? { name, pass: true, loginFailed: false }
                        : { name, pass: false, loginFailed: false, detail: `${name}: NOT visible via API (total=${circulars.total})` };
                } else {
                    return !found
                        ? { name, pass: true, loginFailed: false }
                        : { name, pass: false, loginFailed: false, detail: `${name}: IS visible via API (BUG!)` };
                }
            } catch (err: any) {
                return { name, pass: false, loginFailed: true, detail: `${name}: error — ${err.message}` };
            }
        }

        // ── Fetch all user details for eligible faculty ──
        const eligibleUserIds = activeEligible.map(f => f.user.id);
        const eligibleUsers = await prisma.user.findMany({
            where: { id: { in: eligibleUserIds } },
            select: { id: true, phone: true, email: true, name: true },
        });
        const eligibleUserMap = new Map(eligibleUsers.map(u => [u.id, u]));

        // ── Test ALL ELIGIBLE via batched Promise.allSettled ──
        console.log(`  ${c.bgGreen}${c.white}${c.bold} ELIGIBLE API TEST ${c.reset}  (${activeEligible.length} faculty — should see circular)\n`);
        const eligibleApiStart = Date.now();

        for (let batch = 0; batch < activeEligible.length; batch += API_BATCH_SIZE) {
            const batchSlice = activeEligible.slice(batch, batch + API_BATCH_SIZE);
            const promises = batchSlice.map(faculty => {
                const user = eligibleUserMap.get(faculty.user.id);
                if (!user) return Promise.resolve({ name: 'unknown', pass: false, loginFailed: true, detail: 'user not found' } as SpotResult);
                return testUserViaAPI(user.id, user.phone, user.email, user.name, true, circularId!);
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

            process.stdout.write(`\r  ${progressBar(Math.min(batch + API_BATCH_SIZE, activeEligible.length), activeEligible.length)}`);
        }
        console.log('');

        const eligibleApiDuration = Date.now() - eligibleApiStart;
        if (spotFail === 0) {
            successMsg(`ALL ${spotPass}/${activeEligible.length} eligible faculty CAN see via API ✓`);
        } else {
            errorMsg(`${spotPass} passed, ${spotFail} FAILED (${spotLoginFail} login failures)`);
            spotFailDetails.forEach(d => console.log(`    ${c.red}•${c.reset} ${d}`));
        }
        infoMsg(`Duration: ${eligibleApiDuration < 1000 ? `${eligibleApiDuration}ms` : `${(eligibleApiDuration / 1000).toFixed(1)}s`}`);
        console.log('');

        const eligibleFailCount = spotFail;

        // ── Test ALL INELIGIBLE via batched Promise.allSettled ──
        let ineligibleApiPass = 0;
        let ineligibleApiFail = 0;
        let ineligibleLoginFail = 0;
        const ineligibleFailDetails: string[] = [];

        if (totalIneligible > 0) {
            console.log(`  ${c.bgRed}${c.white}${c.bold} INELIGIBLE API TEST ${c.reset}  (${totalIneligible} faculty — should NOT see circular)\n`);
            const ineligibleApiStart = Date.now();

            let ineligibleSkip = 0;
            let ineligibleProcessed = 0;

            while (true) {
                const ineligibleBatch = await prisma.faculty.findMany({
                    where: { school_id: { notIn: eligibleSchoolIds }, user: { is_active: true } },
                    include: { user: { select: { id: true, name: true, phone: true, email: true, role: true } } },
                    skip: ineligibleSkip,
                    take: API_BATCH_SIZE,
                });

                if (ineligibleBatch.length === 0) break;

                const promises = ineligibleBatch.map(faculty =>
                    testUserViaAPI(faculty.user.id, faculty.user.phone, faculty.user.email, faculty.user.name, false, circularId!),
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
                process.stdout.write(`\r  ${progressBar(ineligibleProcessed, totalIneligible)}`);
            }
            console.log('');

            const ineligibleApiDuration = Date.now() - ineligibleApiStart;
            if (ineligibleApiFail === 0) {
                successMsg(`ALL ${ineligibleApiPass}/${totalIneligible} ineligible faculty correctly CANNOT see via API ✓`);
            } else {
                errorMsg(`${ineligibleApiPass} correct, ${ineligibleApiFail} WRONGLY see circular (${ineligibleLoginFail} login failures)`);
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
        // STEP 7: Cleanup
        // ══════════════════════════════════════════════════════════
        sectionHeader(7, 'CLEANUP');

        const shouldCleanup = await askConfirm('Delete the test circular?');
        if (shouldCleanup && circularId) {
            await prisma.circularSchool.deleteMany({ where: { circular_id: circularId } });
            await prisma.auditLog.deleteMany({
                where: { entity_id: circularId, action: 'CIRCULAR_CREATED' },
            });
            await prisma.circular.delete({ where: { id: circularId } });
            successMsg(`Test circular deleted: ${circularId}`);
            circularId = null;
        } else {
            warnMsg('Test circular was NOT deleted. You can view it in the CMS.');
            label('  Circular ID', circularId || 'N/A');
        }

        // ══════════════════════════════════════════════════════════
        // FINAL REPORT
        // ══════════════════════════════════════════════════════════
        banner('FINAL REPORT');

        console.log(`  ${c.bold}Circular:${c.reset}      ${title}`);
        console.log(`  ${c.bold}Scope:${c.reset}         ${scopeLabel}`);
        console.log(`  ${c.bold}DB Positive:${c.reset}   ${positiveFail === 0 ? `${c.green}✅ ALL PASSED${c.reset}` : `${c.red}❌ ${positiveFail} FAILED${c.reset}`} (${positivePass} faculty checked)`);
        if (totalIneligible > 0) {
            console.log(`  ${c.bold}DB Negative:${c.reset}   ${c.green}✅ CHECKED${c.reset} (${totalIneligible} ineligible faculty)`);
        }
        console.log(`  ${c.bold}API Eligible:${c.reset}  ${eligibleFailCount === 0 ? `${c.green}✅ ALL PASSED${c.reset}` : `${c.red}❌ ${eligibleFailCount} FAILED${c.reset}`} (${spotPass + eligibleFailCount} checked)`);
        console.log(`  ${c.bold}API Ineligible:${c.reset}${ineligibleApiFail === 0 ? `${c.green}✅ ALL PASSED${c.reset}` : `${c.red}❌ ${ineligibleApiFail} FAILED${c.reset}`} (${ineligibleApiPass + ineligibleApiFail} checked)`);
        console.log(`  ${c.bold}Cleaned up:${c.reset}    ${circularId ? `${c.yellow}No${c.reset} (circular still exists)` : `${c.green}Yes${c.reset}`}`);
        console.log('');

        const allPassed = positiveFail === 0 && totalApiFails === 0;
        if (allPassed) {
            console.log(`  ${c.bgGreen}${c.white}${c.bold} 🎉 ALL TESTS PASSED — Circular distribution is working correctly! ${c.reset}\n`);
        } else {
            console.log(`  ${c.bgRed}${c.white}${c.bold} 💥 SOME TESTS FAILED — Check details above ${c.reset}\n`);
        }

    } catch (err: any) {
        console.log('');
        errorMsg(`Fatal error: ${err.message || err}`);
        console.error(err);

        // Cleanup on error
        if (circularId) {
            warnMsg('Attempting cleanup of test circular...');
            try {
                await prisma.circularSchool.deleteMany({ where: { circular_id: circularId } });
                await prisma.auditLog.deleteMany({
                    where: { entity_id: circularId, action: 'CIRCULAR_CREATED' },
                });
                await prisma.circular.delete({ where: { id: circularId } });
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
