import { prisma } from "@/lib/db/prisma";
import { generateRideNumber, generateDocumentNumber } from "@/lib/utils";
import {
  buildKashafContext,
  createDriverSnapshot,
  createVehicleSnapshot,
  createPassengerSnapshot,
  generateKashafPdf,
  TemplateFieldConfig,
  getNbisKashafFieldConfig,
  isNbisStyleTemplate,
} from "@/lib/pdf";
import { saveFile } from "@/lib/storage";
import type { RideInput } from "@/lib/validation/schemas";
import type { Prisma } from "@prisma/client";

export async function getDriverWithVehicle(driverId: string) {
  const driver = await prisma.driver.findUnique({
    where: { id: driverId },
    include: {
      assignments: {
        where: { isActive: true },
        include: { vehicle: true },
        take: 1,
      },
    },
  });
  return {
    driver,
    assignedVehicle: driver?.assignments[0]?.vehicle || null,
  };
}

export async function createRide(data: RideInput) {
  const rideNumber = generateRideNumber();

  let driverSnapshot = null;
  let vehicleSnapshot = null;
  let vehicleId = data.vehicleId || null;

  if (data.driverId) {
    const { driver, assignedVehicle } = await getDriverWithVehicle(data.driverId);
    if (driver) driverSnapshot = createDriverSnapshot(driver);
    vehicleId = data.vehicleId || assignedVehicle?.id || null;
    if (vehicleId) {
      const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
      if (vehicle) vehicleSnapshot = createVehicleSnapshot(vehicle);
    }
  }

  const ride = await prisma.ride.create({
    data: {
      rideNumber,
      date: new Date(data.date),
      time: "00:00", // Default time since time field is removed
      pickup: data.pickup,
      destination: data.destination,
      intermediateStops: data.intermediateStops,
      tripType: data.tripType,
      notes: data.notes,
      status: data.status,
      driverId: data.driverId || null,
      vehicleId,
      driverSnapshot: driverSnapshot as Prisma.InputJsonValue,
      vehicleSnapshot: vehicleSnapshot as Prisma.InputJsonValue,
      passengers: {
        create: await Promise.all(
          data.passengerIds.map(async (passengerId, index) => {
            const passenger = await prisma.passenger.findUnique({ where: { id: passengerId } });
            return {
              passengerId,
              sortOrder: index,
              passengerSnapshot: passenger
                ? (createPassengerSnapshot(passenger) as Prisma.InputJsonValue)
                : undefined,
            };
          })
        ),
      },
    },
    include: {
      driver: true,
      vehicle: true,
      passengers: { include: { passenger: true }, orderBy: { sortOrder: "asc" } },
    },
  });

  return ride;
}

export async function updateRide(id: string, data: RideInput) {
  let driverSnapshot = null;
  let vehicleSnapshot = null;

  if (data.driverId) {
    const { driver, assignedVehicle } = await getDriverWithVehicle(data.driverId);
    if (driver) driverSnapshot = createDriverSnapshot(driver);
    const vehicleId = data.vehicleId || assignedVehicle?.id;
    if (vehicleId) {
      const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
      if (vehicle) vehicleSnapshot = createVehicleSnapshot(vehicle);
    }
  }

  await prisma.ridePassenger.deleteMany({ where: { rideId: id } });

  const ride = await prisma.ride.update({
    where: { id },
    data: {
      date: new Date(data.date),
      time: "00:00", // Default time since time field is removed
      pickup: data.pickup,
      destination: data.destination,
      intermediateStops: data.intermediateStops,
      tripType: data.tripType,
      notes: data.notes,
      status: data.status,
      driverId: data.driverId || null,
      vehicleId: data.vehicleId || null,
      driverSnapshot: driverSnapshot as Prisma.InputJsonValue,
      vehicleSnapshot: vehicleSnapshot as Prisma.InputJsonValue,
      passengers: {
        create: await Promise.all(
          data.passengerIds.map(async (passengerId, index) => {
            const passenger = await prisma.passenger.findUnique({ where: { id: passengerId } });
            return {
              passengerId,
              sortOrder: index,
              passengerSnapshot: passenger
                ? (createPassengerSnapshot(passenger) as Prisma.InputJsonValue)
                : undefined,
            };
          })
        ),
      },
    },
    include: {
      driver: true,
      vehicle: true,
      passengers: { include: { passenger: true }, orderBy: { sortOrder: "asc" } },
    },
  });

  return ride;
}

