import { LoginPage } from "@/components/auth/LoginPage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Log in | FraudGuard Security Platform",
  description: "Enterprise fraud prevention and risk scoring dashboard login",
};

export default function LoginRoute() {
  return <LoginPage />;
}
