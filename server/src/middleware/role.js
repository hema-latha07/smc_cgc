export function requireAdmin(req, res, next) {
  const role = req.adminRole;
  if (role != null && role !== 'ADMIN' && role !== 'PLACEMENT_OFFICER') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}
