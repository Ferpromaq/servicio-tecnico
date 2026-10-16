"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import {
  Mail,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2,
  X,
  Building2,
  Tags,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const supabase = createClient();
const REPRESENTANTES_POR_PAGINA = 6;

interface Marca {
  id: string;
  nombre: string;
}

interface Representante {
  id: string;
  nombre: string;
  empresa_representada: string | null;
  telefono: string | null;
  correo: string | null;
  marcas: string[];
}

type VistaKey = "representantes" | "marcas";

function normalizarMarca(nombre: string) {
  return nombre.trim().replace(/\s+/g, " ").toUpperCase();
}

function clave(nombre: string) {
  return normalizarMarca(nombre)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function obtenerPaginaValida(valor: string | null) {
  const pagina = Number(valor);

  return Number.isInteger(pagina) && pagina >= 1 ? pagina : 1;
}
export default function RepresentantesMarcaPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
          Cargando representantes...
        </div>
      }
    >
      <RepresentantesMarcaContent />
    </Suspense>
  );
}

function RepresentantesMarcaContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const paginaURL = obtenerPaginaValida(searchParams.get("page"));

  const [vista, setVista] = useState<VistaKey>("representantes");
  const [search, setSearch] = useState("");
  const [paginaActual, setPaginaActual] = useState(paginaURL);
  const [representantes, setRepresentantes] = useState<Representante[]>([]);
  const [catalogoMarcas, setCatalogoMarcas] = useState<Marca[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const [modal, setModal] = useState<{
    representante: Representante | null;
  } | null>(null);

  // Comprueba el rol del usuario.
  useEffect(() => {
    async function checkRol() {
      const { data: auth } = await supabase.auth.getUser();

      if (!auth.user) return;

      const { data: usuario } = await supabase
        .from("usuarios")
        .select("rol")
        .eq("id", auth.user.id)
        .maybeSingle();

      setIsAdmin(usuario?.rol === "admin");
    }

    void checkRol();
  }, []);

  // Carga los representantes y construye el catálogo de marcas.
  const fetchRepresentantes = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: queryError } = await supabase
        .from("representantes")
        .select("id, nombre, empresa_representada, telefono, correo, marcas")
        .order("nombre", { ascending: true });

      if (queryError) throw queryError;

      const lista: Representante[] = (data ?? []).map((r) => ({
        id: r.id,
        nombre: r.nombre,
        empresa_representada: r.empresa_representada,
        telefono: r.telefono,
        correo: r.correo,
        marcas: Array.isArray(r.marcas)
          ? r.marcas.filter(
              (m): m is string => typeof m === "string" && m.trim() !== "",
            )
          : [],
      }));

      const mapaMarcas = new Map<string, Marca>();

      for (const representante of lista) {
        for (const nombreMarca of representante.marcas) {
          const k = clave(nombreMarca);

          if (!mapaMarcas.has(k)) {
            mapaMarcas.set(k, {
              id: k,
              nombre: normalizarMarca(nombreMarca),
            });
          }
        }
      }

      const catalogo = [...mapaMarcas.values()].sort((a, b) =>
        a.nombre.localeCompare(b.nombre, "es"),
      );

      setRepresentantes(lista);
      setCatalogoMarcas(catalogo);
    } catch (err) {
      console.error("Error cargando representantes:", err);

      setError(
        err instanceof Error
          ? err.message
          : "No se pudieron cargar los representantes.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchRepresentantes();
  }, [fetchRepresentantes]);

  const term = search.trim().toLocaleLowerCase("es");

  // Filtra los representantes por nombre, empresa, contacto o marca.
  const representantesFiltrados = useMemo(() => {
    if (!term) return representantes;

    return representantes.filter((r) =>
      [
        r.nombre,
        r.empresa_representada ?? "",
        r.correo ?? "",
        r.telefono ?? "",
        ...r.marcas,
      ].some((valor) => valor.toLocaleLowerCase("es").includes(term)),
    );
  }, [representantes, term]);

  const totalPaginas = Math.max(
    1,
    Math.ceil(representantesFiltrados.length / REPRESENTANTES_POR_PAGINA),
  );

  // Limita la página cuando una búsqueda o eliminación reduce los resultados.
  useEffect(() => {
    setPaginaActual((actual) => Math.min(actual, totalPaginas));
  }, [totalPaginas]);

  // Sincroniza la página actual con el parámetro de la URL.
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());

    if (paginaActual === 1) {
      params.delete("page");
    } else {
      params.set("page", String(paginaActual));
    }

    const query = params.toString();
    const nuevaURL = query ? `${pathname}?${query}` : pathname;
    const urlActual = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;

    if (urlActual !== nuevaURL) {
      router.replace(nuevaURL, { scroll: false });
    }
  }, [paginaActual, pathname, router, searchParams]);

  // Permite restaurar la página al usar atrás/adelante en el navegador.
  useEffect(() => {
    setPaginaActual(paginaURL);
  }, [paginaURL]);

  const representantesPaginados = useMemo(() => {
    const inicio = (paginaActual - 1) * REPRESENTANTES_POR_PAGINA;

    return representantesFiltrados.slice(
      inicio,
      inicio + REPRESENTANTES_POR_PAGINA,
    );
  }, [representantesFiltrados, paginaActual]);

  const marcasAgrupadas = useMemo(() => {
    const mapa = new Map<string, { marca: string; reps: Representante[] }>();

    for (const r of representantes) {
      for (const nombreMarca of r.marcas) {
        const k = clave(nombreMarca);
        const actual = mapa.get(k) ?? {
          marca: nombreMarca,
          reps: [],
        };

        if (!actual.reps.some((rep) => rep.id === r.id)) {
          actual.reps.push(r);
        }

        mapa.set(k, actual);
      }
    }

    return [...mapa.values()]
      .filter(
        ({ marca, reps }) =>
          !term ||
          marca.toLocaleLowerCase("es").includes(term) ||
          reps.some((r) =>
            [r.nombre, r.empresa_representada ?? ""].some((v) =>
              v.toLocaleLowerCase("es").includes(term),
            ),
          ),
      )
      .sort((a, b) => a.marca.localeCompare(b.marca, "es"));
  }, [representantes, term]);

  const desde =
    representantesFiltrados.length === 0
      ? 0
      : (paginaActual - 1) * REPRESENTANTES_POR_PAGINA + 1;

  const hasta = Math.min(
    paginaActual * REPRESENTANTES_POR_PAGINA,
    representantesFiltrados.length,
  );

  function cambiarBusqueda(valor: string) {
    setSearch(valor);
    setPaginaActual(1);
  }

  function cambiarVista(nuevaVista: VistaKey) {
    setVista(nuevaVista);
    setPaginaActual(1);
  }

  return (
    <div className="w-full min-w-0 max-w-full overflow-hidden rounded-xl border border-gray-200 bg-white px-4">
      <div className="flex items-center justify-between gap-3 border-b border-gray-200 p-4">
        <div className="min-w-0">
          <h2 className="text-base font-bold text-gray-900">
            Representantes comerciales
          </h2>
          <p className="mt-0.5 text-xs text-gray-500">
            Empresas representadas y marcas de productos asociadas.
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={() => setModal({ representante: null })}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-orange-600 px-3 py-2 text-xs font-medium text-white hover:bg-orange-700"
          >
            <Plus className="h-3.5 w-3.5" />
            Nuevo representante
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 px-4">
        {(
          [
            ["representantes", "Representantes"],
            ["marcas", "Por marca de producto"],
          ] as [VistaKey, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => cambiarVista(key)}
            className={`border-b-2 px-3 py-3 text-xs font-medium ${
              vista === key
                ? "border-orange-600 text-orange-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {label}
          </button>
        ))}

        <div className="relative ml-auto min-w-0 py-2">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => cambiarBusqueda(e.target.value)}
            placeholder="Buscar representante o marca..."
            className="w-full rounded-lg border border-gray-300 py-2 pl-8 pr-3 text-xs outline-none focus:border-orange-500 sm:w-64"
          />
        </div>
      </div>

      {loading && (
        <div className="py-12 text-center text-xs text-gray-500">
          Cargando representantes...
        </div>
      )}

      {!loading && error && (
        <div className="m-4 rounded-lg bg-red-50 p-3 text-xs text-red-700">
          Error: {error}
          <button
            type="button"
            onClick={() => void fetchRepresentantes()}
            className="ml-2 underline"
          >
            Reintentar
          </button>
        </div>
      )}

      {!loading && !error && vista === "representantes" && (
        <>
          <div className="h-[440px] w-full max-w-full overflow-x-auto overflow-y-auto">
            <table className="w-full table-fixed text-left text-xs">
              <thead>
                <tr className="text-[10px] uppercase tracking-wide text-gray-500">
                  <th className="w-[20%] px-4 py-3 font-medium">
                    Representante
                  </th>

                  <th className="w-[22%] px-4 py-3 font-medium">
                    Empresa representada
                  </th>

                  <th className="w-[25%] px-4 py-3 font-medium">Contacto</th>

                  <th className="px-4 py-3 font-medium">Marcas de productos</th>

                  {isAdmin && <th className="w-10 px-2 py-3" />}
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {representantesPaginados.length === 0 && (
                  <tr>
                    <td
                      colSpan={isAdmin ? 5 : 4}
                      className="px-4 py-10 text-center text-gray-500"
                    >
                      No hay representantes que coincidan con la búsqueda.
                    </td>
                  </tr>
                )}

                {representantesPaginados.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => isAdmin && setModal({ representante: r })}
                    className={`h-[66px] group hover:bg-orange-50/40 ${
                      isAdmin ? "cursor-pointer" : ""
                    }`}
                  >
                    <td className="px-4 py-3 align-middle font-semibold text-gray-900">
                      {r.nombre}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-gray-700">
                        <Building2 className="h-3.5 w-3.5 shrink-0 text-blue-500" />
                        {r.empresa_representada || "Sin empresa asignada"}
                      </div>
                    </td>

                    <td className="h-[66px] w-[220px] px-4 py-1 align-middle">
                      <div className="flex h-[52px] flex-col justify-center gap-1 overflow-hidden">
                        <div
                          className="flex h-4 min-h-4 items-center gap-1.5 overflow-hidden"
                          title={r.telefono || ""}
                        >
                          {r.telefono ? (
                            <>
                              <Phone className="h-3 w-3 shrink-0 text-gray-400" />
                              <a
                                href={`tel:${r.telefono}`}
                                onClick={(e) => e.stopPropagation()}
                                className="truncate text-gray-600 hover:text-orange-600"
                              >
                                {r.telefono}
                              </a>
                            </>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </div>

                        <div
                          className="flex h-4 min-h-4 items-center gap-1.5 overflow-hidden"
                          title={r.correo || ""}
                        >
                          {r.correo ? (
                            <>
                              <Mail className="h-3 w-3 shrink-0 text-gray-400" />
                              <a
                                href={`mailto:${r.correo}`}
                                onClick={(e) => e.stopPropagation()}
                                className="truncate text-gray-600 hover:text-orange-600"
                              >
                                {r.correo}
                              </a>
                            </>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      {r.marcas.length === 0 ? (
                        <span className="text-gray-400">
                          Sin marcas asignadas
                        </span>
                      ) : (
                        <div className="flex max-w-lg flex-wrap items-center gap-1 overflow-hidden">
                          {r.marcas.slice(0, 4).map((m) => (
                            <span
                              key={clave(m)}
                              className="max-w-[130px] truncate rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-medium text-emerald-700"
                              title={m}
                            >
                              {m}
                            </span>
                          ))}

                          {r.marcas.length > 4 && (
                            <span
                              className="shrink-0 rounded-md bg-gray-100 px-2 py-1 text-[10px] text-gray-600"
                              title={r.marcas.slice(4).join(", ")}
                            >
                              +{r.marcas.length - 4} más
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    {isAdmin && (
                      <td className="px-2 py-3 text-gray-400 group-hover:text-orange-600">
                        <Pencil className="h-3.5 w-3.5" />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {representantesFiltrados.length > 0 && (
            <div className="flex min-h-[68px] w-full max-w-full flex-col gap-3 overflow-x-auto border-t border-gray-100 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="shrink-0 text-xs text-gray-500">
                Mostrando{" "}
                <span className="font-semibold text-gray-700">{desde}</span>
                {"–"}
                <span className="font-semibold text-gray-700">{hasta}</span>
                {" de "}
                <span className="font-semibold text-gray-700">
                  {representantesFiltrados.length}
                </span>{" "}
                representantes
              </p>

              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
                  disabled={paginaActual === 1}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Anterior
                </button>

                <span className="whitespace-nowrap px-2 text-xs text-gray-600">
                  Página {paginaActual} de {totalPaginas}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setPaginaActual((p) => Math.min(totalPaginas, p + 1))
                  }
                  disabled={paginaActual === totalPaginas}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Siguiente
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {!loading && !error && vista === "marcas" && (
        <div className="h-[440px] w-full min-w-0 overflow-y-auto overscroll-contain">
          <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
            {marcasAgrupadas.length === 0 && (
              <div className="col-span-full py-10 text-center text-xs text-gray-500">
                No hay marcas que coincidan con la búsqueda.
              </div>
            )}

            {marcasAgrupadas.map(({ marca, reps }) => (
              <div
                key={clave(marca)}
                className="rounded-xl border border-gray-200 p-4 hover:border-orange-200"
              >
                <div className="mb-3 flex items-center gap-2">
                  <Tags className="h-4 w-4 shrink-0 text-emerald-600" />
                  <h3 className="break-words text-sm font-semibold text-gray-900">
                    {marca}
                  </h3>
                </div>

                <p className="mb-2 text-[10px] uppercase tracking-wide text-gray-400">
                  Representantes y empresas
                </p>

                <div className="space-y-3">
                  {reps.map((r) => (
                    <div
                      key={r.id}
                      className="rounded-lg bg-gray-50 p-3 text-xs"
                    >
                      <div className="break-words font-semibold text-gray-900">
                        {r.nombre}
                      </div>

                      <div className="mt-1 flex items-start gap-1.5 break-words text-gray-600">
                        <Building2 className="mt-0.5 h-3 w-3 shrink-0 text-blue-500" />
                        <span>
                          {r.empresa_representada || "Sin empresa asignada"}
                        </span>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-3">
                        {r.telefono && (
                          <a
                            href={`tel:${r.telefono}`}
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 text-gray-500 hover:text-orange-600"
                          >
                            <Phone className="h-3 w-3 shrink-0" />
                            {r.telefono}
                          </a>
                        )}

                        {r.correo && (
                          <a
                            href={`mailto:${r.correo}`}
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 text-gray-500 hover:text-orange-600"
                          >
                            <Mail className="h-3 w-3 shrink-0" />
                            {r.correo}
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && !error && vista === "marcas" && (
        <div className="border-t border-gray-100 px-4 py-3 text-xs text-gray-500">
          {marcasAgrupadas.length} marcas de productos
        </div>
      )}

      {modal && (
        <RepresentanteModal
          key={modal.representante?.id ?? "nuevo"}
          representante={modal.representante}
          marcasExistentes={catalogoMarcas}
          onClose={() => setModal(null)}
          onSaved={async () => {
            setModal(null);
            await fetchRepresentantes();
          }}
        />
      )}
    </div>
  );
}

function RepresentanteModal({
  representante,
  marcasExistentes,
  onClose,
  onSaved,
}: {
  representante: Representante | null;
  marcasExistentes: Marca[];
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const esEdicion = Boolean(representante);

  const [nombre, setNombre] = useState(representante?.nombre ?? "");
  const [empresa, setEmpresa] = useState(
    representante?.empresa_representada ?? "",
  );
  const [telefono, setTelefono] = useState(representante?.telefono ?? "");
  const [correo, setCorreo] = useState(representante?.correo ?? "");
  const [marcas, setMarcas] = useState<string[]>(representante?.marcas ?? []);
  const [marcaInput, setMarcaInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmandoEliminar, setConfirmandoEliminar] = useState(false);

  const existentesPorClave = useMemo(
    () => new Map(marcasExistentes.map((m) => [clave(m.nombre), m])),
    [marcasExistentes],
  );

  const seleccionadas = new Set(marcas.map(clave));
  const q = clave(marcaInput);

  const sugerencias = q
    ? marcasExistentes
        .filter(
          (m) =>
            clave(m.nombre).includes(q) && !seleccionadas.has(clave(m.nombre)),
        )
        .sort((a, b) => {
          const aInicio = clave(a.nombre).startsWith(q) ? 0 : 1;
          const bInicio = clave(b.nombre).startsWith(q) ? 0 : 1;

          return aInicio - bInicio || a.nombre.localeCompare(b.nombre, "es");
        })
        .slice(0, 8)
    : [];

  const marcaNueva =
    q.length > 0 && !existentesPorClave.has(q) && !seleccionadas.has(q);

  function resolverMarca(texto: string) {
    const limpia = normalizarMarca(texto);
    return existentesPorClave.get(clave(limpia))?.nombre ?? limpia;
  }

  function agregarMarca(texto: string) {
    const nuevas = texto
      .split(",")
      .map((marca) => marca.trim())
      .filter(Boolean)
      .map(resolverMarca);

    if (nuevas.length === 0) return;

    setMarcas((prev) => {
      const mapa = new Map(prev.map((marca) => [clave(marca), marca]));

      for (const marca of nuevas) {
        if (!mapa.has(clave(marca))) {
          mapa.set(clave(marca), marca);
        }
      }

      return [...mapa.values()];
    });

    setMarcaInput("");
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!nombre.trim()) {
      setError("El nombre del representante es obligatorio.");
      return;
    }

    if (!empresa.trim()) {
      setError("Ingresa la empresa que representa.");
      return;
    }

    if (correo.trim() && !/^\S+@\S+\.\S+$/.test(correo.trim())) {
      setError("El correo electrónico no es válido.");
      return;
    }

    const marcasFinales = [
      ...new Map(
        [...marcas, ...(marcaInput.trim() ? [marcaInput] : [])]
          .map(resolverMarca)
          .filter(Boolean)
          .map((m) => [clave(m), m]),
      ).values(),
    ];

    setSaving(true);

    try {
      const payload = {
        nombre: nombre.trim(),
        empresa_representada: empresa.trim(),
        telefono: telefono.trim() || null,
        correo: correo.trim() || null,
        marcas: marcasFinales,
      };

      if (representante) {
        const { error: updateError } = await supabase
          .from("representantes")
          .update(payload)
          .eq("id", representante.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from("representantes")
          .insert(payload);

        if (insertError) throw insertError;
      }

      await onSaved();
    } catch (err) {
      console.error("Error guardando representante:", err);

      setError(
        err instanceof Error
          ? err.message
          : "No se pudo guardar el representante.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleEliminar() {
    if (!representante) return;

    setSaving(true);
    setError(null);

    try {
      const { error: deleteError } = await supabase
        .from("representantes")
        .delete()
        .eq("id", representante.id);

      if (deleteError) throw deleteError;

      await onSaved();
    } catch (err) {
      console.error("Error eliminando representante:", err);

      setError(
        err instanceof Error
          ? err.message
          : "No se pudo eliminar el representante.",
      );
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 disabled:opacity-50";

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              {esEdicion ? "Editar representante" : "Nuevo representante"}
            </h3>
            <p className="mt-1 text-xs text-gray-500">
              Separa la empresa representada de sus marcas de productos.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Cerrar"
            className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 overflow-y-auto px-5 py-5"
        >
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">
              Nombre del representante *
            </label>

            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej.: Pedro Pérez"
              disabled={saving}
              className={inputClass}
            />
          </div>

          <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3">
            <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-gray-800">
              <Building2 className="h-3.5 w-3.5 text-blue-600" />
              Empresa que representa *
            </label>

            <input
              value={empresa}
              onChange={(e) => setEmpresa(e.target.value)}
              placeholder="Ej.: ACO Maquinarias"
              disabled={saving}
              className={inputClass}
            />

            <p className="mt-1 text-[11px] text-gray-500">
              Es la empresa comercial, no las marcas de los productos.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                Teléfono
              </label>

              <input
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="+56 9 1234 5678"
                disabled={saving}
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                Correo electrónico
              </label>

              <input
                type="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                placeholder="nombre@empresa.cl"
                disabled={saving}
                className={inputClass}
              />
            </div>
          </div>

          <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3">
            <label className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-gray-800">
              <Tags className="h-3.5 w-3.5 text-emerald-600" />
              Marcas de productos que trabaja
            </label>

            {marcas.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-1.5">
                {marcas.map((m) => (
                  <span
                    key={clave(m)}
                    className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-[11px] font-medium text-emerald-800 ring-1 ring-emerald-200"
                  >
                    {m}

                    <button
                      type="button"
                      disabled={saving}
                      onClick={() =>
                        setMarcas((prev) =>
                          prev.filter((v) => clave(v) !== clave(m)),
                        )
                      }
                      aria-label={`Quitar ${m}`}
                      className="rounded hover:bg-emerald-100"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <input
                value={marcaInput}
                onChange={(e) => setMarcaInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                    e.preventDefault();

                    if (sugerencias.length > 0) {
                      agregarMarca(sugerencias[0].nombre);
                    } else if (marcaInput.trim()) {
                      agregarMarca(marcaInput);
                    }
                  }
                }}
                placeholder="Buscar o escribir una marca..."
                disabled={saving}
                className={inputClass}
              />

              <button
                type="button"
                disabled={saving || !marcaInput.trim()}
                onClick={() => agregarMarca(marcaInput)}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-emerald-700 px-3 text-xs font-medium text-white hover:bg-emerald-800 disabled:opacity-40"
              >
                <Plus className="h-3.5 w-3.5" />
                Agregar
              </button>
            </div>

            {sugerencias.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {sugerencias.map((m) => (
                  <button
                    type="button"
                    key={m.id}
                    disabled={saving}
                    onClick={() => agregarMarca(m.nombre)}
                    className="rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] text-gray-600 hover:border-emerald-300 hover:text-emerald-700"
                  >
                    + {m.nombre}
                  </button>
                ))}
              </div>
            )}

            {marcaNueva && (
              <p className="mt-2 text-[11px] text-emerald-700">
                «{normalizarMarca(marcaInput)}» se agregará a este representante
                al guardar.
              </p>
            )}

            <p className="mt-2 text-[11px] text-gray-500">
              Agrega cada marca por separado. Las marcas se guardan directamente
              en el registro del representante.
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-lg border border-red-100 bg-red-50 px-3 py-2.5 text-xs text-red-700"
            >
              {error}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
            <div>
              {esEdicion &&
                (confirmandoEliminar ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-red-600">
                      ¿Eliminar definitivamente?
                    </span>

                    <button
                      type="button"
                      onClick={() => void handleEliminar()}
                      disabled={saving}
                      className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      Sí, eliminar
                    </button>

                    <button
                      type="button"
                      onClick={() => setConfirmandoEliminar(false)}
                      disabled={saving}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmandoEliminar(true)}
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Eliminar
                  </button>
                ))}
            </div>

            <div className="ml-auto flex gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="rounded-lg bg-gray-100 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-200"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-orange-600 px-4 py-2 text-xs font-semibold text-white hover:bg-orange-700 disabled:opacity-50"
              >
                {saving
                  ? "Guardando..."
                  : esEdicion
                    ? "Guardar cambios"
                    : "Crear representante"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
