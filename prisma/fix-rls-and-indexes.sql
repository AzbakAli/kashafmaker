-- Enable RLS on all tables
ALTER TABLE "Company" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Vehicle" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Driver" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RidePassenger" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Passenger" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "KashafTemplate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SystemSettings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DriverVehicleAssignment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "KashafDocument" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Ride" ENABLE ROW LEVEL SECURITY;

-- Add policies for authenticated users (allow all for now, can be restricted later)
CREATE POLICY "Enable all for Company" ON "Company" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for Vehicle" ON "Vehicle" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for User" ON "User" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for Driver" ON "Driver" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for RidePassenger" ON "RidePassenger" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for Passenger" ON "Passenger" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for AuditLog" ON "AuditLog" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for KashafTemplate" ON "KashafTemplate" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for SystemSettings" ON "SystemSettings" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for DriverVehicleAssignment" ON "DriverVehicleAssignment" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for KashafDocument" ON "KashafDocument" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for Ride" ON "Ride" FOR ALL USING (true) WITH CHECK (true);

-- Add indexes for foreign keys
CREATE INDEX IF NOT EXISTS "AuditLog_userId_idx" ON "AuditLog"("userId");
CREATE INDEX IF NOT EXISTS "KashafDocument_rideId_idx" ON "KashafDocument"("rideId");
CREATE INDEX IF NOT EXISTS "KashafDocument_templateId_idx" ON "KashafDocument"("templateId");
CREATE INDEX IF NOT EXISTS "Ride_driverId_idx" ON "Ride"("driverId");
CREATE INDEX IF NOT EXISTS "Ride_vehicleId_idx" ON "Ride"("vehicleId");
CREATE INDEX IF NOT EXISTS "RidePassenger_rideId_idx" ON "RidePassenger"("rideId");
CREATE INDEX IF NOT EXISTS "RidePassenger_passengerId_idx" ON "RidePassenger"("passengerId");
CREATE INDEX IF NOT EXISTS "DriverVehicleAssignment_driverId_idx" ON "DriverVehicleAssignment"("driverId");
CREATE INDEX IF NOT EXISTS "DriverVehicleAssignment_vehicleId_idx" ON "DriverVehicleAssignment"("vehicleId");
