import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seedDogfood() {
  const profilePath =
    process.env.DOGFOOD_PROFILE_PATH ||
    path.join(process.cwd(), "dogfood-profile.json");

  if (!fs.existsSync(profilePath)) {
    console.error(`Dogfood profile not found at path: ${profilePath}`);
    process.exit(1);
  }

  const rawContent = fs.readFileSync(profilePath, "utf-8").replace(/^\uFEFF/, "");
  const profile = JSON.parse(rawContent);
  console.log(`[SeedDogfood] Loading profile for ${profile.user.email}...`);

  const defaultPassword = process.env.DOGFOOD_PASSWORD || "Project365!";
  const passwordHash = await bcrypt.hash(defaultPassword, 12);

  // 1. Upsert User
  const user = await prisma.user.upsert({
    where: { email: profile.user.email },
    update: {
      name: profile.user.name,
      passwordHash,
      dayStartHour: profile.user.dayStartHour,
      logicalDayCutoffHour: profile.user.logicalDayCutoffHour,
      dailySleepHours: profile.user.dailySleepHours,
    },
    create: {
      email: profile.user.email,
      name: profile.user.name,
      passwordHash,
      dayStartHour: profile.user.dayStartHour,
      logicalDayCutoffHour: profile.user.logicalDayCutoffHour,
      dailySleepHours: profile.user.dailySleepHours,
    },
  });
  console.log(`[SeedDogfood] User verified/upserted: ${user.id} (${profile.user.email} / ${defaultPassword})`);

  // 2. Idempotently upsert Life Areas
  for (const area of profile.lifeAreas) {
    const upserted = await prisma.lifeArea.upsert({
      where: {
        userId_type: {
          userId: user.id,
          type: area.type,
        },
      },
      update: {
        name: area.name,
        color: area.color,
        intensity: area.intensity,
      },
      create: {
        userId: user.id,
        type: area.type,
        name: area.name,
        color: area.color,
        intensity: area.intensity,
      },
    });
    console.log(`[SeedDogfood] Life Area ready: ${upserted.type} (${upserted.name})`);
  }

  // 3. Clear & re-seed commitments for fresh trial accuracy
  await prisma.commitment.deleteMany({
    where: { userId: user.id },
  });

  for (const c of profile.commitments) {
    await prisma.commitment.create({
      data: {
        userId: user.id,
        title: c.title,
        type: c.type,
        startMinute: c.startMinute,
        endMinute: c.endMinute,
        durationMinutes: c.durationMinutes,
        recurrenceDays: c.recurrenceDays,
        isMandatory: true,
        isActive: true,
      },
    });
    console.log(`[SeedDogfood] Commitment added: ${c.title} (${c.durationMinutes}m)`);
  }

  console.log("[SeedDogfood] Done! Profile seeded with 0 friction.");
}

seedDogfood()
  .catch(err => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
