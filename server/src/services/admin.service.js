import pool from '../db/pool.js';
import * as notificationService from '../utils/notifications.js';

export async function getDashboard() {
  const [
    [{ totalStudents }],
    [{ placed }],
    [{ pendingApps }],
    [{ upcomingDrives }],
    topCompanies,
    [{ expiringOffersCount }],
    [{ firstDriveIdWithPending }],
    [{ drivesClosingSoonCount }],
  ] = await Promise.all([
    pool.query('SELECT COUNT(*) AS totalStudents FROM students WHERE deletedAt IS NULL'),
    pool.query(
      `SELECT COUNT(DISTINCT a.studentId) AS placed FROM applications a WHERE a.status = 'SELECTED'`
    ),
    pool.query('SELECT COUNT(*) AS pendingApps FROM applications WHERE status IN (\'APPLIED\', \'SHORTLISTED\')'),
    pool.query('SELECT COUNT(*) AS upcomingDrives FROM drives WHERE deletedAt IS NULL AND status IN (\'UPCOMING\', \'ONGOING\') AND deadline >= NOW()'),
    pool.query(
      `SELECT c.name, COUNT(a.id) AS count FROM companies c
       LEFT JOIN drives d ON d.companyId = c.id AND d.deletedAt IS NULL
       LEFT JOIN applications a ON a.driveId = d.id AND a.status = 'SELECTED'
       WHERE c.deletedAt IS NULL
       GROUP BY c.id ORDER BY count DESC LIMIT 5`
    ),
    pool.query(
      `SELECT COUNT(*) AS expiringOffersCount FROM offers o
       WHERE o.decision = 'PENDING' AND o.offerDeadline BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 48 HOUR)`
    ),
    pool.query(
      `SELECT a.driveId AS firstDriveIdWithPending FROM applications a
       WHERE a.status IN ('APPLIED', 'SHORTLISTED') ORDER BY a.updatedAt DESC LIMIT 1`
    ),
    pool.query(
      `SELECT COUNT(*) AS drivesClosingSoonCount FROM drives
       WHERE deletedAt IS NULL AND status IN ('UPCOMING', 'ONGOING') AND deadline >= NOW() AND deadline <= DATE_ADD(NOW(), INTERVAL 7 DAY)`
    ),
  ]);
  const topCompaniesList = Array.isArray(topCompanies[0]) ? topCompanies[0] : (topCompanies[0] ? [topCompanies[0]] : []);
  return {
    totalStudents: totalStudents || 0,
    placed: placed || 0,
    pendingApplications: pendingApps || 0,
    upcomingDrives: upcomingDrives || 0,
    topCompanies: topCompaniesList,
    expiringOffersCount: expiringOffersCount || 0,
    firstDriveIdWithPending: firstDriveIdWithPending?.firstDriveIdWithPending ?? null,
    drivesClosingSoonCount: drivesClosingSoonCount || 0,
  };
}

function _studentsWhereClause(filters) {
  let sql = ' FROM students WHERE deletedAt IS NULL';
  const params = [];
  if (filters.department) {
    sql += ' AND department = ?';
    params.push(filters.department);
  }
  if (filters.search) {
    sql += ' AND (name LIKE ? OR deptNo LIKE ? OR email LIKE ?)';
    const s = `%${filters.search}%`;
    params.push(s, s, s);
  }
  return { sql, params };
}

export async function countStudents(filters = {}) {
  const { sql, params } = _studentsWhereClause(filters);
  const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total' + sql, params);
  return total ?? 0;
}

export async function listStudents(filters = {}) {
  const { sql, params } = _studentsWhereClause(filters);
  let q = `SELECT id, deptNo, name, department, cgpa, email, phone, createdAt ${sql} ORDER BY name ASC`;
  const p = [...params];
  if (filters.limit) {
    q += ' LIMIT ?';
    p.push(filters.limit);
  }
  if (filters.offset) {
    q += ' OFFSET ?';
    p.push(filters.offset);
  }
  const [rows] = await pool.query(q, p);
  return rows;
}

export async function getStudentById(id) {
  const [rows] = await pool.query(
    'SELECT id, deptNo, name, department, cgpa, email, phone, createdAt FROM students WHERE id = ? AND deletedAt IS NULL',
    [id]
  );
  return rows[0];
}

