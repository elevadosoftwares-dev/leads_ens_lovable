-- ENS (Certification Expiry Notification System) - SQL Server schema.
-- Applied automatically when the app first connects (src/server/db.server.ts), after creating
-- the database if needed. Safe to re-run: every object is created only if it does not exist.
-- Separate batches with a line containing only GO. To apply by hand:
--   sqlcmd -S <server> -U <user> -P <password> -d new_leads_ens -i database/schema.sql

SET NOCOUNT ON;

-- Accounts: login, profile (full name) and role.
IF OBJECT_ID(N'dbo.users', N'U') IS NULL
CREATE TABLE dbo.users (
  id            UNIQUEIDENTIFIER NOT NULL CONSTRAINT pk_users PRIMARY KEY DEFAULT NEWID(),
  email         NVARCHAR(320)    NOT NULL CONSTRAINT uq_users_email UNIQUE,
  full_name     NVARCHAR(200)    NOT NULL CONSTRAINT df_users_full_name DEFAULT N'',
  password_hash NVARCHAR(256)    NOT NULL,
  role          NVARCHAR(10)     NOT NULL CONSTRAINT df_users_role DEFAULT N'user'
    CONSTRAINT ck_users_role CHECK (role IN (N'admin', N'user')),
  created_at    DATETIME2(3)     NOT NULL CONSTRAINT df_users_created_at DEFAULT SYSUTCDATETIME()
);

-- Login sessions. token_hash is the SHA-256 of the random token kept in the browser cookie.
IF OBJECT_ID(N'dbo.sessions', N'U') IS NULL
CREATE TABLE dbo.sessions (
  token_hash CHAR(64)         NOT NULL CONSTRAINT pk_sessions PRIMARY KEY,
  user_id    UNIQUEIDENTIFIER NOT NULL
    CONSTRAINT fk_sessions_user REFERENCES dbo.users(id) ON DELETE CASCADE,
  expires_at DATETIME2(3)     NOT NULL,
  created_at DATETIME2(3)     NOT NULL CONSTRAINT df_sessions_created_at DEFAULT SYSUTCDATETIME()
);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_sessions_user_id')
  CREATE INDEX ix_sessions_user_id ON dbo.sessions(user_id);

IF OBJECT_ID(N'dbo.companies', N'U') IS NULL
CREATE TABLE dbo.companies (
  id         UNIQUEIDENTIFIER NOT NULL CONSTRAINT pk_companies PRIMARY KEY DEFAULT NEWID(),
  name       NVARCHAR(200)    NOT NULL,
  created_at DATETIME2(3)     NOT NULL CONSTRAINT df_companies_created_at DEFAULT SYSUTCDATETIME()
);

-- The uploaded certificate/document is stored in the row itself (doc_*).
-- The user references have no ON DELETE action because SQL Server rejects several cascade
-- paths to one table; deleting a user clears them first (src/lib/users.functions.ts).
IF OBJECT_ID(N'dbo.certifications', N'U') IS NULL
CREATE TABLE dbo.certifications (
  id                 UNIQUEIDENTIFIER NOT NULL CONSTRAINT pk_certifications PRIMARY KEY DEFAULT NEWID(),
  company_id         UNIQUEIDENTIFIER NOT NULL
    CONSTRAINT fk_certifications_company REFERENCES dbo.companies(id) ON DELETE CASCADE,
  name               NVARCHAR(300)    NOT NULL,
  assigned_to        UNIQUEIDENTIFIER NULL
    CONSTRAINT fk_certifications_assigned_to REFERENCES dbo.users(id),
  corroborated_by    UNIQUEIDENTIFIER NULL
    CONSTRAINT fk_certifications_corroborated_by REFERENCES dbo.users(id),
  issue_date         DATE             NOT NULL,
  expiry_date        DATE             NOT NULL,
  doc_file_name      NVARCHAR(260)    NULL,
  doc_content_type   NVARCHAR(200)    NULL,
  doc_data           VARBINARY(MAX)   NULL,
  instruction_1      NVARCHAR(MAX)    NOT NULL CONSTRAINT df_certifications_instruction_1 DEFAULT N'',
  instruction_2      NVARCHAR(MAX)    NOT NULL CONSTRAINT df_certifications_instruction_2 DEFAULT N'',
  instruction_3      NVARCHAR(MAX)    NOT NULL CONSTRAINT df_certifications_instruction_3 DEFAULT N'',
  reminder_1_sent_at DATETIME2(3)     NULL,
  reminder_2_sent_at DATETIME2(3)     NULL,
  created_by         UNIQUEIDENTIFIER NULL
    CONSTRAINT fk_certifications_created_by REFERENCES dbo.users(id),
  created_at         DATETIME2(3)     NOT NULL CONSTRAINT df_certifications_created_at DEFAULT SYSUTCDATETIME(),
  updated_at         DATETIME2(3)     NOT NULL CONSTRAINT df_certifications_updated_at DEFAULT SYSUTCDATETIME()
);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_certifications_company_id')
  CREATE INDEX ix_certifications_company_id ON dbo.certifications(company_id);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_certifications_expiry_date')
  CREATE INDEX ix_certifications_expiry_date ON dbo.certifications(expiry_date);
