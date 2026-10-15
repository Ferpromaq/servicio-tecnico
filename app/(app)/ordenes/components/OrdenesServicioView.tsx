"use client";

/**
 * OrdenesServicioView
 * ---------------------------------------------------------------
 * Vista principal: lista de órdenes con tabs / búsqueda / paginación
 * (estado local) y Drawer de detalle (controlado por ?orden= en la URL).
 *
 * AJUSTES QUE DEBES REVISAR ANTES DE USAR:
 *  1. `_lib/supabase.ts` asume un cliente de Supabase para BROWSER en
 *     '@/lib/supabase-browser'. Ajusta la ruta si se llama distinto.
 *  2. Los valores del enum `estado_orden` (recepcion, diagnostico, etc.)
 *     deben coincidir con los de tu base.
 *  3. `origen_tipo` ('orden_servicio') debe coincidir con tu enum.
 *  4. Los roles de ROLES_QUE_PUEDEN_SOLICITAR deben coincidir con
 *     el enum rol_usuario.
 * ---------------------------------------------------------------
 */

import { useEffect, useState, useCallback, Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../lib/supabase";
import { TABS } from "../lib/constants";
import type { OrdenListItem, TabKey } from "../lib/types";
import { useRolActual } from "../hooks/useRolActual";
import NuevaOrdenModal from "../nueva/NuevaOrdenModal";
import OrdenesTabsBar from "./OrdenesTabsBar";
import OrdenesTable from "./OrdenesTable";
import OrdenesPagination from "./OrdenesPagination";
import OrdenDrawer from "./drawer/OrdenDrawer";

export default function OrdenesServicioView() {
  return (
    <Suspense
      fallback={
        <div className="rounded-xl border border-gray-200 bg-white px-4">
          <div className="flex items-center justify-center px-4 py-16 text-sm text-gray-400">
            Cargando órdenes...
          </div>
        </div>
      }
    >
      <OrdenesServicioContent />
    </Suspense>
  );
}

function OrdenesServicioContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<TabKey>("todas");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [ordenes, setOrdenes] = useState<OrdenListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const selectedOrdenId = searchParams.get("orden");

  const [openNuevaOrden, setOpenNuevaOrden] = useState(false);

  const { rol, checkingRol } = useRolActual();

  function selectOrden(ordenId: string | null, replace = false) {
    const params = new URLSearchParams(searchParams.toString());

    if (ordenId) {
      params.set("orden", ordenId);

      // Al abrir una orden nueva, comenzar siempre en Resumen.
      params.set("tab", "resumen");
    } else {
      params.delete("orden");
      params.delete("tab");
    }

    const url = params.size > 0 ? `${pathname}?${params.toString()}` : pathname;
    const navigate = replace ? router.replace : router.push;

    navigate(url, { scroll: false });
  }

  const fetchOrdenes = useCallback(async () => {
    setLoading(true);
    setError(null);

    let query = supabase
      .from("ordenes_servicio")
      .select(
        `
      id,
      numero_orden,
      estado,
      created_at,
      descripcion_problema,
      cliente:clientes (
        nombre_razon_social
      ),
      maquina:maquinas (
        nombre,
        modelo
      ),
      tecnico:usuarios!ordenes_servicio_tecnico_id_fkey (
        nombre
      )
      `,
        { count: "exact" },
      )
      .order("created_at", { ascending: false });

    const activeTab = TABS.find((t) => t.key === tab);

    if (activeTab && activeTab.estados.length > 0) {
      query = query.in("estado", activeTab.estados);
    }

    if (search) {
      query = query.ilike("numero_orden", `%${search}%`);
    }

    const {
      data,
      count,
      error: queryError,
    } = await query.range((page - 1) * pageSize, page * pageSize - 1);

    if (queryError) {
      console.error("Error cargando órdenes:", queryError);
      setError(queryError.message);
      setOrdenes([]);
      setTotal(0);
    } else {
      setOrdenes((data as unknown as OrdenListItem[]) ?? []);
      setTotal(count ?? 0);
    }

    setLoading(false);
  }, [tab, search, page]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchOrdenes();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [fetchOrdenes]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="rounded-xl px-4 border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-200 p-4">
        <h2 className="text-base font-bold text-gray-900">
          Órdenes de Servicio
        </h2>
        <button
          onClick={() => setOpenNuevaOrden(true)}
          className="inline-flex items-center gap-1.5 cursor-pointer rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-orange-700"
        >
          + Nueva Orden
        </button>
      </div>

      <OrdenesTabsBar
        tab={tab}
        onTabChange={(key) => {
          setTab(key);
          setPage(1);
        }}
        searchInput={searchInput}
        onSearchInputChange={setSearchInput}
        onSearch={() => {
          setSearch(searchInput);
          setPage(1);
        }}
      />

      <OrdenesTable
        ordenes={ordenes}
        loading={loading}
        error={error}
        onSelect={(id) => selectOrden(id)}
      />

      <OrdenesPagination
        page={page}
        setPage={setPage}
        totalPages={totalPages}
        from={from}
        to={to}
        total={total}
      />

      {selectedOrdenId && (
        <OrdenDrawer
          ordenId={selectedOrdenId}
          onClose={() => selectOrden(null, true)}
          rol={rol}
          checkingRol={checkingRol}
        />
      )}

      <NuevaOrdenModal
        open={openNuevaOrden}
        onClose={() => setOpenNuevaOrden(false)}
        onCreated={fetchOrdenes}
      />
    </div>
  );
}
