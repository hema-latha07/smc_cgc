import pool from '../db/pool.js';

/** Students can access a room only if they have an active application (not rejected) for that company */
export async function getRoomIdsForStudent(studentId) {
  const [rows] = await pool.query(
    `SELECT DISTINCT cr.id AS roomId
     FROM chat_rooms cr
     INNER JOIN drives d ON d.companyId = cr.companyId
     INNER JOIN applications a ON a.driveId = d.id AND a.studentId = ? AND a.status IN ('APPLIED', 'SHORTLISTED', 'SELECTED')
     ORDER BY cr.id`,
    [studentId]
  );
  return rows.map((r) => r.roomId);
}

export async function getRoomsForStudent(studentId) {
  const roomIds = await getRoomIdsForStudent(studentId);
  if (!roomIds.length) return [];

  const placeholders = roomIds.map(() => '?').join(',');
  const [rooms] = await pool.query(
    `SELECT cr.id, cr.companyId, c.name AS companyName
     FROM chat_rooms cr
     INNER JOIN companies c ON c.id = cr.companyId
     WHERE cr.id IN (${placeholders})`,
    roomIds
  );

  const [lastMessages] = await pool.query(
    `SELECT m.roomId, m.id AS messageId, m.content, m.voiceNotePath, m.senderType, m.senderId, m.createdAt,
      COALESCE(s.name, a.username) AS senderName
     FROM chat_messages m
     INNER JOIN (
       SELECT roomId, MAX(id) AS maxId FROM chat_messages GROUP BY roomId
     ) t ON t.roomId = m.roomId AND t.maxId = m.id
     LEFT JOIN students s ON s.id = m.senderId AND m.senderType = 'STUDENT'
     LEFT JOIN admins a ON a.id = m.senderId AND m.senderType = 'ADMIN'
     WHERE m.roomId IN (${placeholders})`,
    roomIds
  );
  const lastByRoom = {};
  lastMessages.forEach((r) => { lastByRoom[r.roomId] = r; });

  const [lastSeen] = await pool.query(
    `SELECT roomId, lastSeenAt FROM chat_last_seen WHERE userType = 'STUDENT' AND userId = ? AND roomId IN (${placeholders})`,
    [studentId, ...roomIds]
  );
  const seenByRoom = {};
  lastSeen.forEach((r) => { seenByRoom[r.roomId] = r.lastSeenAt; });

  const [unreadCounts] = await pool.query(
    `SELECT m.roomId, COUNT(*) AS unread
     FROM chat_messages m
     WHERE m.roomId IN (${placeholders})
       AND (m.senderType != 'STUDENT' OR m.senderId != ?)
       AND m.createdAt > COALESCE((SELECT lastSeenAt FROM chat_last_seen WHERE userType = 'STUDENT' AND userId = ? AND roomId = m.roomId), '1970-01-01')
     GROUP BY m.roomId`,
    [...roomIds, studentId, studentId]
  );
  const unreadByRoom = {};
  unreadCounts.forEach((r) => { unreadByRoom[r.roomId] = r.unread; });

  return rooms.map((r) => ({
    id: r.id,
    companyId: r.companyId,
    companyName: r.companyName,
    lastMessage: lastByRoom[r.id] ? {
      id: lastByRoom[r.id].messageId,
      content: lastByRoom[r.id].content,
      voiceNotePath: lastByRoom[r.id].voiceNotePath,
      senderType: lastByRoom[r.id].senderType,
      senderName: lastByRoom[r.id].senderName || 'Admin',
      createdAt: lastByRoom[r.id].createdAt,
    } : null,
    lastSeenAt: seenByRoom[r.id] || null,
    unreadCount: unreadByRoom[r.id] || 0,
  }));
}

