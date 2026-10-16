// Datos ficticios para el Dashboard.
// TODO: reemplazar por fetch a Supabase (tablas: ordenes, clientes, maquinas, mantenimientos).

export const stats = [
  {
    id: "recepcion",
    value: 14,
    label: "Recepción",
    sublabel: "Nuevas órdenes",
    icon: "clipboard",
    color: "blue",
  },
  {
    id: "diagnostico",
    value: 8,
    label: "Diagnóstico",
    sublabel: "En revisión",
    icon: "search",
    color: "amber",
  },
  {
    id: "repuestos",
    value: 6,
    label: "Esperando Repuestos",
    sublabel: "Pendientes",
    icon: "cart",
    color: "purple",
  },
  {
    id: "reparacion",
    value: 12,
    label: "En Reparación",
    sublabel: "En proceso",
    icon: "wrench",
    color: "green",
  },
];

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

export const serviceOrders = [
  {
    id: "OS-2024-00125",
    fechaIngreso: "13/05/2024",
    cliente: "Juan Pérez",
    maquina: "Compresor Stanley",
    modelo: "STN-50L",
    estado: "Recepción",
    tecnico: "Carlos Méndez",
  },
  {
    id: "OS-2024-00124",
    fechaIngreso: "12/05/2024",
    cliente: "María González",
    maquina: "Taladro Bosch",
    modelo: "GBH 2-26 DRE",
    estado: "Diagnóstico",
    tecnico: "Luis Torres",
  },
  {
    id: "OS-2024-00123",
    fechaIngreso: "12/05/2024",
    cliente: "Constructora ABC",
    maquina: "Generador Honda",
    modelo: "EU22i",
    estado: "Esperando Repuestos",
    tecnico: "Carlos Méndez",
  },
  {
    id: "OS-2024-00122",
    fechaIngreso: "11/05/2024",
    cliente: "Pedro Ramirez",
    maquina: "Sierra Circular Makita",
    modelo: "HS7601",
    estado: "En Reparación",
    tecnico: "Luis Torres",
  },
  {
    id: "OS-2024-00121",
    fechaIngreso: "10/05/2024",
    cliente: "Inversiones SpA",
    maquina: "Soldadora Lincoln",
    modelo: "Invertec 305",
    estado: "Lista para Entrega",
    tecnico: "Ana Silva",
  },
];

export const orderTabs = [
  "Todas",
  "Recepción",
  "Diagnóstico",
  "Reparación",
  "Listas",
  "Entregadas",
];

// Detalle de la orden seleccionada (panel derecho)
export const selectedOrderDetail = {
  id: "OS-2024-00122",
  estado: "En Reparación",
  cliente: "Pedro Ramirez",
  telefono: "+56 9 1234 5678",
  maquina: "Sierra Circular Makita",
  modelo: "HS7601",
  nSerie: "MK-7601-2022-0158",
  fechaIngreso: "11/05/2024 10:30",
  tipoServicio: "Correctivo",
  tecnicoAsignado: "Luis Torres",
  garantia: "No aplica",
  descripcionProblema:
    "La máquina no enciende, no responde al interruptor de encendido.",
  diagnostico: "Falla en interruptor de encendido, cables dañados.",
  observaciones:
    "Se reemplazó interruptor y cableado. Pruebas realizadas correctamente.",
  proximoMantenimiento: {
    fecha: "15/08/2024",
    tipo: "Preventivo",
    frecuencia: "Cada 90 días",
    faltan: "Faltan 95 días",
  },
  pasos: [
    { label: "Recepción", fecha: "11/05", estado: "done" },
    { label: "Revisión", fecha: "11/05", estado: "done" },
    { label: "Diagnóstico", fecha: "11/05", estado: "done" },
    { label: "Reparación", fecha: "12/05", estado: "current" },
    { label: "Entrega", fecha: "", estado: "pending" },
  ],
  tabs: ["Resumen", "Diagnóstico", "Repuestos", "Pagos", "Historial"],
};

export const maintenanceScheduled = [
  {
    id: 1,
    fecha: "15/05/2024",
    maquina: "Compresor Atlas Copco",
    modelo: "XAS 88 KD",
    tipo: "Preventivo",
    horas: "2,450 hc",
    proximo: "Próximo: 5,500 h",
  },
  {
    id: 2,
    fecha: "16/05/2024",
    maquina: "Generador Cummins",
    modelo: "C25D6",
    tipo: "Preventivo",
    horas: null,
    proximo: "Faltan 5 días",
  },
  {
    id: 3,
    fecha: "18/05/2024",
    maquina: "Excavadora JCB",
    modelo: "JS200",
    tipo: "Preventivo",
    horas: "4,980 hc",
    proximo: "Próximo: 5,500 h",
  },
];

export const maintenanceOverdue = [
  {
    id: 1,
    fecha: "10/05/2024",
    maquina: "Motobomba Honda",
    modelo: "WB30XT",
    diasVencido: "Hace 3 días",
  },
  {
    id: 2,
    fecha: "08/05/2024",
    maquina: "Placa Vibradora Wacker",
    modelo: "WP1550",
    diasVencido: "Hace 5 días",
  },
  {
    id: 3,
    fecha: "05/05/2024",
    maquina: "Martillo Demoledor Bosch",
    modelo: "GSH 16-30",
    diasVencido: "Hace 8 días",
  },
];

export const currentUser = {
  nombre: "Juan Pérez",
  rol: "Administrador",
  avatarUrl: null, // reemplazar por URL real (ej. desde Supabase storage)
  notificaciones: 5,
};

export const sidebarNav = {
  operaciones: [
    {
      label: "Órdenes de Servicio",
      icon: "clipboard",
      href: "/dashboard/ordenes",
    },
    {
      label: "Mantenimientos",
      icon: "wrenchAlt",
      href: "/dashboard/mantenimientos",
    },
    { label: "Máquinas", icon: "box", href: "/dashboard/maquinas" },
    { label: "Clientes", icon: "users", href: "/dashboard/clientes" },
    { label: "Repuestos", icon: "package", href: "/dashboard/repuestos" },
    { label: "Pagos", icon: "fileText", href: "/dashboard/pagos" },
  ],
  agenda: [
    { label: "Calendario", icon: "calendar", href: "/dashboard/calendario" },
    {
      label: "Mant. Programados",
      icon: "calendarCheck",
      href: "/dashboard/mantenimientos-programados",
    },
  ],
  reportes: [
    { label: "Reportes", icon: "barChart", href: "/dashboard/reportes" },
  ],
  configuracion: [
    { label: "Usuarios", icon: "userCog", href: "/dashboard/usuarios" },
    {
      label: "Configuración",
      icon: "settings",
      href: "/dashboard/configuracion",
    },
  ],
};
