/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║      EXAM CENTER SUPERINTENDENT — INTERACTIVE STRESS SIMULATOR     ║
 * ╠══════════════════════════════════════════════════════════════════════╣
 * ║                                                                    ║
 * ║  Stress tests the entire Exam-Center & CS lifecycle:               ║
 * ║                                                                    ║
 * ║    Step 1:  Pick a school with a headmaster                        ║
 * ║    Step 2:  Create exam center → HM auto-becomes CS               ║
 * ║    Step 3:  Verify HM login → is_center_superintendent = true     ║
 * ║             (i.e. QPT tab would be visible)                        ║
 * ║    Step 4:  Override CS → assign a teacher from the same school    ║
 * ║    Step 5:  Verify NEW CS login → is_center_superintendent = true ║
 * ║    Step 6:  Verify PREVIOUS CS lost access → flag = false          ║
 * ║    Step 7:  Bulk stress test — repeat N times with random schools  ║
 * ║    Step 8:  Cleanup — delete all test exam centers                 ║
 * ║                                                                    ║
 * ║  Usage:                                                            ║
 * ║    npx ts-node scripts/exam-center-simulator.ts                    ║
 * ║                                                                    ║
 * ║  Prerequisites:                                                    ║
 * ║    - Backend running on localhost:3001                              ║
 * ║    - Database seeded with `npx prisma db seed`                     ║
 * ║                                                                    ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

import { PrismaClient, UserRole } from '@prisma/client';
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
    console.log(`  ${c.dim}${key.padEnd(25)}${c.reset}${c.bold}${value}${c.reset}`);
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
    user: {
        id: string;
        name: string;
        role: string;
        is_center_superintendent: boolean;
    };
}

interface ExamCenterResponse {
    success: boolean;
    message: string;
    data: {
        id: string;
        school_id: string;
        superintendent_id: string;
        is_active: boolean;
        school: { name: string; district: { name: string } };
        superintendent: { id: string; name: string; email: string; role: string };
    };
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

/**
 * Login as a faculty user and return both the token AND the is_center_superintendent flag.
 * This is the key verification: the mobile app reads this flag from login response
 * to decide whether to show the QPT (Question Paper Tracking) tab.
 */
async function loginUser(
    phone: string,
    email?: string,
): Promise<{ token: string; isCenterSuperintendent: boolean } | null> {
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
        return {
            token: data.access_token,
            isCenterSuperintendent: data.user.is_center_superintendent,
        };
    } catch {
        return null;
    }
}

async function createExamCenter(adminToken: string, schoolId: string): Promise<ExamCenterResponse> {
    const res = await fetch(`${API_URL}/admin/exam-centers`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ school_id: schoolId }),
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Create exam center failed (${res.status}): ${text}`);
    }

    return (await res.json()) as ExamCenterResponse;
}

async function overrideSuperintendent(
    adminToken: string,
    examCenterId: string,
    email: string,
): Promise<ExamCenterResponse> {
    const res = await fetch(`${API_URL}/admin/exam-centers/${examCenterId}/superintendent`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ email }),
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Override superintendent failed (${res.status}): ${text}`);
    }

    return (await res.json()) as ExamCenterResponse;
}

async function deleteExamCenter(adminToken: string, examCenterId: string): Promise<void> {
    const res = await fetch(`${API_URL}/admin/exam-centers/${examCenterId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Delete exam center failed (${res.status}): ${text}`);
    }
}

// ══════════════════════════════════════════════════════════════════
//  MAIN INTERACTIVE FLOW
// ══════════════════════════════════════════════════════════════════

