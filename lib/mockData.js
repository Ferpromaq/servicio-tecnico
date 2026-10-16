// TODO: reemplazar por fetch a Supabase (tablas: ordenes, clientes, maquinas, mantenimientos).

export const orderStatusStyles = {
  recepcion: "bg-orange-50 text-orange-700",
  diagnostico: "bg-amber-50 text-amber-700",
  esperando_autorizacion_cliente: "bg-purple-50 text-purple-700",
  esperando_autorizacion_jefe: "bg-purple-50 text-purple-700",
  en_reparacion: "bg-orange-50 text-orange-700",
  lista_para_entrega: "bg-sky-50 text-sky-700",
  entregada: "bg-gray-100 text-gray-600",
  no_reparada: "bg-red-50 text-red-700",
};

export const sidebarNav = {
  operaciones: [
    { label: "Órdenes de Servicio", icon: "clipboard", href: "/ordenes" },
    { label: "Mantenimientos", icon: "wrenchAlt", href: "/mantenimientos" },
    { label: "Máquinas", icon: "box", href: "/maquinas" },
    { label: "Clientes", icon: "users", href: "/clientes" },
    {
      label: "Representantes de Marcas",
      icon: "contactRound",
      href: "/representantes-marcas",
    },
    { label: "Repuestos", icon: "package", href: "/repuestos" },
    { label: "Pagos", icon: "fileText", href: "/pagos" },
  ],
  agenda: [
    { label: "Calendario", icon: "calendar", href: "/calendario" },
    {
      label: "Mant. Programados",
      icon: "calendarCheck",
      href: "/mantenimientos-programados",
    },
  ],
  reportes: [{ label: "Reportes", icon: "barChart", href: "/reportes" }],

  configuracion: [
    { label: "Usuarios", icon: "userCog", href: "/usuarios" },
    { label: "Configuración", icon: "settings", href: "/configuracion" },
  ],
};
