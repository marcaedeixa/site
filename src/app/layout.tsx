'use client'

import { Inter } from 'next/font/google'
import "./globals.css"
import { AuthProvider } from '@/hooks/useAuth'
import DebugAuth from '@/components/DebugAuth'

const inter = Inter({ subsets: ['latin'] })

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <head>
        <title>Marca e Deixa</title>
        <meta name="description" content="Sistema de gerenciamento de projetos" />
      </head>
      <body className={`${inter.className} antialiased`}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
