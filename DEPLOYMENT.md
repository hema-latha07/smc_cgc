# Deployment Guide – SMC Career Connect

This guide explains how to run the app in a **production-like** environment.

The project has two parts:
- `server/` – Node.js + Express API (MySQL).
- `client/` – React + Vite + Tailwind frontend.

---

## 1. Configure environment variables

In the `server/` folder, create a `.env` file based on `.env.example`:

```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=smc_career_connect
JWT_SECRET=your-strong-production-secret
ALLOWED_ORIGIN=https://your-frontend-domain.com
```

- `JWT_SECRET` **must** be a strong, unique secret in production.
- `ALLOWED_ORIGIN` should be the full origin (protocol + host + port) of the frontend.

For the frontend, you can optionally create `client/.env`:

```env
VITE_API_URL=https://your-api-domain.com
```

If `VITE_API_URL` is not set, the dev setup uses Vite’s proxy to `http://localhost:5000`.

---

## 2. Build and deploy the frontend

From the project root:

```bash
cd client
npm install
npm run build
```

This produces a static build in `client/dist/` that you can:
- Upload to any static host (Netlify, Vercel, S3/CloudFront, Nginx, etc.), or
- Serve behind a reverse proxy (e.g. Nginx → `client/dist`).

When hosting separately from the API, set `VITE_API_URL` to your API base URL (for example `https://api.example.com`) and rebuild.

---

## 3. Run the backend in production

From the project root:

```bash
cd server
npm install
NODE_ENV=production node src/server.js
```

The API listens on `PORT` (default **5000**). In production you will typically:
- Put a reverse proxy (Nginx, Caddy, etc.) in front of the Node server.
- Terminate HTTPS at the proxy and forward HTTP to Node.

Health check:
- The backend exposes `GET /api/health` which returns JSON like:
  ```json
  { "status": "ok", "db": "ok" }
  ```
  Use this for load-balancer health checks and monitoring.

---

## 4. Database (MySQL)

Make sure the MySQL database is created and migrations are applied:

1. Run `database/schema.sql` once to create all tables.
2. Apply migrations from `database/migrations/` in order:
   - `001_chat_tables.sql`
   - `002_student_resume.sql`
   - `003_admin_features.sql`
   - `004_multi_rounds.sql`
   - `005_soft_delete.sql`
   - `006_student_password_hash.sql`

For detailed MySQL Workbench steps, see `RUN_STEPS.md` and `database/DATABASE_WORKBENCH.md`.

---

## 5. Quick production checklist

- [ ] Backend running with `NODE_ENV=production`.
- [ ] `.env` configured with strong `JWT_SECRET` and correct DB credentials.
- [ ] `ALLOWED_ORIGIN` set to the deployed frontend origin.
- [ ] Frontend built with `npm run build` and deployed to a static host.
- [ ] Load balancer or uptime checker pointing to `GET /api/health`.
- [ ] All key flows tested end-to-end:
  - Student/admin login
  - Drives and applications (multi-rounds)
  - Resume upload (PDF only)
  - Notifications and chat
  - Recycle bin and placement report.