export async function createStudent(data) {
  const [r] = await pool.query(
    'INSERT INTO students (deptNo, name, dob_hash, department, cgpa, email, phone) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [data.deptNo, data.name, data.dob_hash, data.department, data.cgpa ?? null, data.email, data.phone ?? null]
  );
  return r.insertId;
}

export async function updateStudent(id, data) {
  const fields = [];
  const values = [];
  ['name', 'department', 'cgpa', 'email', 'phone'].forEach((f) => {
    if (data[f] !== undefined) {
      fields.push(`${f} = ?`);
      values.push(data[f]);
    }
  });
  if (fields.length === 0) return false;
  values.push(id);
  const [r] = await pool.query(`UPDATE students SET ${fields.join(', ')} WHERE id = ?`, values);
  return r.affectedRows > 0;
}

export async function deleteStudent(id, adminId = null) {
  const [r] = await pool.query(
    'UPDATE students SET deletedAt = NOW(), deletedBy = ? WHERE id = ? AND deletedAt IS NULL',
    [adminId ?? null, id]
  );
  return r.affectedRows > 0;
}

function _companiesWhereClause(filters) {
  let sql = ' FROM companies WHERE deletedAt IS NULL';
  const params = [];
  if (filters.search) {
    sql += ' AND (name LIKE ? OR industry LIKE ?)';
    const s = `%${filters.search}%`;
    params.push(s, s);
  }
  return { sql, params };
}

export async function countCompanies(filters = {}) {
  const { sql, params } = _companiesWhereClause(filters);
  const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total' + sql, params);
  return total ?? 0;
}

export async function listCompanies(filters = {}) {
  const { sql, params } = _companiesWhereClause(filters);
  let q = 'SELECT *' + sql + ' ORDER BY name ASC';
  const p = [...params];
  if (filters.limit) {
    q += ' LIMIT ?';
    p.push(filters.limit);
  }
  if (filters.offset) {
    q += ' OFFSET ?';
    p.push(filters.offset);
  }
  const [rows] = await pool.query(q, p);
  return rows;
}

export async function getCompanyById(id) {
  const [rows] = await pool.query('SELECT * FROM companies WHERE id = ? AND deletedAt IS NULL', [id]);
  return rows[0];
}

export async function createCompany(data) {
  const [r] = await pool.query(
    `INSERT INTO companies (name, industry, contactPerson, contactEmail, contactPhone, jobDescription, salaryPackage)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      data.name,
      data.industry ?? null,
      data.contactPerson ?? null,
      data.contactEmail ?? null,
      data.contactPhone ?? null,
      data.jobDescription ?? null,
      data.salaryPackage ?? null,
    ]
  );
  const companyId = r.insertId;
  await pool.query('INSERT INTO chat_rooms (companyId) VALUES (?)', [companyId]);
  return companyId;
}

export async function updateCompany(id, data) {
  const fields = [];
  const values = [];
  ['name', 'industry', 'contactPerson', 'contactEmail', 'contactPhone', 'jobDescription', 'salaryPackage'].forEach((f) => {
    if (data[f] !== undefined) {
      fields.push(`${f} = ?`);
      values.push(data[f]);
    }
  });
  if (fields.length === 0) return false;
  values.push(id);
  const [r] = await pool.query(`UPDATE companies SET ${fields.join(', ')} WHERE id = ?`, values);
  return r.affectedRows > 0;
}

export async function deleteCompany(id, adminId = null) {
  const [r] = await pool.query(
    'UPDATE companies SET deletedAt = NOW(), deletedBy = ? WHERE id = ? AND deletedAt IS NULL',
    [adminId ?? null, id]
  );
  return r.affectedRows > 0;
}

export async function listDrives(filters = {}) {
  let sql = `SELECT d.*, c.name AS companyName FROM drives d JOIN companies c ON c.id = d.companyId AND c.deletedAt IS NULL WHERE d.deletedAt IS NULL`;
  const params = [];
  if (filters.status) {
    sql += ' AND d.status = ?';
    params.push(filters.status);
  }
  sql += ' ORDER BY d.deadline DESC';
  const [rows] = await pool.query(sql, params);
  return rows;
}

export async function getDriveRounds(driveId) {
  const [rows] = await pool.query(
    'SELECT id, driveId, roundNumber, name, isFinal FROM drive_rounds WHERE driveId = ? ORDER BY roundNumber ASC',
    [driveId]
  );
  return rows;
}

export async function getDriveById(id) {
  const [rows] = await pool.query(
    'SELECT d.*, c.name AS companyName, c.industry FROM drives d JOIN companies c ON c.id = d.companyId AND c.deletedAt IS NULL WHERE d.id = ? AND d.deletedAt IS NULL',
    [id]
  );
  const drive = rows[0];
  if (drive) {
    try {
      drive.rounds = await getDriveRounds(id);
    } catch (_) {
      drive.rounds = [];
    }
  }
  return drive;
}

export async function createDriveRounds(driveId, rounds) {
  if (!rounds?.length) return;
  for (const r of rounds) {
    await pool.query(
      'INSERT INTO drive_rounds (driveId, roundNumber, name, isFinal) VALUES (?, ?, ?, ?)',
      [driveId, r.roundNumber, r.name || `Round ${r.roundNumber}`, r.isFinal ? 1 : 0]
    );
  }
}

export async function updateDriveRounds(driveId, rounds) {
  await pool.query('DELETE FROM drive_rounds WHERE driveId = ?', [driveId]);
  if (rounds?.length) await createDriveRounds(driveId, rounds);
}

export async function createDrive(data) {
  const [r] = await pool.query(
    `INSERT INTO drives (companyId, role, ctc, eligibility, deadline, status, timelineStart, timelineEnd, minCgpa)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.companyId,
      data.role,
      data.ctc ?? null,
      data.eligibility ?? null,
      data.deadline ?? null,
      data.status ?? 'UPCOMING',
      data.timelineStart ?? null,
      data.timelineEnd ?? null,
      data.minCgpa ?? null,
    ]
  );
  const driveId = r.insertId;
  try {
    if (data.rounds?.length) await createDriveRounds(driveId, data.rounds);
  } catch (_) {}
  return driveId;
}

