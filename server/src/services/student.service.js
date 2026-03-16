import pool from '../db/pool.js';
import * as applicationService from './application.service.js';

export async function getStudentById(id) {
  try {
    const [rows] = await pool.query(
      'SELECT id, deptNo, name, department, cgpa, email, phone, resume_path, createdAt FROM students WHERE id = ?',
      [id]
    );
    return rows[0] ? { ...rows[0], resume_path: rows[0].resume_path ?? null } : null;
  } catch (err) {
    if (err.code === 'ER_BAD_FIELD_ERROR' && err.message && err.message.includes('resume_path')) {
      const [rows] = await pool.query(
        'SELECT id, deptNo, name, department, cgpa, email, phone, createdAt FROM students WHERE id = ?',
        [id]
      );
      return rows[0] ? { ...rows[0], resume_path: null } : null;
    }
    throw err;
  }
}

export async function setStudentResume(studentId, resumePath) {
  const [r] = await pool.query('UPDATE students SET resume_path = ? WHERE id = ?', [resumePath, studentId]);
  return r.affectedRows > 0;
}

export async function clearStudentResume(studentId) {
  const [r] = await pool.query('UPDATE students SET resume_path = NULL WHERE id = ?', [studentId]);
  return r.affectedRows > 0;
}

export async function updateStudentProfile(studentId, data) {
  const fields = [];
  const values = [];
  ['name', 'department', 'cgpa', 'email', 'phone'].forEach((f) => {
    if (data[f] !== undefined) {
      fields.push(`${f} = ?`);
      values.push(f === 'cgpa' ? (data[f] === '' ? null : data[f]) : data[f]);
    }
  });
  if (fields.length === 0) return false;
  values.push(studentId);
  const [r] = await pool.query(`UPDATE students SET ${fields.join(', ')} WHERE id = ?`, values);
  return r.affectedRows > 0;
}

export async function getStudentAuthById(id) {
  const [rows] = await pool.query(
    'SELECT id, deptNo, dob_hash, password_hash FROM students WHERE id = ? AND deletedAt IS NULL',
    [id]
  );
  return rows[0] || null;
}

export async function updateStudentPasswordHash(id, newHash) {
  const [r] = await pool.query('UPDATE students SET password_hash = ? WHERE id = ?', [newHash, id]);
  return r.affectedRows > 0;
}

export async function getDrivesForStudent(studentId) {
  const [rows] = await pool.query(
    `SELECT d.id, d.role, d.ctc, d.eligibility, d.deadline, d.status, d.timelineStart, d.timelineEnd,
            c.name AS companyName, c.industry,
            (SELECT status FROM applications WHERE studentId = ? AND driveId = d.id) AS applicationStatus
     FROM drives d
     JOIN companies c ON c.id = d.companyId
     WHERE d.status IN ('UPCOMING', 'ONGOING')
     ORDER BY d.deadline ASC`,
    [studentId]
  );
  return rows;
}

export async function getApplications(studentId) {
  const [rows] = await pool.query(
    `SELECT a.id, a.status, a.appliedAt, a.updatedAt,
            d.role, d.ctc, d.deadline, d.status AS driveStatus,
            c.name AS companyName
     FROM applications a
     JOIN drives d ON d.id = a.driveId
     JOIN companies c ON c.id = d.companyId
     WHERE a.studentId = ?
     ORDER BY a.appliedAt DESC`,
    [studentId]
  );
  return rows;
}

export async function getOffers(studentId) {
  const [rows] = await pool.query(
    `SELECT o.id, o.offerPdfPath, o.offerDeadline, o.decision, o.decidedAt, o.createdAt,
            a.id AS applicationId, d.role, c.name AS companyName
     FROM offers o
     JOIN applications a ON a.id = o.applicationId
     JOIN drives d ON d.id = a.driveId
     JOIN companies c ON c.id = d.companyId
     WHERE a.studentId = ?
     ORDER BY o.createdAt DESC`,
    [studentId]
  );
  return rows;
}

export async function getEvents(studentId) {
  const [rows] = await pool.query(
    `SELECT e.id, e.type, e.title, e.startTime, e.endTime, e.location, e.description, e.driveId,
            (SELECT 1 FROM event_registrations WHERE eventId = e.id AND studentId = ?) AS registered
     FROM events e
     WHERE e.startTime >= NOW()
     ORDER BY e.startTime ASC`,
    [studentId]
  );
  return rows.map((r) => ({ ...r, registered: !!r.registered }));
}

export async function getNotifications(studentId, limit = 50) {
  const [rows] = await pool.query(
    'SELECT id, title, message, link, isRead, createdAt FROM notifications WHERE userType = ? AND userId = ? ORDER BY createdAt DESC LIMIT ?',
    ['STUDENT', studentId, limit]
  );
  return rows;
}

export async function getUnreadNotificationCount(studentId) {
  const [rows] = await pool.query(
    'SELECT COUNT(*) AS count FROM notifications WHERE userType = ? AND userId = ? AND isRead = 0',
    ['STUDENT', studentId]
  );
  return rows[0]?.count ?? 0;
}

export async function markNotificationRead(notificationId, studentId) {
  const [r] = await pool.query(
    'UPDATE notifications SET isRead = 1 WHERE id = ? AND userType = ? AND userId = ?',
    [notificationId, 'STUDENT', studentId]
  );
  return r.affectedRows > 0;
}

export async function getOfferByIdAndStudent(offerId, studentId) {
  const [rows] = await pool.query(
    `SELECT o.* FROM offers o
     JOIN applications a ON a.id = o.applicationId
     WHERE o.id = ? AND a.studentId = ?`,
    [offerId, studentId]
  );
  return rows[0];
}

export async function updateOfferDecision(offerId, decision) {
  const [r] = await pool.query(
    'UPDATE offers SET decision = ?, decidedAt = NOW() WHERE id = ? AND decision = ?',
    [decision, offerId, 'PENDING']
  );
  return r.affectedRows > 0;
}

export async function registerEvent(eventId, studentId) {
  // Only training events linked to a drive participate in attendance.
  const [events] = await pool.query(
    'SELECT id, type, driveId FROM events WHERE id = ? AND type = ? AND driveId IS NOT NULL',
    [eventId, 'TRAINING']
  );
  if (events.length) {
    await pool.query(
      'INSERT IGNORE INTO event_registrations (eventId, studentId, attendanceStatus) VALUES (?, ?, ?)',
      [eventId, studentId, 'ABSENT']
    );
  } else {
    await pool.query(
      'INSERT IGNORE INTO event_registrations (eventId, studentId) VALUES (?, ?)',
      [eventId, studentId]
    );
  }
}

export async function unregisterEvent(eventId, studentId) {
  const [r] = await pool.query('DELETE FROM event_registrations WHERE eventId = ? AND studentId = ?', [eventId, studentId]);
  return r.affectedRows > 0;
}
