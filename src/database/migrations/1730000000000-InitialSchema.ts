import * as bcrypt from 'bcrypt';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1730000000000 implements MigrationInterface {
  private readonly defaultAdmin = {
    email: 'admin@example.com',
    name: 'System Admin',
    password: 'Admin@123',
  };

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "user_role_enum"
      AS ENUM ('ADMIN', 'EDITOR', 'VIEWER')
    `);

    await queryRunner.query(`
      CREATE TYPE "document_status_enum"
      AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'ARCHIVED')
    `);

    await queryRunner.query(`
      CREATE TYPE "ingestion_status_enum"
      AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED')
    `);

    await queryRunner.query(`
      CREATE TABLE "roles" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" "user_role_enum" NOT NULL UNIQUE,
        "description" TEXT,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" VARCHAR(100) NOT NULL,
        "email" VARCHAR(255) NOT NULL UNIQUE,
        "password_hash" VARCHAR(255) NOT NULL,
        "role_id" UUID NOT NULL,
        "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

        CONSTRAINT "fk_users_role"
        FOREIGN KEY ("role_id")
        REFERENCES "roles"("id")
        ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "documents" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "title" VARCHAR(255) NOT NULL,
        "description" TEXT,
        "original_filename" VARCHAR(255) NOT NULL,
        "storage_key" VARCHAR(500) NOT NULL UNIQUE,
        "mime_type" VARCHAR(100) NOT NULL,
        "file_size" BIGINT NOT NULL,
        "status" "document_status_enum" NOT NULL DEFAULT 'PENDING',
        "uploaded_by" UUID NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

        CONSTRAINT "fk_documents_uploaded_by"
        FOREIGN KEY ("uploaded_by")
        REFERENCES "users"("id")
        ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "ingestion_jobs" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "document_id" UUID NOT NULL,
        "triggered_by" UUID,
        "status" "ingestion_status_enum" NOT NULL DEFAULT 'QUEUED',
        "attempts" INTEGER NOT NULL DEFAULT 0,
        "error_message" TEXT,
        "started_at" TIMESTAMPTZ,
        "completed_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

        CONSTRAINT "fk_ingestion_document"
        FOREIGN KEY ("document_id")
        REFERENCES "documents"("id")
        ON DELETE CASCADE,

        CONSTRAINT "fk_ingestion_triggered_by"
        FOREIGN KEY ("triggered_by")
        REFERENCES "users"("id")
        ON DELETE SET NULL,

        CONSTRAINT "chk_ingestion_attempts"
        CHECK ("attempts" >= 0)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "refresh_tokens" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" UUID NOT NULL,
        "token_hash" VARCHAR(255) NOT NULL UNIQUE,
        "expires_at" TIMESTAMPTZ NOT NULL,
        "revoked_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

        CONSTRAINT "fk_refresh_tokens_user"
        FOREIGN KEY ("user_id")
        REFERENCES "users"("id")
        ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_users_role_id"
      ON "users" ("role_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_documents_uploaded_by"
      ON "documents" ("uploaded_by")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_documents_status"
      ON "documents" ("status")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_ingestion_document_status"
      ON "ingestion_jobs" ("document_id", "status")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_refresh_tokens_user_id"
      ON "refresh_tokens" ("user_id")
    `);

    await queryRunner.query(`
      INSERT INTO "roles" ("name", "description")
      VALUES
        ('ADMIN', 'Full application access'),
        ('EDITOR', 'Can upload and manage documents'),
        ('VIEWER', 'Can view documents and ingestion status')
    `);

    await this.createDefaultAdminUser(queryRunner);
  }

  private async createDefaultAdminUser(queryRunner: QueryRunner): Promise<void> {
    const hashedPassword = await bcrypt.hash(this.defaultAdmin.password, 10);

    await queryRunner.query(
      `
        INSERT INTO "users" ("name", "email", "password_hash", "role_id", "is_active", "created_at", "updated_at")
        VALUES (
          $1,
          $2,
          $3,
          (SELECT "id" FROM "roles" WHERE "name" = 'ADMIN'),
          TRUE,
          NOW(),
          NOW()
        )
      `,
      [this.defaultAdmin.name, this.defaultAdmin.email, hashedPassword],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "users" WHERE "email" = 'admin@example.com'`);
    await queryRunner.query(`DROP TABLE "refresh_tokens"`);
    await queryRunner.query(`DROP TABLE "ingestion_jobs"`);
    await queryRunner.query(`DROP TABLE "documents"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TABLE "roles"`);

    await queryRunner.query(`DROP TYPE "ingestion_status_enum"`);
    await queryRunner.query(`DROP TYPE "document_status_enum"`);
    await queryRunner.query(`DROP TYPE "user_role_enum"`);
  }
}