export async function updateDrive(id, data) {
  const fields = [];
  const values = [];
  ['companyId', 'role', 'ctc', 'eligibility', 'deadline', 'status', 'timelineStart', 'timelineEnd', 'minCgpa'].forEach((f) => {
    if (data[f] !== undefined) {
      fields.push(`${f} = ?`);
      values.push(data[f]);
    }
  });
  if (fields.length > 0) {
    values.push(id);
    const [r] = await pool.query(`UPDATE drives SET ${fields.join(', ')} WHERE id = ?`, values);
    if (r.affectedRows === 0) return false;
  }
  try {
    if (data.rounds !== undefined) await updateDriveRounds(id, data.rounds || []);
  } catch (_) {}
  return true;
}

export async function deleteDrive(id, adminId = null) {
  const [r] = await pool.query(
    'UPDATE drives SET deletedAt = NOW(), deletedBy = ? WHERE id = ? AND deletedAt IS NULL',
    [adminId ?? null, id]
  );
  return r.affectedRows > 0;
}

export async function getDriveByIdWithEligibility(id) {
  try {
    const [rows] = await pool.query('SELECT id, minCgpa, eligibility FROM drives WHERE id = ?', [id]);
    return rows[0];
  } catch (err) {
    if (err.code === 'ER_BAD_FIELD_ERROR' && err.message?.includes('minCgpa')) {
      const [rows] = await pool.query('SELECT id, eligibility FROM drives WHERE id = ?', [id]);
      return rows[0] ? { ...rows[0], minCgpa: null } : null;
    }
    throw err;
  }
}

/** Returns { eligible: boolean, reason?: string } */
export async function checkEligible(studentId, driveId) {
  const [student] = await pool.query('SELECT cgpa, department FROM students WHERE id = ?', [studentId]);
  let drive;
  try {
    const [rows] = await pool.query('SELECT minCgpa, eligibility FROM drives WHERE id = ?', [driveId]);
    drive = rows;
  } catch (err) {
    if (err.code === 'ER_BAD_FIELD_ERROR' && err.message?.includes('minCgpa')) {
      const [rows] = await pool.query('SELECT eligibility FROM drives WHERE id = ?', [driveId]);
      drive = rows?.[0] ? [{ ...rows[0], minCgpa: null }] : [];
    } else throw err;
  }
  if (!student?.[0] || !drive?.[0]) return { eligible: false, reason: 'Student or drive not found' };
  const s = student[0];
  const d = drive[0];
  if (d.minCgpa != null) {
    const cgpa = s.cgpa != null ? parseFloat(s.cgpa) : null;
    if (cgpa == null || cgpa < parseFloat(d.minCgpa)) {
      return { eligible: false, reason: `Min CGPA ${d.minCgpa} required` };
    }
  }
  return { eligible: true };
}

