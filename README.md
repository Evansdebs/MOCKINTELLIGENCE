# MOCK PERFORMANCE INTELLIGENCE
### Basic 9 Mock Examination Management & Performance Analytics System

Designed specifically for **Basic 9 / JHS 3 candidates preparing for the Basic Education Certificate Examination (BECE)** in Ghanaian schools.

---

## 🌟 Overview & Key Capabilities

1. **Sequential Mock Examination Management**:
   - Manage unlimited sequential mock examinations (Mock 1 through Mock 5, Pre-BECE).
   - Examination locking and unlocking workflows with administrative authorization.
   - Preserves complete historical integrity — never overwrites past mock results.

2. **Longitudinal "Mock Performance Intelligence" Engine**:
   - **Class Progression Trend**: Interactive multi-mock average trajectory.
   - **Pass Rate Trend**: Real-time tracking of cohorts meeting the passing threshold (≥50%).
   - **Subject Multi-Series Line Chart**: Compare performance across all core BECE subjects with individual toggle controls.
   - **Learners Progression**: Real-time breakdown of Improving, Declining, and Stable candidates.
   - **Performance Heatmap**: Color-coded score band matrix across all candidates and subjects.
   - **Candidate Head-to-Head Comparison**: Multi-select candidate benchmark tool.
   - **Evidence-Based Academic Alerts**: Automated detection of consecutive mock declines and persistent subject deficits.

3. **Spreadsheet Score Entry & Excel Bulk Ingestion**:
   - Live spreadsheet-style score grid with keyboard navigation and auto-save indicators.
   - Excel student and score import with pre-validation diagnostics (detecting unknown index numbers, duplicate records, out-of-bound marks, and missing values).
   - Score sheets and student rosters exportable to Excel (.xlsx).

4. **Candidate & Class Results**:
   - Official Basic 9 Mock Result Slips with school header, motto, marks, grades, remarks, and optional position ranking.
   - Printable result slips and PDF report exports with `jsPDF` and `jspdf-autotable`.
   - Class master results summary tables.

5. **Security & Role-Based Access Control**:
   - **ADMIN**: Full system control, examination creation/locking, settings, user management, audit logs.
   - **TEACHER**: Marks recording and Excel score imports for active examinations, subject diagnostics.
   - **MANAGEMENT / HEADTEACHER**: Read-only academic oversight, cohort analytics, and report generation.
   - Full immutable audit log tracking score corrections, user logins, and examination locking actions.

---

## 🚀 Quick Start Guide

### 1. Active Workspace Recommendation
Open this directory in your IDE:
```text
C:\Users\hp\.gemini\antigravity-ide\scratch\mock-performance-intelligence
```

### 2. Services Already Running
- **Backend API Server**: [http://localhost:5000](http://localhost:5000) (Health check: [http://localhost:5000/health](http://localhost:5000/health))
- **Frontend Web Application**: [http://localhost:5173](http://localhost:5173)

### 3. Demo Login Credentials
For rapid demonstration and testing, use the pre-seeded accounts (or use the one-click demo role buttons on the login page):

| Role | Username | Password | Purpose |
| :--- | :--- | :--- | :--- |
| **Admin / Exam Officer** | `admin` | `Admin@123` | Full access, settings, locking, users, audit logs |
| **Teacher** | `teacher.evans` | `Teacher@123` | Score entry, Excel score import, subject trends |
| **Headteacher / Management** | `headteacher` | `Head@123` | Read-only analytics, cohort trends, report generation |

---

## 🛠️ Technology Stack

- **Frontend**: React 18+, TypeScript, Vite, Tailwind CSS, Recharts, Framer Motion, Lucide React, jsPDF, XLSX.
- **Backend**: Node.js, Express.js, TypeScript, Prisma ORM, SQLite (`file:./dev.db`), bcryptjs, jsonwebtoken, multer.
- **Database Architecture**: Relations across `User`, `SchoolSettings`, `Student`, `Subject`, `Examination`, `ExaminationSubject`, `Score`, `GradeScale`, `AuditLog`, and `Notification`.

---

## 🧪 Verification Tests
Run the built-in system verification suite:
```powershell
npx tsx server/src/tests/system.test.ts
```
Results: **20/20 Test Assertions Passed** (Grading engine, trend engine, multi-mock relational integrity, analytics services).
