# Database Creation and Migrations

## 1. Create the PostgreSQL database

```bash
psql -U postgres
```

```sql
CREATE DATABASE document_management;
CREATE USER document_admin WITH PASSWORD 'your_local_password';
GRANT ALL PRIVILEGES ON DATABASE document_management TO document_admin;
```

Optional:

```sql
\c document_management
GRANT ALL ON SCHEMA public TO document_admin;
```

## 2. Confirm database connection

Make sure the `.env` file contains:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=document_admin
DB_PASSWORD=your_local_password
DB_DATABASE=document_management
```

## 3. Run migrations

From the project root:

```bash
npm run migration:run
```

This will execute all pending TypeORM migrations and create the schema.

## 4. View migration history

```bash
npm run migration:show
```

## 5. Revert last migration

```bash
npm run migration:revert
```

## 6. Generate new migration

When you change an entity:

```bash
npm run migration:generate -- src/database/migrations/<MigrationName>
```

Then run:

```bash
npm run migration:run
```

## 7. Important note

Do not run an initial migration into a database that already contains the table structure, unless the database is intentionally empty.

If needed, create a fresh database and rerun migrations.
