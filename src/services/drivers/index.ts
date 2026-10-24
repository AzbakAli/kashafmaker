import { prisma } from "@/lib/db/prisma";
import type { DriverInput } from "@/lib/validation/schemas";

export async function assignVehicleToDriver(driverId: string, vehicleId: string) {
  await prisma.$transaction(async (tx) => {
    await tx.driverVehicleAssignment.updateMany({
      where: { driverId, isActive: true },
      data: { isActive: false, endedAt: new Date() },
    });

    await tx.driverVehicleAssignment.updateMany({
      where: { vehicleId, isActive: true },
      data: { isActive: false, endedAt: new Date() },
    });

    await tx.driverVehicleAssignment.create({
      data: { driverId, vehicleId, isActive: true },
    });

    await tx.driver.update({ where: { id: driverId }, data: { status: "ACTIVE" } });
    await tx.vehicle.update({ where: { id: vehicleId }, data: { status: "ASSIGNED" } });
  });
}

export async function createDriver(data: DriverInput) {
  const { vehicleId, licenseExpiry, ...driverData } = data;

  const driver = await prisma.driver.create({
    data: {
      ...driverData,
      licenseExpiry: licenseExpiry ? new Date(licenseExpiry) : null,
    },
  });

  if (vehicleId) {
    await assignVehicleToDriver(driver.id, vehicleId);
  }

  return driver;
}

export async function updateDriver(id: string, data: DriverInput) {
  const { vehicleId, licenseExpiry, ...driverData } = data;

  const driver = await prisma.driver.update({
    where: { id },
    data: {
      ...driverData,
      licenseExpiry: licenseExpiry ? new Date(licenseExpiry) : null,
    },
  });

  if (vehicleId) {
    await assignVehicleToDriver(id, vehicleId);
  }

  return driver;
}

export async function getDriverDetails(id: string) {
  return prisma.driver.findUnique({
    where: { id },
    include: {
      assignments: {
        include: { vehicle: true },
        orderBy: { assignedAt: "desc" },
      },
      rides: {
        include: { vehicle: true, passengers: true },
        orderBy: { date: "desc" },
        take: 20,
      },
    },
  });
}

export async function searchDrivers(query?: string, status?: string) {
  return prisma.driver.findMany({
    where: {
      ...(status ? { status: status as "ACTIVE" | "INACTIVE" } : {}),
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { iqamaNumber: { contains: query, mode: "insensitive" } },
              { phone: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      assignments: {
        where: { isActive: true },
        include: { vehicle: true },
        take: 1,
      },
    },
    orderBy: { name: "asc" },
  });
}
