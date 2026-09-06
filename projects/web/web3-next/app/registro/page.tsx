import type { Metadata } from "next";
import { RegisterForm } from "./RegisterForm";

export const metadata: Metadata = {
  title: "Crear cuenta — TRACKLIFE",
  description: "Regístrate gratis en TRACKLIFE y empieza a controlar tu nutrición, entrenamiento y progreso.",
};

export default function RegisterPage() {
  return <RegisterForm />;
}
