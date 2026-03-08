import 'dotenv/config';
import bcrypt from 'bcrypt';
import pool from './pool.js';

async function run() {
  const dobHash = await bcrypt.hash('25/02/2005', 10);
  const adminHash = await bcrypt.hash('admin123', 10);

  try {
    await pool.query(
      `INSERT INTO admins (username, password_hash, role) VALUES (?, ?, 'ADMIN')
       ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)`,
      ['admin', adminHash]
    );
    await pool.query(
      `INSERT INTO admins (username, password_hash, role) VALUES (?, ?, 'PLACEMENT_OFFICER')
       ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)`,
      ['placement', adminHash]
    );
    await pool.query(
      `INSERT INTO students (deptNo, name, dob_hash, department, cgpa, email, phone)
       VALUES ('23/UCSA/101', 'Demo Student', ?, 'CSE', 8.50, 'demo.student@smc.edu', '9876543210')
       ON DUPLICATE KEY UPDATE dob_hash = VALUES(dob_hash)`,
      [dobHash]
    );
    await pool.query(
      `INSERT INTO companies (name, industry, contactPerson, contactEmail, contactPhone, jobDescription, salaryPackage)
       VALUES ('TechCorp Solutions', 'IT', 'John Doe', 'john@techcorp.com', '9876543210', 'Software Engineer role', '8 LPA')`
    );
    const [rows] = await pool.query('SELECT id FROM companies WHERE name = ? LIMIT 1', ['TechCorp Solutions']);
    const companyId = rows?.[0]?.id ?? 1;
    await pool.query(
      `INSERT INTO drives (companyId, role, ctc, eligibility, deadline, status, timelineStart, timelineEnd)
       VALUES (?, 'Software Engineer', '8 LPA', 'CGPA >= 7.5, CSE/IT', DATE_ADD(NOW(), INTERVAL 30 DAY), 'UPCOMING', DATE_ADD(NOW(), INTERVAL 25 DAY), DATE_ADD(NOW(), INTERVAL 35 DAY))
       ON DUPLICATE KEY UPDATE role = VALUES(role)`,
      [companyId]
    );
    console.log('Seed runner: admin (admin/admin123), student (23/UCSA/101 / 25/02/2005), 1 company, 1 drive ready.');
  } catch (e) {
    console.error('Seed runner error:', e.message);
  } finally {
    await pool.end();
  }
}

run();
