# SMC Career Connect

Full-stack placement and career portal: React + Vite + Tailwind (frontend), Node.js + Express (backend), MySQL (database).

## Prerequisites

- Node.js 18+
- MySQL 8 (or MySQL Workbench)

## Database setup (MySQL Workbench)

1. Open MySQL Workbench and connect to your server.
2. **Run schema**: File → Open SQL Script → select `database/schema.sql` → Execute (lightning icon). This creates the database and tables.
3. **Run seed**: File → Open SQL Script → select `database/seed.sql` → Execute. This inserts sample companies, drives, and events.
4. **Seed admin + student (from terminal)**:
   ```bash
   cd server
   npm install
   npm run seed
   ```
   This creates:
   - **Admin**: username `admin`, password `admin123`
   - **Student**: Dept No `23/UCSA/101`, password (DOB) `25/02/2005`

## Environment variables

Create `server/.env`:

```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=smc_career_connect
JWT_SECRET=your-secret-key-change-in-production
ALLOWED_ORIGIN=http://localhost:3000
```

Optional for client: create `client/.env` and set `VITE_API_URL=` (leave empty when using Vite proxy to backend). In production, set `VITE_API_URL` to the deployed API base URL.

## Run the project

1. **Start backend**
   ```bash
   cd server
   npm install
   npm start
   ```
   Server runs at http://localhost:5000

2. **Start frontend** (new terminal)
   ```bash
   cd client
   npm install
   npm run dev
   ```
   App runs at http://localhost:3000 (proxies `/api` to backend).

3. Open http://localhost:3000 in the browser.
   - **Student**: Login with `23/UCSA/101` / `25/02/2005`
   - **Admin**: Login with `admin` / `admin123`

## Features

- **Student**: Dashboard, browse/apply to drives (with max 3 applications and eligibility rules), view applications, offers (download PDF, accept/reject), events (register/unregister), notifications.
- **Admin**: Dashboard, CRUD students/companies/drives/events, per-drive applications (filter, bulk status, export Excel, upload offer PDF for selected), event registrations export, broadcast notifications. Event reminder cron runs every 10 minutes (24h and 1h before event).

## Project structure

- `server/` – Express API, JWT auth, mysql2, multer (PDF), exceljs, node-cron
- `client/` – React, Vite, Tailwind, react-router-dom
- `database/` – schema.sql and seed.sql for MySQL Workbench
