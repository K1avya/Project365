# Project365 Database Backup & Disaster Recovery Runbook

## 1. Objectives & SLA
- **RPO (Recovery Point Objective)**: < 1 Hour (hourly WAL archiving) or 24 hours (daily full logical dumps).
- **RTO (Recovery Time Objective)**: < 15 Minutes to restore service from cold backup.
- **Database Scope**: PostgreSQL `project365` database, specifically the versioned schema `project365_v2`.

---

## 2. Backup Strategy & Retention (3-2-1 Rule)

### Schedule
1. **Daily Full Logical Snapshot**:
   - Triggered at **02:00 UTC** (after daily instance generation and capacity snapshot jobs complete).
   - Format: PostgreSQL Custom Compressed Archive (`pg_dump -Fc -Z 9`).
2. **Write-Ahead Logging (WAL) Continuous Archiving (Production/Cloud)**:
   - Enabled via `archive_mode = on` and `archive_command` shipping to S3/Cloud Storage for continuous Point-in-Time Recovery (PITR).

### Retention Policy
| Tier | Frequency | Retention Window | Storage Location |
| :--- | :--- | :--- | :--- |
| **Hot** | Daily | 7 Days | Local Disk / NAS (`backups/daily/`) |
| **Warm** | Weekly | 4 Weeks | Encrypted Cloud Storage (AWS S3 / GCS) |
| **Cold** | Monthly | 12 Months | Glacier / Archive Vault |

---

## 3. Operational Procedures

### A. Executing an Automated Backup
Run the automated backup script:
```powershell
.\scripts\backup-database.ps1
```
Or manual command:
```bash
pg_dump -h localhost -p 5432 -U postgres -d project365 -n project365_v2 -Fc -f "backups/project365_$(date +%Y%m%d_%H%M%S).dump"
```

### B. Disaster Recovery & Restore Procedure
1. Create a clean staging/recovery database:
   ```sql
   CREATE DATABASE project365_recovery;
   ```
2. Restore using `pg_restore`:
   ```bash
   pg_restore -h localhost -p 5432 -U postgres -d project365_recovery --clean --if-exists backups/latest.dump
   ```
3. Run Prisma validation & test suite to verify table checksums and foreign keys:
   ```bash
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/project365_recovery?schema=project365_v2" npx vitest run
   ```

### C. Automated Restore Verification Test
Run monthly drill via:
```powershell
.\scripts\restore-database.ps1 -VerifyOnly $true
```
This restores the latest dump into an ephemeral database, executes the 23 test gates against it, and purges the temporary instance once verified.
