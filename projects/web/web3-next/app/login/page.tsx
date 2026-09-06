import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Iniciar sesión — TRACKLIFE",
  description: "Accede a tu cuenta de TRACKLIFE para seguir tu nutrición, entrenamiento y progreso.",
};

export default function LoginPage() {
  return <LoginForm />;
}
