import "dotenv/config";
import fs from "fs/promises";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { generateKashafForRide } from "../src/services/rides";

const prisma = new PrismaClient();
const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";

async function main() {
  const ride = await prisma.ride.findFirst({
    include: { driver: true, vehicle: true, passengers: true },
    orderBy: { createdAt: "desc" },
  });
  if (!ride) {
    throw new Error("No ride in database. Run npm run db:seed first.");
  }

  console.log("Ride:", ride.rideNumber);
  console.log("Driver:", ride.driver?.name);
  console.log("Vehicle:", ride.vehicle ? `${ride.vehicle.make} ${ride.vehicle.model} ${ride.vehicle.plateNumber}` : "none");
  console.log("Passengers:", ride.passengers.length);

  const document = await generateKashafForRide(ride.id);
  const snapshot = document.snapshot as {
    driver?: { driver_name?: string };
    vehicle?: { plate_number?: string };
    company?: { company_name?: string };
    passengers?: unknown[];
  };

  const fullPath = path.join(UPLOAD_DIR, document.filePath!);
  const stat = await fs.stat(fullPath);

  console.log("Document:", document.documentNumber);
  console.log("File bytes:", stat.size);
  console.log("Snapshot company:", snapshot.company?.company_name);
  console.log("Snapshot driver:", snapshot.driver?.driver_name);
  console.log("Snapshot plate:", snapshot.vehicle?.plate_number);
  console.log("Snapshot passengers:", snapshot.passengers?.length);

  if (snapshot.driver?.driver_name !== "Rehmat Ullah") {
    throw new Error("Expected snapshot driver Rehmat Ullah");
  }
  if (snapshot.vehicle?.plate_number !== "SXA-7266") {
    throw new Error("Expected snapshot plate SXA-7266");
  }
  if (!stat.size) {
    throw new Error("Generated PDF is empty");
  }

  console.log("Kashaf generation check passed.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