export async function generateKashafForRide(rideId: string, templateId?: string) {
  const ride = await prisma.ride.findUnique({
    where: { id: rideId },
    include: {
      driver: true,
      vehicle: true,
      passengers: { include: { passenger: true }, orderBy: { sortOrder: "asc" } },
    },
  });

  if (!ride) throw new Error("Ride not found");

  let template;
  if (templateId) {
    template = await prisma.kashafTemplate.findUnique({ where: { id: templateId } });
  } else {
    template = await prisma.kashafTemplate.findFirst({
      where: { isDefault: true, isActive: true },
    });
    if (!template) {
      template = await prisma.kashafTemplate.findFirst({ where: { isActive: true } });
    }
  }

  if (!template) throw new Error("No active template found");

  const company = await prisma.company.findFirst({ where: { isDefault: true } });
  if (!company) throw new Error("Company not configured");

  const driverSnap = (ride.driverSnapshot as Record<string, unknown> | null) ||
    (ride.driver ? (createDriverSnapshot(ride.driver) as Record<string, unknown>) : null);
  const vehicleSnap = (ride.vehicleSnapshot as Record<string, unknown> | null) ||
    (ride.vehicle ? (createVehicleSnapshot(ride.vehicle) as Record<string, unknown>) : null);

  const passengers = ride.passengers.map((rp) => {
    const snap = (rp.passengerSnapshot as Record<string, unknown> | null) || {};
    const hasSnap = Boolean(snap.fullName);
    return {
      fullName: (hasSnap ? (snap.fullName as string) : rp.passenger.fullName) || "",
      passportNumber: hasSnap ? (snap.passportNumber as string) : rp.passenger.passportNumber,
      nationality: hasSnap ? (snap.nationality as string) : rp.passenger.nationality,
      gender: hasSnap ? (snap.gender as string) : rp.passenger.gender,
      visaType: hasSnap ? (snap.visaType as string) : rp.passenger.visaType,
    };
  });

  const context = buildKashafContext(
    company,
    ride,
    driverSnap
      ? {
          name: (driverSnap.name as string) || "",
          nameAr: driverSnap.nameAr as string | undefined,
          iqamaNumber: driverSnap.iqamaNumber as string | undefined,
          phone: driverSnap.phone as string | undefined,
          nationality: driverSnap.nationality as string | undefined,
          licenseNumber: driverSnap.licenseNumber as string | undefined,
        }
      : null,
    vehicleSnap
      ? {
          vehicleType: (vehicleSnap.vehicleType as string) || "",
          make: (vehicleSnap.make as string) || "",
          model: (vehicleSnap.model as string) || "",
          plateNumber: (vehicleSnap.plateNumber as string) || "",
          vehicleId: vehicleSnap.vehicleId as string | undefined,
          color: vehicleSnap.color as string | undefined,
          capacity: vehicleSnap.capacity as number | undefined,
        }
      : null,
    passengers
  );

  const fieldConfig = isNbisStyleTemplate(template.pageCount)
    ? getNbisKashafFieldConfig()
    : (template.fieldConfig as unknown as TemplateFieldConfig);
  const pdfBytes = await generateKashafPdf(template.filePath, fieldConfig, context);

  const documentNumber = generateDocumentNumber();
  const filePath = await saveFile("documents", Buffer.from(pdfBytes), `${documentNumber}.pdf`);

  const snapshot = {
    company: context.company,
    ride: context.ride,
    driver: context.driver,
    vehicle: context.vehicle,
    passengers: context.passengers,
    generatedAt: new Date().toISOString(),
  };

  const document = await prisma.kashafDocument.create({
    data: {
      documentNumber,
      rideId: ride.id,
      templateId: template.id,
      filePath,
      status: "GENERATED",
      snapshot: snapshot as Prisma.InputJsonValue,
      passengerCount: passengers.length,
    },
    include: { ride: true, template: true },
  });

  await prisma.auditLog.create({
    data: {
      action: "GENERATE_KASHAF",
      entityType: "KashafDocument",
      entityId: document.id,
      details: {
        rideId: ride.id,
        documentNumber,
        templateId: template.id,
      },
    },
  });

  return document;
}

export async function getDashboardStats() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [
    totalRides,
    todayRides,
    upcomingRides,
    completedRides,
    totalDrivers,
    totalVehicles,
    totalPassengers,
    kashafDocuments,
    todayRidesList,
  ] = await Promise.all([
    prisma.ride.count(),
    prisma.ride.count({ where: { date: { gte: today, lt: tomorrow } } }),
    prisma.ride.count({ where: { status: "SCHEDULED", date: { gte: today } } }),
    prisma.ride.count({ where: { status: "COMPLETED" } }),
    prisma.driver.count({ where: { status: "ACTIVE" } }),
    prisma.vehicle.count(),
    prisma.passenger.count(),
    prisma.kashafDocument.count(),
    prisma.ride.findMany({
      where: { date: { gte: today, lt: tomorrow } },
      include: {
        driver: true,
        vehicle: true,
        passengers: true,
        kashafDocuments: { take: 1, orderBy: { createdAt: "desc" } },
      },
      orderBy: { time: "asc" },
    }),
  ]);

  return {
    totalRides,
    todayRides,
    upcomingRides,
    completedRides,
    totalDrivers,
    totalVehicles,
    totalPassengers,
    kashafDocuments,
    todayRidesList,
  };
}
