import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Selo Verde Saladorama",
  description: "Seleção de fornecedores sustentáveis com método MARCOS",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
