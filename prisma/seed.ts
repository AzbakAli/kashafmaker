import { PrismaClient, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import fs from "fs/promises";
import path from "path";
import { generateKashafPdf } from "../src/lib/pdf/generator";
import { buildKashafContext } from "../src/lib/pdf/context-builder";
import { getNbisKashafFieldConfig } from "../src/lib/pdf/nbis-template";
import { generateDocumentNumber } from "../src/lib/utils";
import "dotenv/config";

const prisma = new PrismaClient();
const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";

async function ensureArabicFont() {
  const dest = path.join(UPLOAD_DIR, "fonts", "NotoSansArabic-Regular.ttf");
  try {
    await fs.access(dest);
    return;
  } catch {
    /* download */
  }
  await fs.mkdir(path.dirname(dest), { recursive: true });
  const url =
    "https://github.com/notofonts/notofonts.github.io/raw/main/fonts/NotoSansArabic/full/ttf/NotoSansArabic-Regular.ttf";
  try {
    const res = await fetch(url);
    if (!res.ok) return;
    await fs.writeFile(dest, Buffer.from(await res.arrayBuffer()));
  } catch {
    console.warn("Could not download Noto Sans Arabic font; Arabic overlay may fall back.");
  }
}

async function installNbisTemplatePdf() {
  const destRel = path.join("templates", "nbis-kashaf.pdf");
  const destAbs = path.join(UPLOAD_DIR, destRel);
  await fs.mkdir(path.dirname(destAbs), { recursive: true });

  const candidates = [
    path.join(process.cwd(), "assets", "nbis-kashaf.pdf"),
    "C:/Users/hp/Documents/NBIS Kashaf Sample With Stamp (1).pdf",
    "C:/Users/hp/Downloads/NBIS Kashaf Sample With Stamp.pdf",
  ];

  for (const source of candidates) {
    try {
      await fs.copyFile(source, destAbs);
      console.log("Installed NBIS Kashaf template from", source);
      return destRel;
    } catch {
      /* try next */
    }
  }

  throw new Error("NBIS Kashaf PDF not found. Place it at assets/nbis-kashaf.pdf");
}

async function main() {
  await ensureArabicFont();
  const passwordHash = await bcrypt.hash("admin123", 12);

  await prisma.user.upsert({
    where: { email: "admin@kashafmake.com" },
    update: {},
    create: {
      email: "admin@kashafmake.com",
      name: "Admin User",
      passwordHash,
      role: "ADMIN",
    },
  });

  await prisma.user.upsert({
    where: { email: "operator@kashafmake.com" },
    update: {},
    create: {
      email: "operator@kashafmake.com",
      name: "Operator User",
      passwordHash,
      role: "OPERATOR",
    },
  });

  await prisma.user.upsert({
    where: { email: "manager@kashafmake.com" },
    update: {},
    create: {
      email: "manager@kashafmake.com",
      name: "Manager User",
      passwordHash,
      role: "MANAGER",
    },
  });

  const existingCompany = await prisma.company.findFirst({ where: { isDefault: true } });
  if (!existingCompany) {
    await prisma.company.create({
      data: {
        name: "Nour Basirti Transport",
        nameAr: "نور بصيرتي للنقل",
        commercialRegistration: "7037856668",
        vatNumber: "300012345600003",
        phone: "+966 50 123 4567",
        email: "info@nourbasirti.com",
        address: "King Fahd Road",
        city: "Riyadh",
        country: "Saudi Arabia",
        isDefault: true,
      },
    });
  } else if (!existingCompany.commercialRegistration) {
    await prisma.company.update({
      where: { id: existingCompany.id },
      data: { commercialRegistration: "7037856668" },
    });
  }

  const driver = await prisma.driver.upsert({
    where: { id: "seed-driver-rehmat" },
    update: {},
    create: {
      id: "seed-driver-rehmat",
      name: "Rehmat Ullah",
      nameAr: "رحمت الله",
      iqamaNumber: "2123456789",
      phone: "+966 55 987 6543",
      nationality: "Pakistan",
      licenseNumber: "DL-123456",
      status: "ACTIVE",
    },
  });

  const vehicle = await prisma.vehicle.upsert({
    where: { plateNumber: "SXA-7266" },
    update: {},
    create: {
      vehicleType: "Van",
      make: "Hyundai",
      model: "Staria",
      plateNumber: "SXA-7266",
      vehicleId: "VH-001",
      year: 2023,
      color: "White",
      capacity: 11,
      status: "ASSIGNED",
    },
  });

  const activeAssignment = await prisma.driverVehicleAssignment.findFirst({
    where: { driverId: driver.id, isActive: true },
  });
  if (!activeAssignment) {
    await prisma.driverVehicleAssignment.create({
      data: { driverId: driver.id, vehicleId: vehicle.id, isActive: true },
    });
  }

  const passengerData = [
    { fullName: "Mansoor Ahmed", passportNumber: "CE1159477", nationality: "Pakistan", gender: "MALE" as const, visaType: "Umrah" },
    { fullName: "Raja Shahid Nazir Janjua", passportNumber: "AN8785242", nationality: "Pakistan", gender: "MALE" as const, visaType: "Umrah" },
    { fullName: "Asma Mansoor", passportNumber: "AK0711234", nationality: "Pakistan", gender: "FEMALE" as const, visaType: "Umrah" },
    { fullName: "Amna Ahmed", passportNumber: "TX1153673", nationality: "Pakistan", gender: "FEMALE" as const, visaType: "Umrah" },
    { fullName: "NAZIMA SHAZI", passportNumber: "133384631", nationality: "United Kingdom", gender: "FEMALE" as const, visaType: "Umrah" },
  ];

  const passengers = [];
  for (const p of passengerData) {
    const existing = await prisma.passenger.findFirst({
      where: { passportNumber: p.passportNumber },
    });
    if (existing) {
      passengers.push(existing);
    } else {
      passengers.push(await prisma.passenger.create({ data: p }));
    }
  }

  const templatePath = await installNbisTemplatePdf();
  const fieldConfig = getNbisKashafFieldConfig();

  await prisma.kashafTemplate.updateMany({ data: { isDefault: false } });
  const existingTemplate = await prisma.kashafTemplate.findFirst({
    where: { name: "NBIS Official Kashaf" },
  });
  if (existingTemplate) {
    await prisma.kashafTemplate.update({
      where: { id: existingTemplate.id },
      data: {
        filePath: templatePath,
        pageCount: 2,
        isActive: true,
        isDefault: true,
        fieldConfig: fieldConfig as unknown as Prisma.InputJsonValue,
      },
    });
  } else {
    await prisma.kashafTemplate.create({
      data: {
        name: "NBIS Official Kashaf",
        description: "Official 2-page NBIS Kashaf form. Ride data is filled into this PDF automatically.",
        filePath: templatePath,
        version: 1,
        pageCount: 2,
        isActive: true,
        isDefault: true,
        fieldConfig: fieldConfig as unknown as Prisma.InputJsonValue,
      },
    });
  }

  const existingRide = await prisma.ride.findFirst({
    where: { pickup: "Riyadh Airport", destination: "Makkah Hotel" },
  });
  if (!existingRide) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    await prisma.ride.create({
      data: {
        rideNumber: `R-${today.toISOString().slice(0, 10).replace(/-/g, "")}-0001`,
        date: today,
        time: "08:00",
        pickup: "Riyadh Airport",
        destination: "Makkah Hotel",
        tripType: "Umrah Transfer",
        status: "SCHEDULED",
        driverId: driver.id,
        vehicleId: vehicle.id,
        driverSnapshot: {
          name: driver.name,
          nameAr: driver.nameAr,
          iqamaNumber: driver.iqamaNumber,
          phone: driver.phone,
          nationality: driver.nationality,
          licenseNumber: driver.licenseNumber,
        },
        vehicleSnapshot: {
          vehicleType: vehicle.vehicleType,
          make: vehicle.make,
          model: vehicle.model,
          plateNumber: vehicle.plateNumber,
          vehicleId: vehicle.vehicleId,
          color: vehicle.color,
          capacity: vehicle.capacity,
        },
        passengers: {
          create: passengers.map((p, index) => ({
            passengerId: p.id,
            sortOrder: index,
            passengerSnapshot: {
              fullName: p.fullName,
              passportNumber: p.passportNumber,
              nationality: p.nationality,
              gender: p.gender,
              visaType: p.visaType,
            },
          })),
        },
      },
    });
  }

  if (!(await prisma.systemSettings.findFirst())) {
    await prisma.systemSettings.create({
      data: {
        defaultFont: "Helvetica",
        arabicFont: "NotoSansArabic",
      },
    });
  }

  const template = await prisma.kashafTemplate.findFirst({
    where: { name: "NBIS Official Kashaf" },
  });
  const ride = await prisma.ride.findFirst({
    where: { pickup: "Riyadh Airport" },
    include: { passengers: { include: { passenger: true } } },
  });
  const company = await prisma.company.findFirst({ where: { isDefault: true } });

  if (template && ride && company) {
    const existingDoc = await prisma.kashafDocument.findFirst({
      where: { rideId: ride.id, templateId: template.id },
    });
    if (!existingDoc) {
      const context = buildKashafContext(
        company,
        ride,
        {
          name: driver.name,
          nameAr: driver.nameAr,
          iqamaNumber: driver.iqamaNumber,
          phone: driver.phone,
          nationality: driver.nationality,
          licenseNumber: driver.licenseNumber,
        },
        {
          vehicleType: vehicle.vehicleType,
          make: vehicle.make,
          model: vehicle.model,
          plateNumber: vehicle.plateNumber,
          vehicleId: vehicle.vehicleId,
          color: vehicle.color,
          capacity: vehicle.capacity,
        },
        ride.passengers.map((rp) => rp.passenger)
      );
      const pdfBytes = await generateKashafPdf(
        template.filePath,
        template.fieldConfig as unknown as Parameters<typeof generateKashafPdf>[1],
        context
      );
      const documentNumber = generateDocumentNumber();
      const relative = path.join("documents", `${documentNumber}.pdf`);
      await fs.mkdir(path.join(UPLOAD_DIR, "documents"), { recursive: true });
      await fs.writeFile(path.join(UPLOAD_DIR, relative), pdfBytes);
      await prisma.kashafDocument.create({
        data: {
          documentNumber,
          rideId: ride.id,
          templateId: template.id,
          filePath: relative,
          status: "GENERATED",
          snapshot: context as unknown as Prisma.InputJsonValue,
          passengerCount: ride.passengers.length,
        },
      });
    }
  }

  console.log("Seed complete. Login: admin@kashafmake.com / admin123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
