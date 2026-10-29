import { prisma } from "@/lib/db/prisma";
import type { VehicleInput } from "@/lib/validation/schemas";
import { assignVehicleToDriver } from "@/services/drivers";

export async function createVehicle(data: VehicleInput) {
  const { driverId, ...vehicleData } = data;

  const vehicle = await prisma.vehicle.create({ data: vehicleData });

  if (driverId) {
    await assignVehicleToDriver(driverId, vehicle.id);
  }

  return vehicle;
}

export async function updateVehicle(id: string, data: VehicleInput) {
  const { driverId, ...vehicleData } = data;

  const vehicle = await prisma.vehicle.update({ where: { id }, data: vehicleData });

  if (driverId) {
    await assignVehicleToDriver(driverId, id);
  }

  return vehicle;
}

export async function getVehicleDetails(id: string) {
  return prisma.vehicle.findUnique({
    where: { id },
    include: {
      assignments: {
        include: { driver: true },
        orderBy: { assignedAt: "desc" },
      },
      rides: {
        include: { driver: true },
        orderBy: { date: "desc" },
        take: 20,
      },
    },
  });
}

export async function searchVehicles(query?: string, status?: string, excludeInactive?: boolean) {
  return prisma.vehicle.findMany({
    where: {
      ...(status
        ? { status: status as "AVAILABLE" | "ASSIGNED" | "MAINTENANCE" | "INACTIVE" }
        : excludeInactive
        ? { status: { not: "INACTIVE" } }
        : {}),
      ...(query
        ? {
            OR: [
              { plateNumber: { contains: query, mode: "insensitive" } },
              { make: { contains: query, mode: "insensitive" } },
              { model: { contains: query, mode: "insensitive" } },
              { vehicleType: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      assignments: {
        where: { isActive: true },
        include: { driver: true },
        take: 1,
      },
    },
    orderBy: { plateNumber: "asc" },
  });
}
