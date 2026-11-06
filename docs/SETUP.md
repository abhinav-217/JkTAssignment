# Setup Guide

This project is a NestJS application with PostgreSQL and TypeORM.

## Prerequisites

- Node.js 20+
- npm
- PostgreSQL 14+
- A local database user with permissions to create databases and tables

## 1. Install dependencies

```bash
npm install
```

## 2. Create PostgreSQL database

Log in to PostgreSQL as a superuser:

```bash
psql -U postgres
```

Then run:

```sql
CREATE DATABASE document_management;
CREATE USER document_admin WITH PASSWORD 'your_local_password';
GRANT ALL PRIVILEGES ON DATABASE document_management TO document_admin;
```

You may also want to connect and configure ownership if needed:

```sql
\c document_management
GRANT ALL ON SCHEMA public TO document_admin;
```

## 3. Configure environment variables

Create a `.env` file in the project root:

```env
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=document_admin
DB_PASSWORD=your_local_password
DB_DATABASE=document_management
JWT_SECRET=your-super-secret-jwt-key
```

## 4. Run database migrations

From the project root:

```bash
npm run migration:run
```

To view migration status:

```bash
npm run migration:show
```

## 5. Run the app

Development mode:

```bash
npm run start:dev
```

Production build:

```bash
npm run build
npm run start:prod
```

## 6. Useful checks

Verify the database connection:

```bash
npm run build
```

Verify tables:

```sql
\dt
```

Verify seeded roles:

```sql
SELECT * FROM roles;
```

## 7. Troubleshooting

- If PostgreSQL rejects the connection, confirm `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, and `DB_DATABASE` are correct.
- If migrations fail because tables already exist, inspect the current schema and either re-create the database or use a fresh environment.
- If JWT auth fails, ensure `JWT_SECRET` is set and not blank.