export async function getDriveStudents(driveId, status) {
  let sql = `SELECT a.id AS applicationId, a.status, a.appliedAt, a.updatedAt, a.currentRoundNumber,
             s.id AS studentId, s.deptNo, s.name, s.department, s.cgpa, s.email, s.phone
             FROM applications a
             JOIN students s ON s.id = a.studentId
             WHERE a.driveId = ?`;
  const params = [driveId];
  if (status) {
    sql += ' AND a.status = ?';
    params.push(status);
  }
  sql += ' ORDER BY a.appliedAt DESC';
  const [rows] = await pool.query(sql, params);
  const driveElig = await getDriveByIdWithEligibility(driveId);
  const minCgpa = driveElig?.minCgpa != null ? parseFloat(driveElig.minCgpa) : null;
  let roundNames = {};
  try {
    const rounds = await getDriveRounds(driveId);
    rounds.forEach((r) => { roundNames[r.roundNumber] = r.name; });
  } catch (_) {}
  return rows.map((r) => {
    let eligible = null;
    if (minCgpa != null) {
      const cgpa = r.cgpa != null ? parseFloat(r.cgpa) : null;
      eligible = cgpa != null && cgpa >= minCgpa;
    }
    const currentRoundNumber = r.currentRoundNumber != null ? Number(r.currentRoundNumber) : null;
    const currentRoundName = currentRoundNumber != null ? (roundNames[currentRoundNumber] || `Round ${currentRoundNumber}`) : null;
    return { ...r, eligible, currentRoundNumber, currentRoundName };
  });
}

export async function listEvents(filters = {}) {
  let sql = 'SELECT e.*, d.role AS driveRole, c.name AS companyName FROM events e LEFT JOIN drives d ON d.id = e.driveId AND d.deletedAt IS NULL LEFT JOIN companies c ON c.id = d.companyId AND c.deletedAt IS NULL WHERE e.deletedAt IS NULL';
  const params = [];
  if (filters.type) {
    sql += ' AND e.type = ?';
    params.push(filters.type);
  }
  sql += ' ORDER BY e.startTime DESC';
  const [rows] = await pool.query(sql, params);
  return rows;
}

export async function getEventById(id) {
  const [rows] = await pool.query(
    'SELECT e.*, d.role AS driveRole, c.name AS companyName FROM events e LEFT JOIN drives d ON d.id = e.driveId LEFT JOIN companies c ON c.id = d.companyId WHERE e.id = ? AND e.deletedAt IS NULL',
    [id]
  );
  return rows[0];
}

