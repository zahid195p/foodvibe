"use client";

import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";

export default function RestaurantLoginPage() {
  return (
    <Suspense>
      <AuthForm audience="restaurant" />
    </Suspense>
  );
}