export async function getRoomsForAdmin(adminId) {
  const [rooms] = await pool.query(
    `SELECT cr.id, cr.companyId, c.name AS companyName
     FROM chat_rooms cr
     INNER JOIN companies c ON c.id = cr.companyId
     ORDER BY c.name`
  );

  const roomIds = rooms.map((r) => r.id);
  if (!roomIds.length) return [];

  const placeholders = roomIds.map(() => '?').join(',');
  const [lastMessages] = await pool.query(
    `SELECT m.roomId, m.id AS messageId, m.content, m.voiceNotePath, m.senderType, m.senderId, m.createdAt,
      COALESCE(s.name, ad.username) AS senderName
     FROM chat_messages m
     INNER JOIN (SELECT roomId, MAX(id) AS maxId FROM chat_messages GROUP BY roomId) t ON t.roomId = m.roomId AND t.maxId = m.id
     LEFT JOIN students s ON s.id = m.senderId AND m.senderType = 'STUDENT'
     LEFT JOIN admins ad ON ad.id = m.senderId AND m.senderType = 'ADMIN'
     WHERE m.roomId IN (${placeholders})`,
    roomIds
  );
  const lastByRoom = {};
  lastMessages.forEach((r) => { lastByRoom[r.roomId] = r; });

  const [lastSeen] = await pool.query(
    `SELECT roomId, lastSeenAt FROM chat_last_seen WHERE userType = 'ADMIN' AND userId = ? AND roomId IN (${placeholders})`,
    [adminId, ...roomIds]
  );
  const seenByRoom = {};
  lastSeen.forEach((r) => { seenByRoom[r.roomId] = r.lastSeenAt; });

  const [unreadCounts] = await pool.query(
    `SELECT m.roomId, COUNT(*) AS unread
     FROM chat_messages m
     WHERE m.roomId IN (${placeholders})
       AND (m.senderType != 'ADMIN' OR m.senderId != ?)
       AND m.createdAt > COALESCE((SELECT lastSeenAt FROM chat_last_seen WHERE userType = 'ADMIN' AND userId = ? AND roomId = m.roomId), '1970-01-01')
     GROUP BY m.roomId`,
    [...roomIds, adminId, adminId]
  );
  const unreadByRoom = {};
  unreadCounts.forEach((r) => { unreadByRoom[r.roomId] = r.unread; });

  return rooms.map((r) => ({
    id: r.id,
    companyId: r.companyId,
    companyName: r.companyName,
    lastMessage: lastByRoom[r.id] ? {
      id: lastByRoom[r.id].messageId,
      content: lastByRoom[r.id].content,
      voiceNotePath: lastByRoom[r.id].voiceNotePath,
      senderType: lastByRoom[r.id].senderType,
      senderName: lastByRoom[r.id].senderName,
      createdAt: lastByRoom[r.id].createdAt,
    } : null,
    lastSeenAt: seenByRoom[r.id] || null,
    unreadCount: unreadByRoom[r.id] || 0,
  }));
}

export async function getAdminUnreadTotal(adminId) {
  const [rows] = await pool.query(
    `SELECT SUM(cnt) AS total FROM (
      SELECT m.roomId, COUNT(*) AS cnt
      FROM chat_messages m
      WHERE (m.senderType != 'ADMIN' OR m.senderId != ?)
        AND m.createdAt > COALESCE((SELECT lastSeenAt FROM chat_last_seen WHERE userType = 'ADMIN' AND userId = ? AND roomId = m.roomId), '1970-01-01')
      GROUP BY m.roomId
    ) t`,
    [adminId, adminId]
  );
  return Number(rows[0]?.total ?? 0);
}

export async function getRoomById(roomId) {
  const [rows] = await pool.query(
    `SELECT cr.id, cr.companyId, c.name AS companyName
     FROM chat_rooms cr
     INNER JOIN companies c ON c.id = cr.companyId
     WHERE cr.id = ?`,
    [roomId]
  );
  return rows[0];
}

export async function studentCanAccessRoom(studentId, roomId) {
  const [rows] = await pool.query(
    `SELECT 1 FROM chat_rooms cr
     INNER JOIN drives d ON d.companyId = cr.companyId
     INNER JOIN applications a ON a.driveId = d.id AND a.studentId = ? AND a.status IN ('APPLIED', 'SHORTLISTED', 'SELECTED')
     WHERE cr.id = ?`,
    [studentId, roomId]
  );
  return rows.length > 0;
}

export async function getMessages(roomId, limit = 80, beforeId = null) {
  let sql = `SELECT m.id, m.roomId, m.senderType, m.senderId, m.content, m.voiceNotePath, m.createdAt,
    COALESCE(s.name, a.username) AS senderName
    FROM chat_messages m
    LEFT JOIN students s ON s.id = m.senderId AND m.senderType = 'STUDENT'
    LEFT JOIN admins a ON a.id = m.senderId AND m.senderType = 'ADMIN'
    WHERE m.roomId = ?`;
  const params = [roomId];
  if (beforeId) {
    sql += ' AND m.id < ?';
    params.push(beforeId);
  }
  sql += ' ORDER BY m.id DESC LIMIT ?';
  params.push(limit);
  const [rows] = await pool.query(sql, params);
  return rows.reverse();
}

export async function sendMessage(roomId, senderType, senderId, content, voiceNotePath = null) {
  const [r] = await pool.query(
    `INSERT INTO chat_messages (roomId, senderType, senderId, content, voiceNotePath) VALUES (?, ?, ?, ?, ?)`,
    [roomId, senderType, senderId, content || null, voiceNotePath || null]
  );
  return r.insertId;
}

export async function markSeen(roomId, userType, userId) {
  await pool.query(
    `INSERT INTO chat_last_seen (userType, userId, roomId, lastSeenAt) VALUES (?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE lastSeenAt = NOW()`,
    [userType, userId, roomId]
  );
}

/** Student IDs that have an active application (not rejected) for this room's company */
export async function getStudentIdsInRoom(roomId) {
  const [rows] = await pool.query(
    `SELECT DISTINCT a.studentId FROM applications a
     INNER JOIN drives d ON d.id = a.driveId
     INNER JOIN chat_rooms cr ON cr.companyId = d.companyId
     WHERE cr.id = ? AND a.status IN ('APPLIED', 'SHORTLISTED', 'SELECTED')`,
    [roomId]
  );
  return rows.map((r) => r.studentId);
}

export async function getRoomIdByCompanyId(companyId) {
  const [rows] = await pool.query('SELECT id FROM chat_rooms WHERE companyId = ?', [companyId]);
  return rows[0]?.id ?? null;
}
