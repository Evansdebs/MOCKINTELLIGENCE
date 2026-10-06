import { prisma } from '../prisma';
import { calculateGradeForScore, calculateLongTermTrend, determineChangeStatus } from '../utils/grading';
import { AnalyticsService } from '../services/analyticsService';

async function runTestSuite() {
  console.log('======================================================');
  console.log('   RUNNING BASIC 9 MOCK SYSTEM VERIFICATION TESTS    ');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}`);
      failed++;
    }
  }

  // TEST 1: Grade Scales and Calculations
  console.log('--- TEST GROUP 1: Grading Engine ---');
  const gradeScales = await prisma.gradeScale.findMany({ orderBy: { order: 'asc' } });
  assert(gradeScales.length >= 6, 'Grade scales populated in database');

  const g1 = calculateGradeForScore(85, 100, gradeScales as any);
  assert(g1.grade === 'A' && g1.percentage === 85, 'Score 85/100 maps to Grade A (85%)');

  const g2 = calculateGradeForScore(35, 100, gradeScales as any);
  assert(g2.grade === 'F' && g2.percentage === 35, 'Score 35/100 maps to Grade F (35%)');

  const g3 = calculateGradeForScore(null, 100, gradeScales as any);
  assert(g3.grade === null && g3.rawScore === null, 'Missing score (null) is treated as null, NOT zero');

  // TEST 2: Trend Calculations
  console.log('\n--- TEST GROUP 2: Trend Engine ---');
  assert(determineChangeStatus(5, 1.0) === 'Improving', '+5.0 delta is classified as Improving');
  assert(determineChangeStatus(-3.5, 1.0) === 'Declining', '-3.5 delta is classified as Declining');
  assert(determineChangeStatus(0.5, 1.0) === 'Stable', '+0.5 delta within threshold is classified as Stable');

  const improvingSeries = [45, 54, 62, 71, 80];
  assert(calculateLongTermTrend(improvingSeries, 1.0) === 'Improving', 'Series [45, 54, 62, 71, 80] classified as Improving');

  const decliningSeries = [80, 72, 65, 55, 48];
  assert(calculateLongTermTrend(decliningSeries, 1.0) === 'Declining', 'Series [80, 72, 65, 55, 48] classified as Declining');

  const fluctuatingSeries = [50, 72, 54, 76, 60];
  assert(calculateLongTermTrend(fluctuatingSeries, 1.0) === 'Fluctuating', 'Series [50, 72, 54, 76, 60] classified as Fluctuating');

  const shortSeries = [50, 65];
  assert(calculateLongTermTrend(shortSeries, 1.0) === 'Insufficient Data', 'Series with only 2 points classified as Insufficient Data');

  // TEST 3: Database Entities & Multi-mock Integrity
  console.log('\n--- TEST GROUP 3: Database & Mock Integrity ---');
  const examCount = await prisma.examination.count();
  assert(examCount >= 5, `Found ${examCount} sequential mock examinations`);

  const studentCount = await prisma.student.count();
  assert(studentCount >= 10, `Found ${studentCount} active registered Basic 9 candidates`);

  const subjectCount = await prisma.subject.count();
  assert(subjectCount >= 9, `Found ${subjectCount} curriculum subjects`);

  // TEST 4: Analytics Engine Calculations
  console.log('\n--- TEST GROUP 4: Analytics Services ---');
  const overview = await AnalyticsService.getOverviewKPIs();
  assert(overview.totalStudents > 0, `Overview reports ${overview.totalStudents} total students`);
  assert(overview.examTrends.length >= 5, `Calculated class trend points across ${overview.examTrends.length} mocks`);
  assert(overview.latestAverage > 0, `Computed latest class average: ${overview.latestAverage}%`);

  const subTrends = await AnalyticsService.getSubjectPerformanceAcrossMocks();
  assert(subTrends.trends.length >= 5, `Generated subject multi-series timeline for ${subTrends.trends.length} mocks`);

  const mockComp = await AnalyticsService.getMockToMockComparison();
  assert(mockComp.length >= 5, `Mock-to-mock comparison rows generated (${mockComp.length} rows)`);

  const weakAreas = await AnalyticsService.getWeakAreasAndAlerts();
  assert(Array.isArray(weakAreas.alerts), 'Performance alerts successfully evaluated from examination data');

  // Summary
  console.log('\n======================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================');

  await prisma.$disconnect();

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((e) => {
  console.error('Test execution error:', e);
  process.exit(1);
});
