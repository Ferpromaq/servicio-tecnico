'use client';

import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Sidebar from '@/components/dashboard/Sidebar';
import Header from '@/components/dashboard/Header';

interface DashboardShellProps {
  activeHref: string;
  children: React.ReactNode;
}

// Envuelve cualquier página del dashboard con el mismo Sidebar + Header
// que ya tenías en app/dashboard/page.tsx. Al ser un Client Component,
// puede manejar el logout (useRouter + supabase del navegador) sin
// que la página que lo usa (que puede ser un Server Component) tenga
// que pasarle funciones como prop — algo que Next.js no permite de
// servidor a cliente.
export function DashboardShell({ activeHref, children }: DashboardShellProps) {
  const router = useRouter();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <div className="flex min-h-screen bg-gray-50">

      <div className="flex-1 min-w-0">
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}