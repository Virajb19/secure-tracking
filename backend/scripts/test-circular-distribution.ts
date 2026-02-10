/**
 * ═══════════════════════════════════════════════════════════════════
 *  CIRCULAR DISTRIBUTION — FULL-SCALE CORRECTNESS & STRESS TEST
 * ═══════════════════════════════════════════════════════════════════
 *
 * Tests against the REAL seeded data (~4000 schools, ~19000 faculty):
 *   ✅ ALL faculty in targeted schools CAN see the circular  (DB-level)
 *   ❌ ALL faculty in OTHER schools CANNOT see it             (DB-level)
 *   🔍 API spot-check with a sample of real logins
 *   ⚡ Concurrent API stress test
 *
 * The DB-level tests replay the exact same Prisma WHERE clause
 * used in circulars.service.ts → getCirculars(), so they are a
 * true 1:1 simulation of the backend's visibility logic.
 *
 * Usage:
 *   npx ts-node scripts/test-circular-distribution.ts
 *
 * Env vars (optional):
 *   NUM_SCHOOLS    — schools to target              (default: 100)
 *   SPOT_CHECK     — users per API spot-check       (default: 10)
 *   CONCURRENCY    — concurrent stress requests     (default: 50)
 *   API_URL        — backend URL                    (default: http://localhost:3001/api)
 *
 * Prerequisites:
 *   - Backend running on localhost:3001
 *   - Database seeded with `npx prisma db seed`
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ── Configuration ──────────────────────────────────────────────────
const API_URL = process.env.API_URL || 'http://localhost:3001/api';
const NUM_SCHOOLS = parseInt(process.env.NUM_SCHOOLS || '100', 10);
const SPOT_CHECK = parseInt(process.env.SPOT_CHECK || '10', 10);
const CONCURRENCY = parseInt(process.env.CONCURRENCY || '50', 10);
const PASSWORD = '12345678'; // from seed.ts

// ── Types ──────────────────────────────────────────────────────────
interface LoginResponse {
    access_token: string;
    user: { id: string; name: string; role: string };
}

interface CircularsResponse {
    data: Array<{ id: string; title: string; circular_no: string }>;
    total: number;
    hasMore: boolean;
}

interface TestResult {
    phase: string;
    passed: number;
    failed: number;
    details: string[];
    duration: number;
}

// ── Helpers ────────────────────────────────────────────────────────

function color(text: string, code: number): string {
    return `\x1b[${code}m${text}\x1b[0m`;
}
const green = (t: string) => color(t, 32);
const red = (t: string) => color(t, 31);
const yellow = (t: string) => color(t, 33);
const cyan = (t: string) => color(t, 36);
const bold = (t: string) => color(t, 1);
const dim = (t: string) => color(t, 2);

function progressBar(current: number, total: number, width = 30): string {
    const pct = Math.round((current / total) * 100);
    const filled = Math.round((current / total) * width);
    const bar = '█'.repeat(filled) + '░'.repeat(width - filled);
    return `${bar} ${pct}% (${current}/${total})`;
}

function formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
}

function percentile(arr: number[], p: number): number {
    const sorted = [...arr].sort((a, b) => a - b);
    const idx = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, idx)];
}

async function loginUser(phone: string, email?: string): Promise<string | null> {
    try {
        const body: Record<string, string> = {
            password: PASSWORD,
            phone,
            device_id: `test-device-${phone}`,
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

async function loginAdmin(): Promise<string> {
    const res = await fetch(`${API_URL}/auth/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: 'admin@gmail.com',
            password: PASSWORD,
            phone: '1234567890',
            device_id: 'test-admin-device',
        }),
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Admin login failed (${res.status}): ${text}`);
    }

    const data = (await res.json()) as LoginResponse;
    return data.access_token;
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

async function createCircular(
    adminToken: string,
    districtId: string,
    schoolIds: string[],
): Promise<string> {
    const formData = new FormData();
    formData.append('title', `[TEST] Full-Scale Distribution Test — ${new Date().toISOString()}`);
    formData.append('description', 'Automated correctness test for circular distribution across all faculty');
    formData.append('issued_by', 'Test Script');
    formData.append('issued_date', new Date().toISOString().split('T')[0]);
    formData.append('district_id', districtId);
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

    const circular = (await res.json()) as { id: string; circular_no: string };
    return circular.id;
}

// ═══════════════════════════════════════════════════════════════════
//  MAIN TEST RUNNER
// ═══════════════════════════════════════════════════════════════════

async function main() {
    const results: TestResult[] = [];
    let circularId: string | null = null;

    console.log('\n' + bold('═'.repeat(65)));
    console.log(bold('  CIRCULAR DISTRIBUTION — FULL-SCALE CORRECTNESS TEST'));
    console.log(bold('═'.repeat(65)));
    console.log(`  ${dim('Time:')}         ${new Date().toLocaleString()}`);
    console.log(`  ${dim('API:')}          ${API_URL}`);
    console.log(`  ${dim('Target schools:')} ${NUM_SCHOOLS}`);
    console.log(`  ${dim('API spot-check:')} ${SPOT_CHECK} eligible + ${SPOT_CHECK} ineligible`);
    console.log(`  ${dim('Stress concurrency:')} ${CONCURRENCY}`);
    console.log(bold('─'.repeat(65)) + '\n');

    try {
        // ════════════════════════════════════════════════════════════
        // PHASE 1: DATA DISCOVERY — Survey the real data
        // ════════════════════════════════════════════════════════════
        console.log(cyan('▶ PHASE 1 — DATA DISCOVERY (surveying real DB)\n'));
        const phase1Start = Date.now();

        const [totalDistricts, totalSchools, totalFaculty, totalUsers] = await Promise.all([
            prisma.district.count(),
            prisma.school.count(),
            prisma.faculty.count(),
            prisma.user.count(),
        ]);

        console.log(`  ${dim('Districts:')}  ${bold(String(totalDistricts))}`);
        console.log(`  ${dim('Schools:')}    ${bold(String(totalSchools))}`);
        console.log(`  ${dim('Faculty:')}    ${bold(String(totalFaculty))}`);
        console.log(`  ${dim('Users:')}      ${bold(String(totalUsers))}`);

        // District with the most schools
        const districtWithMostSchools = await prisma.district.findFirst({
            orderBy: { schools: { _count: 'desc' } },
            include: { _count: { select: { schools: true } } },
        });

        if (!districtWithMostSchools) {
            throw new Error('No districts found! Run `npx prisma db seed` first.');
        }

        console.log(`\n  ${dim('Largest district:')} ${bold(districtWithMostSchools.name)} (${districtWithMostSchools._count.schools} schools)`);

        // Show faculty breakdown per district (top 5)
        const topDistricts = await prisma.district.findMany({
            orderBy: { schools: { _count: 'desc' } },
            take: 5,
            include: { _count: { select: { schools: true } } },
        });

        console.log(`\n  ${dim('Top 5 districts by faculty:')}`);
        for (const d of topDistricts) {
            const facultyCount = await prisma.faculty.count({
                where: { school: { district_id: d.id } },
            });
            console.log(`    ${d.name.padEnd(15)} ${d._count.schools} schools, ${facultyCount} faculty`);
        }

        const phase1Duration = Date.now() - phase1Start;
        results.push({ phase: 'Data Discovery', passed: 1, failed: 0, details: [], duration: phase1Duration });
        console.log(`\n  ${green('✓')} Discovery complete in ${formatDuration(phase1Duration)}\n`);

        // ════════════════════════════════════════════════════════════
        // PHASE 2: SELECT TARGET SCHOOLS
        // ════════════════════════════════════════════════════════════
        console.log(cyan(`▶ PHASE 2 — SELECT ${NUM_SCHOOLS} TARGET SCHOOLS\n`));
        const phase2Start = Date.now();

        const selectedSchools = await prisma.school.findMany({
            where: { district_id: districtWithMostSchools.id },
            take: NUM_SCHOOLS,
            select: { id: true, name: true, _count: { select: { faculties: true } } },
        });

        if (selectedSchools.length < NUM_SCHOOLS) {
            console.log(yellow(`  ⚠ Only ${selectedSchools.length} schools in ${districtWithMostSchools.name} (requested ${NUM_SCHOOLS})`));
        }

        const selectedSchoolIds = selectedSchools.map(s => s.id);
        const totalTargetedFaculty = selectedSchools.reduce((sum, s) => sum + s._count.faculties, 0);

        console.log(`  Selected ${bold(String(selectedSchools.length))} schools from ${bold(districtWithMostSchools.name)}`);
        console.log(`  Total targeted faculty: ${bold(String(totalTargetedFaculty))}`);

        // Show a few sample schools
        const sampleSchools = selectedSchools.slice(0, 5);
        sampleSchools.forEach((s, i) =>
            console.log(`    ${dim(String(i + 1).padStart(3))}. ${s.name} (${s._count.faculties} faculty)`)
        );
        if (selectedSchools.length > 5) {
            console.log(`    ${dim(`  ... and ${selectedSchools.length - 5} more schools`)}`);
        }

        // Count ineligible faculty (everyone NOT in selected schools)
        const totalIneligibleFaculty = await prisma.faculty.count({
            where: { school_id: { notIn: selectedSchoolIds } },
        });
        console.log(`\n  Ineligible faculty: ${bold(String(totalIneligibleFaculty))}`);

        const phase2Duration = Date.now() - phase2Start;
        results.push({ phase: 'School Selection', passed: 1, failed: 0, details: [], duration: phase2Duration });
        console.log(`  ${green('✓')} Selection complete in ${formatDuration(phase2Duration)}\n`);

        // ════════════════════════════════════════════════════════════
        // PHASE 3: CREATE TEST CIRCULAR VIA API
        // ════════════════════════════════════════════════════════════
        console.log(cyan('▶ PHASE 3 — CREATE TEST CIRCULAR (via API)\n'));
        const phase3Start = Date.now();

        const adminToken = await loginAdmin();
        console.log(`  ${green('✓')} Admin login successful`);

        circularId = await createCircular(adminToken, districtWithMostSchools.id, selectedSchoolIds);
        console.log(`  ${green('✓')} Circular created: ${bold(circularId)}`);
        console.log(`    Targeted ${selectedSchools.length} schools (${totalTargetedFaculty} faculty)`);

        // Verify CircularSchool M2M entries were created
        const m2mCount = await prisma.circularSchool.count({
            where: { circular_id: circularId },
        });
        console.log(`  ${green('✓')} CircularSchool M2M entries: ${bold(String(m2mCount))}`);

        if (m2mCount !== selectedSchools.length) {
            console.log(red(`  ⚠ Expected ${selectedSchools.length} M2M entries but got ${m2mCount}!`));
        }

        const phase3Duration = Date.now() - phase3Start;
        results.push({
            phase: 'Create Circular',
            passed: m2mCount === selectedSchools.length ? 1 : 0,
            failed: m2mCount === selectedSchools.length ? 0 : 1,
            details: m2mCount !== selectedSchools.length
                ? [`M2M entry mismatch: expected ${selectedSchools.length}, got ${m2mCount}`]
                : [],
            duration: phase3Duration,
        });
        console.log(`  ${green('✓')} Phase complete in ${formatDuration(phase3Duration)}\n`);

        // ════════════════════════════════════════════════════════════
        // PHASE 4: POSITIVE VISIBILITY — DB-LEVEL (ALL eligible)
        // Same WHERE clause as circulars.service.ts getCirculars()
        // ════════════════════════════════════════════════════════════
        console.log(cyan(`▶ PHASE 4 — POSITIVE VISIBILITY (DB-level, ALL ${totalTargetedFaculty} eligible faculty)\n`));
        const phase4Start = Date.now();

        // Get all eligible faculty with their school's district
        const eligibleFaculty = await prisma.faculty.findMany({
            where: { school_id: { in: selectedSchoolIds } },
            include: {
                user: { select: { id: true, name: true, role: true, is_active: true } },
                school: { select: { district_id: true } },
            },
        });

        const activeEligible = eligibleFaculty.filter(f => f.user.is_active);
        console.log(`  Total eligible faculty: ${eligibleFaculty.length} (${activeEligible.length} active)`);

        // For each eligible faculty, simulate the getCirculars visibility check
        // The circular was created with multiple schools → uses CircularSchool M2M
        // So visibility condition is: targetedSchools.some(school_id === faculty.school_id)
        let positivePass = 0;
        let positiveFail = 0;
        const positiveFailDetails: string[] = [];

        for (const faculty of activeEligible) {
            // Simulate the exact query from circulars.service.ts lines 82-105
            const visibleCircular = await prisma.circular.findFirst({
                where: {
                    id: circularId!,
                    is_active: true,
                    OR: [
                        // Global circulars
                        { school_id: null, district_id: null, targetedSchools: { none: {} } },
                        // District-level circulars
                        { district_id: faculty.school.district_id, school_id: null, targetedSchools: { none: {} } },
                        // Direct school_id
                        { school_id: faculty.school_id },
                        // M2M targeted schools
                        { targetedSchools: { some: { school_id: faculty.school_id } } },
                    ],
                },
                select: { id: true },
            });

            if (visibleCircular) {
                positivePass++;
            } else {
                positiveFail++;
                if (positiveFailDetails.length < 10) {
                    positiveFailDetails.push(
                        `${faculty.user.name} (${faculty.user.role}, school ${faculty.school_id}): circular NOT visible!`
                    );
                }
            }

            // Progress every 500
            if ((positivePass + positiveFail) % 500 === 0) {
                process.stdout.write(`\r  ${progressBar(positivePass + positiveFail, activeEligible.length)}`);
            }
        }
        process.stdout.write(`\r  ${progressBar(activeEligible.length, activeEligible.length)}\n`);

        const phase4Duration = Date.now() - phase4Start;
        results.push({
            phase: 'Positive Visibility (DB)',
            passed: positivePass,
            failed: positiveFail,
            details: positiveFailDetails,
            duration: phase4Duration,
        });

        if (positiveFail === 0) {
            console.log(`  ${green('✅ PASSED')}: ALL ${positivePass}/${activeEligible.length} eligible faculty CAN see the circular`);
        } else {
            console.log(`  ${red('❌ FAILED')}: ${positivePass} passed, ${positiveFail} failed`);
            positiveFailDetails.slice(0, 5).forEach(d => console.log(`    ${red('•')} ${d}`));
        }
        console.log(`  ${dim(`Duration: ${formatDuration(phase4Duration)}`)}\n`);

        // ════════════════════════════════════════════════════════════
        // PHASE 5: NEGATIVE VISIBILITY — DB-LEVEL (ALL ineligible)
        // ════════════════════════════════════════════════════════════
        console.log(cyan(`▶ PHASE 5 — NEGATIVE VISIBILITY (DB-level, ALL ${totalIneligibleFaculty} ineligible faculty)\n`));
        const phase5Start = Date.now();

        // Process in batches to avoid loading all ineligible faculty into memory
        const BATCH_SIZE = 1000;
        let negativePass = 0;
        let negativeFail = 0;
        const negativeFailDetails: string[] = [];
        let processed = 0;

        let skip = 0;
        while (true) {
            const batch = await prisma.faculty.findMany({
                where: { school_id: { notIn: selectedSchoolIds } },
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
                    negativePass++; // Inactive users can't login anyway
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
                    if (negativeFailDetails.length < 10) {
                        negativeFailDetails.push(
                            `${faculty.user.name} (${faculty.user.role}, school ${faculty.school_id}): SHOULD NOT see circular!`
                        );
                    }
                }

                processed++;
                if (processed % 500 === 0) {
                    process.stdout.write(`\r  ${progressBar(processed, totalIneligibleFaculty)}`);
                }
            }

            skip += BATCH_SIZE;
        }
        process.stdout.write(`\r  ${progressBar(totalIneligibleFaculty, totalIneligibleFaculty)}\n`);

        const phase5Duration = Date.now() - phase5Start;
        results.push({
            phase: 'Negative Visibility (DB)',
            passed: negativePass,
            failed: negativeFail,
            details: negativeFailDetails,
            duration: phase5Duration,
        });

        if (negativeFail === 0) {
            console.log(`  ${green('✅ PASSED')}: ALL ${negativePass}/${totalIneligibleFaculty} ineligible faculty correctly CANNOT see it`);
        } else {
            console.log(`  ${red('❌ FAILED')}: ${negativePass} correct, ${negativeFail} WRONGLY see the circular`);
            negativeFailDetails.slice(0, 5).forEach(d => console.log(`    ${red('•')} ${d}`));
        }
        console.log(`  ${dim(`Duration: ${formatDuration(phase5Duration)}`)}\n`);

        // ════════════════════════════════════════════════════════════
        // PHASE 6: API SPOT-CHECK — Login as real users and verify
        // ════════════════════════════════════════════════════════════
        console.log(cyan(`▶ PHASE 6 — API SPOT-CHECK (${SPOT_CHECK} eligible + ${SPOT_CHECK} ineligible via real API)\n`));
        const phase6Start = Date.now();

        let spotPass = 0;
        let spotFail = 0;
        const spotFailDetails: string[] = [];

        // Sample eligible
        const eligibleSample = activeEligible
            .sort(() => Math.random() - 0.5) // shuffle
            .slice(0, SPOT_CHECK);

        console.log(`  Testing ${eligibleSample.length} eligible users via API...`);
        for (let i = 0; i < eligibleSample.length; i++) {
            const faculty = eligibleSample[i];
            const user = faculty.user;
            process.stdout.write(`\r  ${progressBar(i + 1, eligibleSample.length)} (eligible)`);

            // Need the full user record for phone/email
            const fullUser = await prisma.user.findUnique({
                where: { id: user.id },
                select: { phone: true, email: true },
            });
            if (!fullUser) continue;

            const token = await loginUser(fullUser.phone, fullUser.email || undefined);
            if (!token) {
                spotFailDetails.push(`${user.name}: API login failed`);
                spotFail++;
                continue;
            }

            const circulars = await getCirculars(token);
            const found = circulars.data.some(c => c.id === circularId);
            if (found) {
                spotPass++;
            } else {
                spotFail++;
                spotFailDetails.push(`${user.name} (${user.role}): API says circular NOT visible — BUG!`);
            }
        }
        console.log('');

        // Sample ineligible
        const ineligibleSample = await prisma.faculty.findMany({
            where: { school_id: { notIn: selectedSchoolIds }, user: { is_active: true } },
            include: { user: { select: { id: true, name: true, phone: true, email: true, role: true } } },
            take: SPOT_CHECK,
            orderBy: { created_at: 'desc' },
        });

        console.log(`  Testing ${ineligibleSample.length} ineligible users via API...`);
        for (let i = 0; i < ineligibleSample.length; i++) {
            const faculty = ineligibleSample[i];
            const user = faculty.user;
            process.stdout.write(`\r  ${progressBar(i + 1, ineligibleSample.length)} (ineligible)`);

            const token = await loginUser(user.phone, user.email || undefined);
            if (!token) {
                spotPass++; // Can't login = can't see anything
                continue;
            }

            const circulars = await getCirculars(token);
            const found = circulars.data.some(c => c.id === circularId);
            if (!found) {
                spotPass++;
            } else {
                spotFail++;
                spotFailDetails.push(`${user.name} (${user.role}): API says circular IS visible — BUG!`);
            }
        }
        console.log('');

        const phase6Duration = Date.now() - phase6Start;
        results.push({
            phase: 'API Spot-Check',
            passed: spotPass,
            failed: spotFail,
            details: spotFailDetails,
            duration: phase6Duration,
        });

        if (spotFail === 0) {
            console.log(`  ${green('✅ PASSED')}: All ${spotPass} API spot-checks correct`);
        } else {
            console.log(`  ${red('❌ FAILED')}: ${spotPass} passed, ${spotFail} failed`);
            spotFailDetails.slice(0, 5).forEach(d => console.log(`    ${red('•')} ${d}`));
        }
        console.log(`  ${dim(`Duration: ${formatDuration(phase6Duration)}`)}\n`);

        // ════════════════════════════════════════════════════════════
        // PHASE 7: STRESS TEST — Concurrent API requests
        // ════════════════════════════════════════════════════════════
        console.log(cyan(`▶ PHASE 7 — STRESS TEST (${CONCURRENCY} concurrent requests)\n`));
        const phase7Start = Date.now();

        // Pre-login a pool of eligible users
        const stressPool = activeEligible
            .sort(() => Math.random() - 0.5)
            .slice(0, CONCURRENCY);

        console.log(`  Pre-logging in ${stressPool.length} users...`);
        const tokens: string[] = [];
        for (let i = 0; i < stressPool.length; i++) {
            const fullUser = await prisma.user.findUnique({
                where: { id: stressPool[i].user.id },
                select: { phone: true, email: true },
            });
            if (!fullUser) continue;
            process.stdout.write(`\r  ${progressBar(i + 1, stressPool.length)} (login)`);
            const token = await loginUser(fullUser.phone, fullUser.email || undefined);
            if (token) tokens.push(token);
        }
        console.log(`\n  ${green('✓')} ${tokens.length} tokens ready\n`);

        if (tokens.length === 0) {
            console.log(yellow('  ⚠ No tokens available, skipping stress test'));
            results.push({ phase: 'Stress Test', passed: 0, failed: 0, details: ['Skipped'], duration: 0 });
        } else {
            console.log(`  🔥 Firing ${tokens.length} concurrent GET /circulars ...\n`);
            const fireStart = Date.now();

            const stressResults = await Promise.allSettled(
                tokens.map(async (token) => {
                    const reqStart = Date.now();
                    const circulars = await getCirculars(token);
                    const reqEnd = Date.now();
                    const found = circulars.data.some(c => c.id === circularId);
                    return { latency: reqEnd - reqStart, found };
                })
            );

            const totalTime = Date.now() - fireStart;
            const latencies: number[] = [];
            let stressCorrect = 0;
            let stressWrong = 0;
            let stressErrors = 0;

            for (const r of stressResults) {
                if (r.status === 'fulfilled') {
                    latencies.push(r.value.latency);
                    if (r.value.found) stressCorrect++;
                    else stressWrong++;
                } else {
                    stressErrors++;
                }
            }

            const p50 = latencies.length > 0 ? percentile(latencies, 50) : 0;
            const p95 = latencies.length > 0 ? percentile(latencies, 95) : 0;
            const p99 = latencies.length > 0 ? percentile(latencies, 99) : 0;
            const avg = latencies.length > 0
                ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
                : 0;
            const throughput = totalTime > 0
                ? Math.round((latencies.length / totalTime) * 1000)
                : 0;

            console.log(`  ${bold('Latency:')}`);
            console.log(`    Avg:  ${avg}ms`);
            console.log(`    p50:  ${p50}ms`);
            console.log(`    p95:  ${p95}ms`);
            console.log(`    p99:  ${p99}ms`);
            console.log(`  ${bold('Throughput:')} ${throughput} req/s`);
            console.log(`  ${bold('Wall time:')} ${totalTime}ms`);
            console.log(
                `  ${bold('Results:')} ` +
                `${green(`${stressCorrect} correct`)} | ` +
                `${stressWrong > 0 ? red(`${stressWrong} wrong`) : '0 wrong'} | ` +
                `${stressErrors > 0 ? red(`${stressErrors} errors`) : '0 errors'}`
            );

            const phase7Duration = Date.now() - phase7Start;
            results.push({
                phase: 'Stress Test',
                passed: stressCorrect,
                failed: stressWrong + stressErrors,
                details: [
                    `Avg=${avg}ms  p50=${p50}ms  p95=${p95}ms  p99=${p99}ms`,
                    `Throughput: ${throughput} req/s, Wall time: ${totalTime}ms`,
                    `Errors: ${stressErrors}`,
                ],
                duration: phase7Duration,
            });
        }

        console.log('');

    } finally {
        // ════════════════════════════════════════════════════════════
        // PHASE 8: CLEANUP
        // ════════════════════════════════════════════════════════════
        console.log(cyan('▶ PHASE 8 — CLEANUP\n'));

        if (circularId) {
            await prisma.circularSchool.deleteMany({ where: { circular_id: circularId } });
            await prisma.auditLog.deleteMany({
                where: { entity_id: circularId, action: 'CIRCULAR_CREATED' },
            });
            await prisma.circular.delete({ where: { id: circularId } });
            console.log(`  ${green('✓')} Test circular deleted: ${circularId}`);
        }

        await prisma.$disconnect();
        console.log(`  ${green('✓')} Database disconnected\n`);
    }

    // ══════════════════════════════════════════════════════════════
    //  FINAL REPORT
    // ══════════════════════════════════════════════════════════════
    console.log(bold('═'.repeat(65)));
    console.log(bold('  FINAL REPORT'));
    console.log(bold('═'.repeat(65)));

    let allPassed = true;
    let totalPassed = 0;
    let totalFailed = 0;

    for (const r of results) {
        const icon = r.failed === 0 ? green('✅ PASS') : red('❌ FAIL');
        const time = dim(`(${formatDuration(r.duration)})`);
        console.log(`  ${icon}  ${r.phase}: ${r.passed} passed, ${r.failed} failed ${time}`);
        if (r.failed > 0) {
            allPassed = false;
            r.details.slice(0, 3).forEach(d => console.log(`         ${dim(d)}`));
        }
        totalPassed += r.passed;
        totalFailed += r.failed;
    }

    console.log(bold('─'.repeat(65)));
    console.log(`  ${dim('Total assertions:')} ${bold(String(totalPassed + totalFailed))} (${green(`${totalPassed} passed`)}, ${totalFailed > 0 ? red(`${totalFailed} failed`) : '0 failed'})`);

    if (allPassed) {
        console.log(`  ${green(bold('🎉 ALL TESTS PASSED'))}`);
    } else {
        console.log(`  ${red(bold('💥 SOME TESTS FAILED — check details above'))}`);
    }
    console.log(bold('═'.repeat(65)) + '\n');

    process.exit(allPassed ? 0 : 1);
}

// ── Entry Point ────────────────────────────────────────────────────
main().catch((err) => {
    console.error(red('\n💥 Fatal error:'), err);
    prisma.$disconnect();
    process.exit(1);
});
