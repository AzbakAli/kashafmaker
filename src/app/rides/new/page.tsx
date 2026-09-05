"use client";

import { AppLayout } from "@/components/layout/app-layout";
import { PageHeader } from "@/components/ui/card";
import { RideForm } from "@/components/rides/ride-form";

export default function NewRidePage() {
  return (
    <AppLayout>
      <PageHeader title="Create Ride" description="Set up a new transport ride. Selecting a driver auto-fills the assigned vehicle." />
      <RideForm />
    </AppLayout>
  );
}