async function main() {
    const createdCenterIds: string[] = []; // Track for cleanup

    try {
        banner('EXAM CENTER CS — INTERACTIVE STRESS SIMULATOR');

        label('Time', new Date().toLocaleString());
        label('API', API_URL);
        console.log('');

        // ══════════════════════════════════════════════════════════
        // STEP 0: Data Discovery
        // ══════════════════════════════════════════════════════════
        infoMsg('Connecting to database and surveying data...\n');

        const [totalDistricts, totalSchools, totalFaculty, totalExamCenters] = await Promise.all([
            prisma.district.count(),
            prisma.school.count(),
            prisma.faculty.count(),
            prisma.examCenter.count(),
        ]);

        label('Districts', String(totalDistricts));
        label('Schools', String(totalSchools));
        label('Faculty', String(totalFaculty));
        label('Existing Exam Centers', String(totalExamCenters));
        divider();

        // ══════════════════════════════════════════════════════════
        // STEP 1: Select a School
        // ══════════════════════════════════════════════════════════
        sectionHeader(1, 'SELECT SCHOOL');
        console.log(`  ${c.bold}Pick a school to designate as an exam center.${c.reset}`);
        console.log(`  ${c.dim}The school must have a headmaster AND at least one teacher.${c.reset}\n`);

        // Find districts with schools that have both headmasters and teachers
        const districts = await prisma.district.findMany({
            orderBy: { name: 'asc' },
            include: { _count: { select: { schools: true } } },
        });

        console.log(`  ${c.dim}${'#'.padStart(4)}  ${'District Name'.padEnd(25)} Schools${c.reset}`);
        console.log(`  ${c.dim}${'─'.repeat(45)}${c.reset}`);

        districts.forEach((d, i) => {
            const num = `${c.cyan}${String(i + 1).padStart(4)}${c.reset}`;
            const name = d.name.padEnd(25);
            const count = `${c.bold}${d._count.schools}${c.reset}`;
            console.log(`  ${num}  ${name} ${count}`);
        });

        console.log('');
        const districtChoice = await ask(`Select district (1-${districts.length})`, '1');
        const districtIndex = parseInt(districtChoice, 10) - 1;

        if (districtIndex < 0 || districtIndex >= districts.length) {
            throw new Error('Invalid district selection.');
        }

        const chosenDistrict = districts[districtIndex];
        console.log(`\n  ${c.green}→ District: ${c.bold}${chosenDistrict.name}${c.reset}`);

        // Find schools that are NOT already exam centers and have both HM + teacher
        const eligibleSchools = await prisma.school.findMany({
            where: {
                district_id: chosenDistrict.id,
                examCenter: null, // Not already an exam center
                faculties: {
                    some: {
                        user: { role: UserRole.HEADMASTER, is_active: true },
                    },
                },
            },
            include: {
                faculties: {
                    include: {
                        user: {
                            select: { id: true, name: true, email: true, role: true, phone: true, is_center_superintendent: true },
                        },
                    },
                },
                _count: { select: { faculties: true } },
            },
            orderBy: { name: 'asc' },
        });

        // Filter to schools that also have at least one teacher (for override test)
        const schoolsWithBoth = eligibleSchools.filter(s =>
            s.faculties.some(f => f.user.role === UserRole.TEACHER && f.user.is_center_superintendent === false)
        );

        if (schoolsWithBoth.length === 0) {
            throw new Error(`No eligible schools found in ${chosenDistrict.name}. Need schools with HM + Teacher that are not already exam centers.`);
        }

        console.log(`\n  ${c.bold}Eligible Schools (HM + Teacher, not already exam center):${c.reset}\n`);
        console.log(`  ${c.dim}${'#'.padStart(4)}  ${'School Name'.padEnd(45)} Faculty${c.reset}`);
        console.log(`  ${c.dim}${'─'.repeat(60)}${c.reset}`);

        const displayLimit = Math.min(schoolsWithBoth.length, 20);
        for (let i = 0; i < displayLimit; i++) {
            const s = schoolsWithBoth[i];
            const num = `${c.cyan}${String(i + 1).padStart(4)}${c.reset}`;
            const name = s.name.length > 44 ? s.name.substring(0, 41) + '...' : s.name.padEnd(45);
            const count = `${c.bold}${s._count.faculties}${c.reset}`;
            console.log(`  ${num}  ${name} ${count}`);
        }
        if (schoolsWithBoth.length > 20) {
            console.log(`  ${c.dim}... and ${schoolsWithBoth.length - 20} more${c.reset}`);
        }

        console.log('');
        const schoolChoice = await ask(`Select school (1-${schoolsWithBoth.length})`, '1');
        const schoolIndex = parseInt(schoolChoice, 10) - 1;

        if (schoolIndex < 0 || schoolIndex >= schoolsWithBoth.length) {
            throw new Error('Invalid school selection.');
        }

        const chosenSchool = schoolsWithBoth[schoolIndex];
        const headmaster = chosenSchool.faculties.find(f => f.user.role === UserRole.HEADMASTER)!;
        const teacher = chosenSchool.faculties.find(
            f => f.user.role === UserRole.TEACHER && f.user.is_center_superintendent === false
        )!;

        console.log(`\n  ${c.green}→ School: ${c.bold}${chosenSchool.name}${c.reset}`);
        label('  Headmaster', `${headmaster.user.name} (${headmaster.user.email})`);
        label('  Teacher (for override)', `${teacher.user.name} (${teacher.user.email})`);
        divider();

        // ══════════════════════════════════════════════════════════
        // STEP 2: Create Exam Center
        // ══════════════════════════════════════════════════════════
        sectionHeader(2, 'CREATE EXAM CENTER');

        console.log(`  ${c.bold}Creating exam center for ${chosenSchool.name}...${c.reset}`);
        console.log(`  ${c.dim}Headmaster ${headmaster.user.name} should auto-become CS.${c.reset}\n`);

        infoMsg('Logging in as admin...');
        const adminToken = await loginAdmin();
        successMsg('Admin login successful');

        infoMsg('Creating exam center via API...');
        const created = await createExamCenter(adminToken, chosenSchool.id);
        createdCenterIds.push(created.data.id);
        successMsg(`Exam center created!`);
        label('  Exam Center ID', created.data.id);
        label('  Superintendent', `${created.data.superintendent.name} (${created.data.superintendent.email})`);

        // Verify DB state
        const hmDbState = await prisma.user.findUnique({
            where: { id: headmaster.user.id },
            select: { is_center_superintendent: true },
        });
        label('  DB is_center_superintendent', String(hmDbState?.is_center_superintendent));

        if (!hmDbState?.is_center_superintendent) {
            errorMsg('FAIL: Headmaster is_center_superintendent should be TRUE after creation!');
        } else {
            successMsg('DB state correct: HM is_center_superintendent = true');
        }

        // ══════════════════════════════════════════════════════════
        // STEP 3: Verify HM Can See QPT (via login API)
        // ══════════════════════════════════════════════════════════
        sectionHeader(3, 'VERIFY HEADMASTER ACCESS');

        console.log(`  ${c.bold}Logging in as ${headmaster.user.name} to check QPT visibility...${c.reset}\n`);

        const hmLogin = await loginUser(headmaster.user.phone, headmaster.user.email || undefined);
        if (!hmLogin) {
            errorMsg(`FAIL: Could not login as headmaster (${headmaster.user.email})`);
        } else {
            label('  Login success', 'YES');
            label('  is_center_superintendent', String(hmLogin.isCenterSuperintendent));

            if (hmLogin.isCenterSuperintendent) {
                successMsg(`HM ${headmaster.user.name} CAN see QPT tab ✓`);
            } else {
                errorMsg(`FAIL: HM ${headmaster.user.name} login returned is_center_superintendent=false!`);
            }
        }
        console.log('');

        // ══════════════════════════════════════════════════════════
        // STEP 4: Override CS → Assign Teacher
        // ══════════════════════════════════════════════════════════
        sectionHeader(4, 'OVERRIDE CS → ASSIGN TEACHER');

        console.log(`  ${c.bold}Reassigning CS from ${headmaster.user.name} → ${teacher.user.name}${c.reset}`);
        console.log(`  ${c.dim}Previous CS (HM) should lose access, new CS (Teacher) should gain it.${c.reset}\n`);

        infoMsg('Overriding superintendent via API...');
        const overridden = await overrideSuperintendent(adminToken, created.data.id, teacher.user.email!);
        successMsg('Override successful!');
        label('  New Superintendent', `${overridden.data.superintendent.name} (${overridden.data.superintendent.email})`);

        // Verify DB state for both users
        const [hmDbAfter, teacherDbAfter] = await Promise.all([
            prisma.user.findUnique({
                where: { id: headmaster.user.id },
                select: { is_center_superintendent: true },
            }),
            prisma.user.findUnique({
                where: { id: teacher.user.id },
                select: { is_center_superintendent: true },
            }),
        ]);

        label('  HM DB flag', String(hmDbAfter?.is_center_superintendent));
        label('  Teacher DB flag', String(teacherDbAfter?.is_center_superintendent));

        if (hmDbAfter?.is_center_superintendent === false && teacherDbAfter?.is_center_superintendent === true) {
            successMsg('DB state correct: HM lost flag, Teacher gained flag');
        } else {
            errorMsg('FAIL: DB state inconsistent after override!');
        }

        // ══════════════════════════════════════════════════════════
        // STEP 5: Verify NEW CS (Teacher) Can See QPT
        // ══════════════════════════════════════════════════════════
        sectionHeader(5, 'VERIFY NEW CS (TEACHER) ACCESS');

        console.log(`  ${c.bold}Logging in as ${teacher.user.name} to check QPT visibility...${c.reset}\n`);

        const teacherLogin = await loginUser(teacher.user.phone, teacher.user.email || undefined);
        if (!teacherLogin) {
            errorMsg(`FAIL: Could not login as teacher (${teacher.user.email})`);
        } else {
            label('  Login success', 'YES');
            label('  is_center_superintendent', String(teacherLogin.isCenterSuperintendent));

            if (teacherLogin.isCenterSuperintendent) {
                successMsg(`Teacher ${teacher.user.name} CAN see QPT tab ✓`);
            } else {
                errorMsg(`FAIL: Teacher ${teacher.user.name} login returned is_center_superintendent=false!`);
            }
        }
        console.log('');

        // ══════════════════════════════════════════════════════════
        // STEP 6: Verify PREVIOUS CS (HM) Lost Access
        // ══════════════════════════════════════════════════════════
        sectionHeader(6, 'VERIFY PREVIOUS CS LOST ACCESS');

        console.log(`  ${c.bold}Logging in as ${headmaster.user.name} again to verify access removed...${c.reset}\n`);

        const hmLoginAfter = await loginUser(headmaster.user.phone, headmaster.user.email || undefined);
        if (!hmLoginAfter) {
            errorMsg(`FAIL: Could not login as headmaster (${headmaster.user.email})`);
        } else {
            label('  Login success', 'YES');
            label('  is_center_superintendent', String(hmLoginAfter.isCenterSuperintendent));

            if (!hmLoginAfter.isCenterSuperintendent) {
                successMsg(`HM ${headmaster.user.name} CANNOT see QPT tab ✓ (access correctly revoked)`);
            } else {
                errorMsg(`FAIL: HM ${headmaster.user.name} still has is_center_superintendent=true after override!`);
            }
        }

        console.log('');
        divider();

        // ══════════════════════════════════════════════════════════
        // STEP 7: Bulk Stress Test
        // ══════════════════════════════════════════════════════════
        sectionHeader(7, 'BULK STRESS TEST');

        console.log(`  ${c.bold}Test multiple schools rapidly: create → verify → override → verify → cleanup${c.reset}`);
        console.log(`  ${c.dim}This tests for race conditions, data consistency, and API stability.${c.reset}\n`);

        // Find more eligible schools for bulk test (excluding the one we just used)
        const allEligibleSchools = await prisma.school.findMany({
            where: {
                examCenter: null,
                id: { not: chosenSchool.id },
                faculties: {
                    some: {
                        user: { role: UserRole.HEADMASTER, is_active: true },
                    },
                },
            },
            include: {
                faculties: {
                    include: {
                        user: {
                            select: { id: true, name: true, email: true, role: true, phone: true, is_center_superintendent: true },
                        },
                    },
                },
            },
            take: 100, // Limit to 100 for performance
        });

        const bulkCandidates = allEligibleSchools.filter(s =>
            s.faculties.some(f => f.user.role === UserRole.TEACHER && f.user.is_center_superintendent === false)
        );

        const maxBulk = Math.min(bulkCandidates.length, 50);
        label('Available schools for bulk test', String(bulkCandidates.length));

        const bulkCountStr = await ask(`How many schools to stress test? (1-${maxBulk})`, String(Math.min(5, maxBulk)));
        const bulkCount = Math.min(parseInt(bulkCountStr, 10) || 5, maxBulk);

        if (bulkCount <= 0) {
            warnMsg('Skipping bulk test.');
        } else {
            console.log(`\n  ${c.bgMagenta}${c.white}${c.bold} RUNNING ${bulkCount} ITERATIONS ${c.reset}\n`);

            let totalTests = 0;
            let totalPassed = 0;
            let totalFailed = 0;
            const failures: string[] = [];
            const bulkStart = Date.now();

            for (let i = 0; i < bulkCount; i++) {
                const school = bulkCandidates[i];
                const hm = school.faculties.find(f => f.user.role === UserRole.HEADMASTER)!;
                const tch = school.faculties.find(
                    f => f.user.role === UserRole.TEACHER && f.user.is_center_superintendent === false
                )!;

                const shortName = school.name.length > 35 ? school.name.substring(0, 32) + '...' : school.name;

                try {
                    // 1) Create exam center
                    const ecResult = await createExamCenter(adminToken, school.id);
                    createdCenterIds.push(ecResult.data.id);

                    // 2) Verify HM has CS flag via login
                    const hmResult = await loginUser(hm.user.phone, hm.user.email || undefined);
                    totalTests++;
                    if (hmResult?.isCenterSuperintendent) {
                        totalPassed++;
                    } else {
                        totalFailed++;
                        failures.push(`${shortName}: HM ${hm.user.name} — expected QPT access after creation`);
                    }

                    // 3) Override to teacher
                    await overrideSuperintendent(adminToken, ecResult.data.id, tch.user.email!);

                    // 4) Verify teacher has CS flag
                    const tchResult = await loginUser(tch.user.phone, tch.user.email || undefined);
                    totalTests++;
                    if (tchResult?.isCenterSuperintendent) {
                        totalPassed++;
                    } else {
                        totalFailed++;
                        failures.push(`${shortName}: Teacher ${tch.user.name} — expected QPT access after override`);
                    }

                    // 5) Verify HM lost CS flag
                    const hmAfter = await loginUser(hm.user.phone, hm.user.email || undefined);
                    totalTests++;
                    if (hmAfter && !hmAfter.isCenterSuperintendent) {
                        totalPassed++;
                    } else {
                        totalFailed++;
                        failures.push(`${shortName}: HM ${hm.user.name} — should have LOST QPT access after override`);
                    }
                } catch (err: any) {
                    totalTests++;
                    totalFailed++;
                    failures.push(`${shortName}: Error — ${err.message}`);
                }

                process.stdout.write(`\r  ${progressBar(i + 1, bulkCount)}`);
            }
            console.log('\n');

            const bulkDuration = Date.now() - bulkStart;

            // ── Results ──
            console.log(`  ${c.bgCyan}${c.white}${c.bold} BULK TEST RESULTS ${c.reset}\n`);
            label('Total assertions', String(totalTests));
            label('Passed', `${c.green}${totalPassed}${c.reset}`);
            label('Failed', totalFailed === 0 ? `${c.green}0${c.reset}` : `${c.red}${totalFailed}${c.reset}`);
            label('Duration', `${(bulkDuration / 1000).toFixed(1)}s`);
            label('Avg per school', `${(bulkDuration / bulkCount / 1000).toFixed(2)}s`);

            if (totalFailed === 0) {
                console.log('');
                successMsg(`ALL ${totalTests} assertions PASSED across ${bulkCount} schools ✓`);
            } else {
                console.log('');
                errorMsg(`${totalFailed} FAILURES:`);
                failures.forEach(f => console.log(`    ${c.red}•${c.reset} ${f}`));
            }
        }

        // ══════════════════════════════════════════════════════════
        // STEP 8: Cleanup
        // ══════════════════════════════════════════════════════════
        sectionHeader(8, 'CLEANUP');

        console.log(`  ${c.bold}${createdCenterIds.length} exam center(s) were created during this test.${c.reset}\n`);

        const shouldCleanup = await askConfirm('Delete all test exam centers?');

        if (shouldCleanup) {
            infoMsg(`Deleting ${createdCenterIds.length} exam centers...`);

            let deletedCount = 0;
            let deleteErrors = 0;

            for (let i = 0; i < createdCenterIds.length; i++) {
                try {
                    await deleteExamCenter(adminToken, createdCenterIds[i]);
                    deletedCount++;
                } catch (err: any) {
                    deleteErrors++;
                    if (deleteErrors <= 3) {
                        warnMsg(`Failed to delete ${createdCenterIds[i]}: ${err.message}`);
                    }
                }

                if ((i + 1) % 5 === 0 || i === createdCenterIds.length - 1) {
                    process.stdout.write(`\r  ${progressBar(i + 1, createdCenterIds.length)}`);
                }
            }
            console.log('');

            successMsg(`Deleted ${deletedCount}/${createdCenterIds.length} exam centers`);
            if (deleteErrors > 0) {
                warnMsg(`${deleteErrors} deletions failed`);
            }

            // Verify cleanup: all affected users should have is_center_superintendent = false
            const remainingCS = await prisma.user.count({
                where: {
                    is_center_superintendent: true,
                    // Only check users who were created by our test
                    // (others might legitimately be CS from before)
                },
            });
            label('Remaining CS users in DB', String(remainingCS));
        } else {
            warnMsg('Skipping cleanup. Test exam centers remain in the database.');
            console.log(`  ${c.dim}IDs: ${createdCenterIds.join(', ')}${c.reset}`);
        }

        // ══════════════════════════════════════════════════════════
        // Final Summary
        // ══════════════════════════════════════════════════════════
        console.log('');
        divider();
        banner('SIMULATION COMPLETE');

        console.log(`  ${c.bold}Summary:${c.reset}`);
        label('Manual test', 'Create → Verify HM → Override → Verify Teacher → Verify HM lost access');
        label('Bulk test', `${bulkCount || 0} schools tested`);
        label('Tests', 'Login-based is_center_superintendent flag verification');
        console.log('');

    } catch (err: any) {
        console.log('');
        errorMsg(`Fatal error: ${err.message}`);
        console.log(`  ${c.dim}${err.stack || ''}${c.reset}`);

        // Attempt cleanup on error
        if (createdCenterIds.length > 0) {
            console.log('');
            warnMsg(`Attempting cleanup of ${createdCenterIds.length} created exam center(s)...`);
            try {
                const adminToken = await loginAdmin();
                for (const id of createdCenterIds) {
                    try {
                        await deleteExamCenter(adminToken, id);
                    } catch { /* ignore cleanup errors */ }
                }
                successMsg('Cleanup completed');
            } catch {
                warnMsg('Cleanup failed — please manually remove test data');
                console.log(`  ${c.dim}IDs: ${createdCenterIds.join(', ')}${c.reset}`);
            }
        }
    } finally {
        rl.close();
        await prisma.$disconnect();
    }
}

main();
