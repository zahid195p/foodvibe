"use client";

import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";

export default function RiderLoginPage() {
  return (
    <Suspense>
      <AuthForm audience="rider" />
    </Suspense>
  );
}
