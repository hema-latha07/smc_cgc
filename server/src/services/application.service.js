import pool from '../db/pool.js';

const APPLICATION_STATUSES = ['APPLIED', 'APPROVED', 'REJECTED', 'SHORTLISTED', 'SELECTED'];

export async function getApplicationCount(studentId) {
  const [[r]] = await pool.query('SELECT COUNT(*) AS c FROM applications WHERE studentId = ?', [studentId]);
  return r.c;
}

export async function getSelectedCount(studentId) {
  const [[r]] = await pool.query(
    'SELECT COUNT(*) AS c FROM applications WHERE studentId = ? AND status = ?',
    [studentId, 'SELECTED']
  );
  return r.c;
}

export async function getAcceptedOffersCount(studentId) {
  const [[r]] = await pool.query(
    `SELECT COUNT(*) AS c FROM offers o
     INNER JOIN applications a ON a.id = o.applicationId
     WHERE a.studentId = ? AND o.decision = 'ACCEPTED'`,
    [studentId]
  );
  return r.c;
}

/** Returns { allowed, reason } for applying to a new drive */
export async function canStudentApply(studentId) {
  const [appCount, selectedCount, acceptedCount] = await Promise.all([
    getApplicationCount(studentId),
    getSelectedCount(studentId),
    getAcceptedOffersCount(studentId),
  ]);
  if (acceptedCount >= 2) {
    return { allowed: false, reason: 'You have already accepted 2 offers. No further applications allowed.' };
  }
  if (appCount >= 2 && selectedCount >= 2) {
    return { allowed: false, reason: 'You are selected in 2 companies. No further applications allowed.' };
  }
  if (appCount >= 3) {
    return { allowed: false, reason: 'Maximum 3 applications allowed.' };
  }
  return { allowed: true };
}

export async function createApplication(studentId, driveId) {
  let applicationId;
  try {
    const [r] = await pool.query(
      'INSERT INTO applications (studentId, driveId, status, currentRoundNumber) VALUES (?, ?, ?, 1)',
      [studentId, driveId, 'APPLIED']
    );
    applicationId = r.insertId;
  } catch (err) {
    const [r] = await pool.query(
      'INSERT INTO applications (studentId, driveId, status) VALUES (?, ?, ?)',
      [studentId, driveId, 'APPLIED']
    );
    applicationId = r.insertId;
  }
  try {
    const [rounds] = await pool.query(
      'SELECT id FROM drive_rounds WHERE driveId = ? ORDER BY roundNumber ASC',
      [driveId]
    );
    for (const row of rounds) {
      await pool.query(
        'INSERT INTO application_rounds (applicationId, roundId, status) VALUES (?, ?, ?)',
        [applicationId, row.id, 'PENDING']
      );
    }
  } catch (_) {
    // drive_rounds table may not exist yet
  }
  return applicationId;
}

export async function getApplicationByStudentAndDrive(studentId, driveId) {
  const [rows] = await pool.query(
    'SELECT * FROM applications WHERE studentId = ? AND driveId = ?',
    [studentId, driveId]
  );
  return rows[0];
}

export async function updateApplicationStatus(applicationId, status) {
  if (!APPLICATION_STATUSES.includes(status)) return false;
  const [r] = await pool.query('UPDATE applications SET status = ? WHERE id = ?', [status, applicationId]);
  return r.affectedRows > 0;
}

export async function getApplicationById(id) {
  const [rows] = await pool.query('SELECT * FROM applications WHERE id = ?', [id]);
  return rows[0];
}
