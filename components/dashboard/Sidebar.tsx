"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  Wrench,
  Box,
  Users,
  Package,
  FileText,
  Calendar,
  CalendarCheck,
  ContactRound,
  BarChart3,
  LineChart,
  UserCog,
  Settings,
  Tag,
  ListChecks,
  LogOut,
  Menu,
  X,
} from "lucide-react";

import { sidebarNav } from "@/lib/mockData";
import { supabase } from "@/lib/supabase";

const iconMap = {
  clipboard: ClipboardList,
  wrenchAlt: Wrench,
  box: Box,
  users: Users,
  contactRound: ContactRound,
  package: Package,
  fileText: FileText,
  calendar: Calendar,
  calendarCheck: CalendarCheck,
  barChart: BarChart3,
  lineChart: LineChart,
  userCog: UserCog,
  settings: Settings,
  tag: Tag,
  list: ListChecks,
};

type NavItem = {
  label: string;
  icon: string;
  href: string;
};

function NavSection({
  title,
  items,
  pathname,
  onNavigate,
}: {
  title: string;
  items: NavItem[];
  pathname: string;
  onNavigate: () => void;
}) {
  return (
    <div className="mb-4">
      <p className="px-3 mb-1 text-[9px] uppercase tracking-wide text-slate-500">
        {title}
      </p>

      <ul className="space-y-0">
        {items.map((item) => {
          const Icon = iconMap[item.icon as keyof typeof iconMap] ?? Box;

          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onNavigate}
                className={`flex items-center gap-2 px-3 py-1.5 sm:py-1 rounded-lg text-xs transition-colors ${
                  isActive
                    ? "bg-orange-600 text-white font-medium"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <Icon size={14} strokeWidth={1.8} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  // Controla el drawer en pantallas < lg. En lg+ el sidebar
  // siempre está visible y este estado no aplica.
  const [isOpen, setIsOpen] = useState(false);

  // Cierra el drawer automáticamente cada vez que cambia la ruta
  // (por ejemplo, al tocar un link de navegación en móvil).
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  async function handleLogout() {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error("Error al cerrar sesión:", error);
        return;
      }

      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("Error inesperado al cerrar sesión:", error);
    }
  }

  const closeDrawer = () => setIsOpen(false);

  return (
    <>
      {/* =====================================================
          BOTÓN HAMBURGUESA (solo < lg)
          Fijo en la esquina superior izquierda para abrir el
          drawer. En lg+ el sidebar ya está siempre visible, así
          que este botón se oculta.
      ===================================================== */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`lg:hidden fixed top-3 left-3 z-40 flex h-9 w-9 items-center justify-center rounded-lg bg-slate-950 text-white shadow-md transition-opacity ${
          isOpen ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
        aria-label="Abrir menú"
      >
        <Menu size={18} strokeWidth={2} />
      </button>

      {/* =====================================================
          OVERLAY (solo < lg, solo cuando el drawer está abierto)
      ===================================================== */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={closeDrawer}
          aria-hidden="true"
        />
      )}

      {/* =====================================================
          SIDEBAR
          - lg+: estático, siempre visible, ancho fijo w-56.
          - < lg: drawer fijo que entra/sale con translate-x,
            se superpone al contenido (no lo empuja).
      ===================================================== */}
      <aside
        className={`flex h-screen w-64 sm:w-56 shrink-0 flex-col bg-slate-950 p-3 fixed inset-y-0 left-0 z-50 transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo + botón cerrar (móvil) */}
        <div className="mb-6 flex items-center justify-between gap-2 px-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-600">
              <Wrench size={17} strokeWidth={2} className="text-white" />
            </div>

            <div className="leading-tight min-w-0">
              <p className="text-xs font-semibold text-white truncate">
                Ferpromaq
              </p>

              <p className="text-[9px] text-slate-400 truncate">
                Servicio Técnico
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={closeDrawer}
            className="lg:hidden flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-800 hover:text-white"
            aria-label="Cerrar menú"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        {/* Navegación */}
        <nav className="flex-1 overflow-y-auto">
          {/* Dashboard */}
          <div className="mb-4">
            <Link
              href="/dashboard"
              onClick={closeDrawer}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors ${
                pathname === "/dashboard"
                  ? "bg-orange-600 text-white font-medium"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <LayoutDashboard size={14} strokeWidth={1.8} />
              Dashboard
            </Link>
          </div>

          <NavSection
            title="Operaciones"
            items={sidebarNav.operaciones}
            pathname={pathname}
            onNavigate={closeDrawer}
          />

          <NavSection
            title="Agenda"
            items={sidebarNav.agenda}
            pathname={pathname}
            onNavigate={closeDrawer}
          />

          <NavSection
            title="Reportes"
            items={sidebarNav.reportes}
            pathname={pathname}
            onNavigate={closeDrawer}
          />

          <NavSection
            title="Configuración"
            items={sidebarNav.configuracion}
            pathname={pathname}
            onNavigate={closeDrawer}
          />
        </nav>

        {/* Logout */}
        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center cursor-pointer gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition-colors mt-2"
        >
          <LogOut size={14} strokeWidth={1.8} />
          Cerrar sesión
        </button>
      </aside>
    </>
  );
}