export async function createEvent(data) {
  // Prevent events clashing at the exact same start time (ignores soft-deleted events)
  if (data.startTime) {
    const [existing] = await pool.query(
      'SELECT id FROM events WHERE deletedAt IS NULL AND startTime = ?',
      [data.startTime]
    );
    if (existing.length) {
      const err = new Error('Another event is already scheduled at this date and time. Please choose a different slot.');
      err.code = 'EVENT_TIME_CONFLICT';
      throw err;
    }
  }
  const [r] = await pool.query(
    `INSERT INTO events (type, driveId, title, startTime, endTime, location, description)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      data.type,
      data.driveId ?? null,
      data.title,
      data.startTime,
      data.endTime,
      data.location ?? null,
      data.description ?? null,
    ]
  );
  return r.insertId;
}

export async function updateEvent(id, data) {
  // Load current event to check for time clashes when updating
  const current = await getEventById(id);
  if (!current) return false;
  const nextStartTime = data.startTime ?? current.startTime;
  if (nextStartTime) {
    const [existing] = await pool.query(
      'SELECT id FROM events WHERE deletedAt IS NULL AND startTime = ? AND id <> ?',
      [nextStartTime, id]
    );
    if (existing.length) {
      const err = new Error('Another event is already scheduled at this date and time. Please choose a different slot.');
      err.code = 'EVENT_TIME_CONFLICT';
      throw err;
    }
  }
  const fields = [];
  const values = [];
  ['type', 'driveId', 'title', 'startTime', 'endTime', 'location', 'description'].forEach((f) => {
    if (data[f] !== undefined) {
      fields.push(`${f} = ?`);
      values.push(data[f]);
    }
  });
  if (fields.length === 0) return false;
  values.push(id);
  const [r] = await pool.query(`UPDATE events SET ${fields.join(', ')} WHERE id = ?`, values);
  return r.affectedRows > 0;
}

export async function deleteEvent(id, adminId = null) {
  const [r] = await pool.query(
    'UPDATE events SET deletedAt = NOW(), deletedBy = ? WHERE id = ? AND deletedAt IS NULL',
    [adminId ?? null, id]
  );
  return r.affectedRows > 0;
}

// ——— Recycle bin: list deleted ———
export async function listDeletedStudents() {
  const [rows] = await pool.query(
    'SELECT id, deptNo, name, department, email, deletedAt, deletedBy FROM students WHERE deletedAt IS NOT NULL ORDER BY deletedAt DESC'
  );
  return rows;
}

export async function listDeletedCompanies() {
  const [rows] = await pool.query(
    'SELECT id, name, industry, contactEmail, deletedAt, deletedBy FROM companies WHERE deletedAt IS NOT NULL ORDER BY deletedAt DESC'
  );
  return rows;
}

export async function listDeletedDrives() {
  const [rows] = await pool.query(
    `SELECT d.id, d.role, d.deadline, d.status, d.deletedAt, d.deletedBy, c.name AS companyName
     FROM drives d LEFT JOIN companies c ON c.id = d.companyId WHERE d.deletedAt IS NOT NULL ORDER BY d.deletedAt DESC`
  );
  return rows;
}

export async function listDeletedEvents() {
  const [rows] = await pool.query(
    `SELECT e.id, e.title, e.type, e.startTime, e.deletedAt, e.deletedBy, d.role AS driveRole, c.name AS companyName
     FROM events e LEFT JOIN drives d ON d.id = e.driveId LEFT JOIN companies c ON c.id = d.companyId
     WHERE e.deletedAt IS NOT NULL ORDER BY e.deletedAt DESC`
  );
  return rows;
}

// ——— Recycle bin: restore ———
export async function restoreStudent(id) {
  const [r] = await pool.query('UPDATE students SET deletedAt = NULL, deletedBy = NULL WHERE id = ? AND deletedAt IS NOT NULL', [id]);
  return r.affectedRows > 0;
}

export async function restoreCompany(id) {
  const [r] = await pool.query('UPDATE companies SET deletedAt = NULL, deletedBy = NULL WHERE id = ? AND deletedAt IS NOT NULL', [id]);
  return r.affectedRows > 0;
}

export async function restoreDrive(id) {
  const [r] = await pool.query('UPDATE drives SET deletedAt = NULL, deletedBy = NULL WHERE id = ? AND deletedAt IS NOT NULL', [id]);
  return r.affectedRows > 0;
}

export async function restoreEvent(id) {
  const [r] = await pool.query('UPDATE events SET deletedAt = NULL, deletedBy = NULL WHERE id = ? AND deletedAt IS NOT NULL', [id]);
  return r.affectedRows > 0;
}

// ——— Recycle bin: bulk soft delete ———
export async function bulkSoftDelete(entityType, ids, adminId) {
  if (!Array.isArray(ids) || ids.length === 0) return { deleted: 0, errors: [] };
  const errors = [];
  let deleted = 0;
  const table = { students: 'students', companies: 'companies', drives: 'drives', events: 'events' }[entityType];
  if (!table) return { deleted: 0, errors: [{ message: 'Invalid entityType' }] };
  for (const id of ids) {
    const numId = parseInt(id, 10);
    if (Number.isNaN(numId)) {
      errors.push({ id, message: 'Invalid id' });
      continue;
    }
    try {
      let ok = false;
      if (entityType === 'students') ok = await deleteStudent(numId, adminId);
      else if (entityType === 'companies') ok = await deleteCompany(numId, adminId);
      else if (entityType === 'drives') ok = await deleteDrive(numId, adminId);
      else if (entityType === 'events') ok = await deleteEvent(numId, adminId);
      if (ok) deleted++;
      else errors.push({ id: numId, message: 'Not found or already deleted' });
    } catch (err) {
      errors.push({ id: numId, message: err.message || 'Failed' });
    }
  }
  return { deleted, errors };
}

export async function getEventRegistrations(eventId) {
  const [rows] = await pool.query(
    `SELECT er.id, er.registeredAt, s.id AS studentId, s.deptNo, s.name, s.department, s.email
     FROM event_registrations er
     JOIN students s ON s.id = er.studentId
     WHERE er.eventId = ?
     ORDER BY er.registeredAt ASC`,
    [eventId]
  );
  return rows;
}

export async function getStudentIdsAll() {
  const [rows] = await pool.query('SELECT id FROM students WHERE deletedAt IS NULL');
  return rows.map((r) => r.id);
}

export async function getStudentIdsByDepartment(department) {
  const [rows] = await pool.query('SELECT id FROM students WHERE department = ? AND deletedAt IS NULL', [department]);
  return rows.map((r) => r.id);
}

export async function getStudentIdsByDrive(driveId) {
  const [rows] = await pool.query('SELECT studentId FROM applications WHERE driveId = ?', [driveId]);
  return rows.map((r) => r.studentId);
}

export async function getStudentIdsSelectedInDrive(driveId) {
  const [rows] = await pool.query('SELECT studentId FROM applications WHERE driveId = ? AND status = ?', [driveId, 'SELECTED']);
  return rows.map((r) => r.studentId);
}

// ——— Round decision (PASS/FAIL) ———
/** Returns { application, drive, companyName, role, currentRound, roundName, isFinal } or null */
export async function getApplicationWithRoundInfo(applicationId) {
  const [apps] = await pool.query(
    `SELECT a.id, a.studentId, a.driveId, a.status, a.currentRoundNumber, c.name AS companyName, d.role
     FROM applications a
     JOIN drives d ON d.id = a.driveId
     JOIN companies c ON c.id = d.companyId
     WHERE a.id = ?`,
    [applicationId]
  );
  const app = apps[0];
  if (!app) return null;
  const currentRoundNumber = app.currentRoundNumber != null ? Number(app.currentRoundNumber) : 1;
  let currentRound = null;
  try {
    const [rounds] = await pool.query(
      'SELECT id, roundNumber, name, isFinal FROM drive_rounds WHERE driveId = ? AND roundNumber = ?',
      [app.driveId, currentRoundNumber]
    );
    currentRound = rounds[0];
  } catch (_) {}
  return {
    application: app,
    companyName: app.companyName || 'Company',
    role: app.role || 'Role',
    currentRoundNumber,
    roundName: currentRound?.name || `Round ${currentRoundNumber}`,
    isFinal: !!currentRound?.isFinal,
    roundId: currentRound?.id,
  };
}

/** Process PASS or FAIL for an application's current round. Sends notifications. Returns { ok, error? } */
export async function processRoundDecision(applicationId, decision) {
  const info = await getApplicationWithRoundInfo(applicationId);
  if (!info) return { ok: false, error: 'Application not found' };
  const { application, companyName, role, currentRoundNumber, roundName, isFinal, roundId } = info;
  const studentId = application.studentId;
  const link = '/student/applications';

  if (decision === 'PASS') {
    if (roundId) {
      await pool.query(
        'UPDATE application_rounds SET status = ? WHERE applicationId = ? AND roundId = ?',
        ['QUALIFIED', applicationId, roundId]
      );
    }
    const treatAsFinal = isFinal || !roundId; // no rounds defined = single-round drive
    if (treatAsFinal) {
      await pool.query('UPDATE applications SET status = ? WHERE id = ?', ['SELECTED', applicationId]);
      await notificationService.notifyStudent(
        studentId,
        `You are placed – ${companyName}`,
        `Congratulations! You have been placed in ${companyName} – ${role}. CGC will coordinate with you for further steps.`,
        link
      );
    } else if (roundId) {
      const nextRound = currentRoundNumber + 1;
      await pool.query('UPDATE applications SET currentRoundNumber = ?, status = ? WHERE id = ?', [nextRound, 'SHORTLISTED', applicationId]);
      try {
        const [nextRounds] = await pool.query('SELECT id FROM drive_rounds WHERE driveId = ? AND roundNumber = ?', [application.driveId, nextRound]);
        if (nextRounds[0]) {
          await pool.query(
            'INSERT IGNORE INTO application_rounds (applicationId, roundId, status) VALUES (?, ?, ?)',
            [applicationId, nextRounds[0].id, 'PENDING']
          );
        }
      } catch (_) {}
      await notificationService.notifyStudent(
        studentId,
        `Selected for Round ${nextRound} – ${companyName}`,
        `You have been selected for Round ${nextRound} (${roundName}). Check your application for ${companyName} – ${role}.`,
        link
      );
    }
  } else {
    if (roundId) {
      await pool.query(
        'UPDATE application_rounds SET status = ? WHERE applicationId = ? AND roundId = ?',
        ['NOT_QUALIFIED', applicationId, roundId]
      );
    }
    await pool.query('UPDATE applications SET status = ? WHERE id = ?', ['REJECTED', applicationId]);
    await notificationService.notifyStudent(
      studentId,
      `Not selected for next round – ${companyName}`,
      `You have not been selected for the next round of ${companyName} – ${role} placement drive.`,
      link
    );
  }
  return { ok: true };
}

// ——— Audit log ———
export async function createAuditLog(actorType, actorId, action, metaJson = null) {
  await pool.query(
    'INSERT INTO audit_logs (actorType, actorId, action, metaJson) VALUES (?, ?, ?, ?)',
    [actorType, actorId, action, metaJson ? JSON.stringify(metaJson) : null]
  );
}

export async function getAuditLogs(filters = {}) {
  const where = [];
  const params = [];
  if (filters.actorType) { where.push('actorType = ?'); params.push(filters.actorType); }
  if (filters.actorId) { where.push('actorId = ?'); params.push(filters.actorId); }
  if (filters.action) { where.push('action LIKE ?'); params.push(`%${filters.action}%`); }
  if (filters.fromDate) { where.push('createdAt >= ?'); params.push(filters.fromDate); }
  const whereClause = where.length ? ' WHERE ' + where.join(' AND ') : '';
  const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM audit_logs' + whereClause, params);
  const limit = Math.min(Number(filters.limit) || 50, 200);
  const offset = Number(filters.offset) || 0;
  const [rows] = await pool.query(
    'SELECT id, actorType, actorId, action, metaJson, createdAt FROM audit_logs' + whereClause + ' ORDER BY createdAt DESC LIMIT ? OFFSET ?',
    [...params, limit, offset]
  );
  return {
    logs: rows.map((r) => ({ ...r, metaJson: r.metaJson ? (typeof r.metaJson === 'string' ? JSON.parse(r.metaJson) : r.metaJson) : null })),
    total: total ?? 0,
  };
}

// ——— Placement report ———
export async function getPlacementReport() {
  const [byDept] = await pool.query(
    `SELECT s.department, COUNT(DISTINCT CASE WHEN a.status = 'SELECTED' THEN a.studentId END) AS placed, COUNT(DISTINCT s.id) AS total
     FROM students s LEFT JOIN applications a ON a.studentId = s.id WHERE s.deletedAt IS NULL GROUP BY s.department ORDER BY s.department`
  );
  const [byCompany] = await pool.query(
    `SELECT c.name AS companyName, d.role, COUNT(a.id) AS selectedCount
     FROM drives d JOIN companies c ON c.id = d.companyId AND c.deletedAt IS NULL
     LEFT JOIN applications a ON a.driveId = d.id AND a.status = 'SELECTED'
     WHERE d.deletedAt IS NULL
     GROUP BY d.id ORDER BY selectedCount DESC`
  );
  const [[totals]] = await pool.query(
    `SELECT COUNT(DISTINCT s.id) AS totalStudents, COUNT(DISTINCT CASE WHEN a.status = 'SELECTED' THEN a.studentId END) AS placed
     FROM students s LEFT JOIN applications a ON a.studentId = s.id WHERE s.deletedAt IS NULL`
  );
  return { byDepartment: byDept, byCompany: byCompany, totals: totals || {} };
}

// ——— Expiring offers (deadline in next N hours) ———
export async function getExpiringOffers(hours = 48) {
  const [rows] = await pool.query(
    `SELECT o.id, o.applicationId, o.offerDeadline, o.decision,
             a.studentId, a.driveId, s.name AS studentName, s.deptNo, d.role AS driveRole, c.name AS companyName
     FROM offers o
     JOIN applications a ON a.id = o.applicationId
     JOIN students s ON s.id = a.studentId
     JOIN drives d ON d.id = a.driveId
     JOIN companies c ON c.id = d.companyId
     WHERE o.decision = 'PENDING' AND o.offerDeadline BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL ? HOUR)
     ORDER BY o.offerDeadline ASC`,
    [hours]
  );
  return rows;
}

// ——— Company notes ———
export async function getCompanyNotes(companyId) {
  const [rows] = await pool.query(
    'SELECT n.id, n.note, n.createdAt, a.username AS adminUsername FROM company_notes n JOIN admins a ON a.id = n.adminId WHERE n.companyId = ? ORDER BY n.createdAt DESC',
    [companyId]
  );
  return rows;
}

export async function addCompanyNote(companyId, adminId, note) {
  const [r] = await pool.query('INSERT INTO company_notes (companyId, adminId, note) VALUES (?, ?, ?)', [companyId, adminId, note]);
  return r.insertId;
}

// ——— Duplicate event (same type, title, location, description; new start/end = +1 day) ———
export async function duplicateEvent(eventId) {
  const event = await getEventById(eventId);
  if (!event) return null;
  const start = event.startTime ? new Date(event.startTime) : new Date();
  const end = event.endTime ? new Date(event.endTime) : new Date();
  const duration = end.getTime() - start.getTime();
  start.setDate(start.getDate() + 1);
  const endNew = new Date(start.getTime() + duration);
  return await createEvent({
    type: event.type,
    driveId: event.driveId,
    title: event.title + ' (Copy)',
    startTime: start.toISOString().slice(0, 19).replace('T', ' '),
    endTime: endNew.toISOString().slice(0, 19).replace('T', ' '),
    location: event.location,
    description: event.description,
  });
}

// ——— Student context (for side panel) ———
export async function getStudentWithContext(studentId) {
  const student = await getStudentById(studentId);
  if (!student) return null;
  const [applications] = await pool.query(
    `SELECT a.id, a.driveId, a.status, a.appliedAt, d.role, c.name AS companyName
     FROM applications a JOIN drives d ON d.id = a.driveId JOIN companies c ON c.id = d.companyId
     WHERE a.studentId = ? ORDER BY a.appliedAt DESC`,
    [studentId]
  );
  const [offers] = await pool.query(
    `SELECT o.id, o.offerDeadline, o.decision, o.offerPdfPath, a.driveId, d.role, c.name AS companyName
     FROM offers o JOIN applications a ON a.id = o.applicationId JOIN drives d ON d.id = a.driveId JOIN companies c ON c.id = d.companyId
     WHERE a.studentId = ? ORDER BY o.offerDeadline DESC`,
    [studentId]
  );
  return { student, applications, offers };
}

// ——— Bulk student import (rows: [{ deptNo, name, password, department, cgpa?, email, phone? }]) ———
export async function bulkImportStudents(rows) {
  const bcrypt = (await import('bcrypt')).default;
  const created = [];
  const errors = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const deptNo = row.deptNo?.toString().trim();
    const name = row.name?.toString().trim();
    const password = row.password?.toString().trim();
    const department = row.department?.toString().trim();
    const email = row.email?.toString().trim();
    if (!deptNo || !name || !password || !department || !email) {
      errors.push({ row: i + 1, message: 'Missing required: deptNo, name, password, department, email' });
      continue;
    }
    const [existing] = await pool.query('SELECT id FROM students WHERE deptNo = ?', [deptNo]);
    if (existing.length) {
      errors.push({ row: i + 1, message: 'Dept no already exists' });
      continue;
    }
    try {
      const dob_hash = await bcrypt.hash(password, 10);
      const id = await createStudent({
        deptNo,
        name,
        dob_hash,
        department,
        cgpa: row.cgpa != null && row.cgpa !== '' ? parseFloat(row.cgpa) : null,
        email,
        phone: row.phone != null && row.phone !== '' ? row.phone.toString().trim() : null,
      });
      created.push({ row: i + 1, id });
    } catch (err) {
      errors.push({ row: i + 1, message: err.message || 'Insert failed' });
    }
  }
  return { created: created.length, errors };
}

// ——— Admin profile ———
export async function getAdminById(id) {
  const [rows] = await pool.query('SELECT id, username FROM admins WHERE id = ?', [id]);
  return rows[0];
}

export async function updateAdminPassword(id, newPasswordHash) {
  const [r] = await pool.query('UPDATE admins SET password_hash = ? WHERE id = ?', [newPasswordHash, id]);
  return r.affectedRows > 0;
}

export async function resetStudentPassword(studentId, newPasswordHash) {
  const [r] = await pool.query('UPDATE students SET password_hash = ? WHERE id = ? AND deletedAt IS NULL', [newPasswordHash, studentId]);
  return r.affectedRows > 0;
}
