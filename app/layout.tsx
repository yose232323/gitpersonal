import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Alma Latina | Moda que te acompaña", description: "Moda colombiana para Costa Rica. Conoce nuestras colecciones y consulta por WhatsApp." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="es"><body>{children}</body></html>; }
