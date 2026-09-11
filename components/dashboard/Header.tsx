"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Menu, Search, FileText, User, Wrench, ArrowRight } from "lucide-react";

import { supabase } from "@/lib/supabase/client";

type ResultadoBusqueda = {
  id: string;
  tipo: "orden" | "cliente" | "maquina";
  titulo: string;
  descripcion: string;
  detalle?: string;
  ordenId?: string;
};

type UsuarioSesion = {
  nombre: string;
  rol: string;
  avatarUrl?: string;
};

export default function Header() {
  const router = useRouter();

  // ---------------------------------------------------------------
  // USUARIO REAL DE LA SESIÓN (tabla public.usuarios)
  // ---------------------------------------------------------------
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null);

  useEffect(() => {
    async function cargarUsuario() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setUsuario(null);
        return;
      }

      const { data: perfil, error } = await supabase
        .from("usuarios")
        .select("nombre, rol")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("Error cargando perfil de usuario:", error);
        return;
      }

      if (perfil) {
        setUsuario({
          nombre: perfil.nombre,
          rol: perfil.rol,
          // "usuarios" no guarda avatar; se toma de los metadatos
          // de Auth si existe (por ejemplo, si usas login con Google).
          avatarUrl: user.user_metadata?.avatar_url,
        });
      }
    }

    cargarUsuario();

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      cargarUsuario();
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  // ---------------------------------------------------------------
  // BUSCADOR
  // ---------------------------------------------------------------
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [resultados, setResultados] = useState<ResultadoBusqueda[]>([]);
  const [buscando, setBuscando] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ---------------------------------------------------------------
  // CERRAR AL HACER CLIC FUERA
  // ---------------------------------------------------------------
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setSearchOpen(false);
      }
    }

    if (searchOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [searchOpen]);

  // ---------------------------------------------------------------
  // CTRL + K / CMD + K / ESC
  // ---------------------------------------------------------------
  useEffect(() => {
    function handleKeyboard(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();

        setSearchOpen(true);

        setTimeout(() => {
          inputRef.current?.focus();
        }, 0);
      }

      if (event.key === "Escape") {
        setSearchOpen(false);
        setSearchQuery("");
        setResultados([]);
      }
    }

    document.addEventListener("keydown", handleKeyboard);

    return () => {
      document.removeEventListener("keydown", handleKeyboard);
    };
  }, []);

  // ---------------------------------------------------------------
  // BUSCAR EN SUPABASE
  //
  // Busca en:
  // 1. Órdenes
  // 2. Clientes
  // 3. Máquinas
  // ---------------------------------------------------------------
  useEffect(() => {
    const termino = searchQuery.trim();

    if (!termino) {
      setResultados([]);
      setBuscando(false);
      return;
    }

    // Evitamos buscar por una sola letra.
    if (termino.length < 2) {
      setResultados([]);
      setBuscando(false);
      return;
    }

    let cancelado = false;

    const timer = window.setTimeout(async () => {
      setBuscando(true);

      try {
        const resultadosFinales: ResultadoBusqueda[] = [];

        // =========================================================
        // 1. BUSCAR ÓRDENES
        // =========================================================
        //
        // La orden tiene prioridad.
        //
        const { data: ordenes, error: errorOrdenes } = await supabase
          .from("ordenes_servicio")
          .select(
            `
            id,
            numero_orden,
            estado,
            descripcion_problema,
            diagnostico,
            cliente_id,
            maquina_id
          `,
          )
          .or(
            [
              `numero_orden.ilike.%${termino}%`,
              `descripcion_problema.ilike.%${termino}%`,
              `diagnostico.ilike.%${termino}%`,
            ].join(","),
          )
          .limit(5);

        if (errorOrdenes) {
          console.error("Error buscando órdenes:", errorOrdenes);
        }

        if (ordenes && ordenes.length > 0) {
          // -------------------------------------------------------
          // Obtener clientes de las órdenes
          // -------------------------------------------------------
          const clienteIds = [
            ...new Set(
              ordenes.map((orden) => orden.cliente_id).filter(Boolean),
            ),
          ];

          let clientesMap = new Map<string, string>();

          if (clienteIds.length > 0) {
            const { data: clientes } = await supabase
              .from("clientes")
              .select("id, nombre")
              .in("id", clienteIds);

            clientesMap = new Map(
              (clientes ?? []).map((cliente) => [cliente.id, cliente.nombre]),
            );
          }

          // -------------------------------------------------------
          // Obtener máquinas de las órdenes
          // -------------------------------------------------------
          const maquinaIds = [
            ...new Set(
              ordenes.map((orden) => orden.maquina_id).filter(Boolean),
            ),
          ];

          let maquinasMap = new Map<
            string,
            {
              nombre: string;
              modelo: string;
              numero_serie: string;
            }
          >();

          if (maquinaIds.length > 0) {
            const { data: maquinas } = await supabase
              .from("maquinas")
              .select("id, nombre, modelo, numero_serie")
              .in("id", maquinaIds);

            maquinasMap = new Map(
              (maquinas ?? []).map((maquina) => [
                maquina.id,
                {
                  nombre: maquina.nombre ?? "",
                  modelo: maquina.modelo ?? "",
                  numero_serie: maquina.numero_serie ?? "",
                },
              ]),
            );
          }

          // -------------------------------------------------------
          // Crear resultados de órdenes
          // -------------------------------------------------------
          for (const orden of ordenes) {
            const clienteNombre = orden.cliente_id
              ? clientesMap.get(orden.cliente_id)
              : null;

            const maquina = orden.maquina_id
              ? maquinasMap.get(orden.maquina_id)
              : null;

            const maquinaTexto = maquina
              ? [maquina.nombre, maquina.modelo].filter(Boolean).join(" ")
              : "Máquina no especificada";

            resultadosFinales.push({
              id: orden.id,
              tipo: "orden",
              titulo: `#${orden.numero_orden}`,
              descripcion: clienteNombre ?? "Cliente no especificado",
              detalle: `${maquinaTexto} · ${orden.estado ?? "Sin estado"}`,
              ordenId: orden.id,
            });
          }
        }

        // =========================================================
        // 2. BUSCAR CLIENTES
        // =========================================================
        //
        // Los clientes aparecen después de las órdenes.
        //
        const { data: clientesEncontrados, error: errorClientes } =
          await supabase
            .from("clientes")
            .select("id, nombre")
            .ilike("nombre", `%${termino}%`)
            .limit(3);

        if (errorClientes) {
          console.error("Error buscando clientes:", errorClientes);
        }

        if (clientesEncontrados) {
          for (const cliente of clientesEncontrados) {
            resultadosFinales.push({
              id: cliente.id,
              tipo: "cliente",
              titulo: cliente.nombre,
              descripcion: "Cliente",
              detalle: "Ver sus órdenes de servicio",
            });
          }
        }

        // =========================================================
        // 3. BUSCAR MÁQUINAS
        // =========================================================
        //
        // Busca por nombre, modelo o número de serie.
        //
        const { data: maquinasEncontradas, error: errorMaquinas } =
          await supabase
            .from("maquinas")
            .select("id, nombre, modelo, numero_serie")
            .or(
              [
                `nombre.ilike.%${termino}%`,
                `modelo.ilike.%${termino}%`,
                `numero_serie.ilike.%${termino}%`,
              ].join(","),
            )
            .limit(3);

        if (errorMaquinas) {
          console.error("Error buscando máquinas:", errorMaquinas);
        }

        if (maquinasEncontradas) {
          for (const maquina of maquinasEncontradas) {
            resultadosFinales.push({
              id: maquina.id,
              tipo: "maquina",
              titulo:
                [maquina.nombre, maquina.modelo].filter(Boolean).join(" ") ||
                "Máquina",
              descripcion: maquina.numero_serie
                ? `Serie: ${maquina.numero_serie}`
                : "Máquina",
              detalle: "Ver órdenes de servicio",
            });
          }
        }

        if (!cancelado) {
          setResultados(resultadosFinales.slice(0, 8));
        }
      } catch (error) {
        console.error("Error en búsqueda global:", error);

        if (!cancelado) {
          setResultados([]);
        }
      } finally {
        if (!cancelado) {
          setBuscando(false);
        }
      }
    }, 300);

    return () => {
      cancelado = true;
      window.clearTimeout(timer);
    };
  }, [searchQuery]);

  // ---------------------------------------------------------------
  // ABRIR BUSCADOR
  // ---------------------------------------------------------------
  function openSearch() {
    setSearchOpen(true);

    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  }

  // ---------------------------------------------------------------
  // SELECCIONAR RESULTADO
  // ---------------------------------------------------------------
  function seleccionarResultado(resultado: ResultadoBusqueda) {
    // -------------------------------------------------------------
    // ORDEN
    // -------------------------------------------------------------
    if (resultado.tipo === "orden" && resultado.ordenId) {
      router.push(
        `/ordenes?orden=${encodeURIComponent(resultado.ordenId)}&tab=resumen`,
      );

      setSearchOpen(false);
      setSearchQuery("");
      setResultados([]);

      return;
    }

    // -------------------------------------------------------------
    // CLIENTE
    // -------------------------------------------------------------
    if (resultado.tipo === "cliente") {
      // Por ahora buscamos las órdenes de ese cliente.
      //
      // Si después creamos /clientes/[id], podemos cambiar
      // fácilmente esta navegación.
      router.push(`/ordenes?cliente=${encodeURIComponent(resultado.id)}`);

      setSearchOpen(false);
      setSearchQuery("");
      setResultados([]);

      return;
    }

    // -------------------------------------------------------------
    // MÁQUINA
    // -------------------------------------------------------------
    if (resultado.tipo === "maquina") {
      // Igual que con clientes:
      // posteriormente podemos llevarlo a /maquinas/[id].
      router.push(`/ordenes?maquina=${encodeURIComponent(resultado.id)}`);

      setSearchOpen(false);
      setSearchQuery("");
      setResultados([]);

      return;
    }
  }

  // ---------------------------------------------------------------
  // ICONO SEGÚN TIPO
  // ---------------------------------------------------------------
  function getResultadoIcon(tipo: ResultadoBusqueda["tipo"]) {
    if (tipo === "orden") {
      return <FileText size={16} />;
    }

    if (tipo === "cliente") {
      return <User size={16} />;
    }

    return <Wrench size={16} />;
  }

  // ---------------------------------------------------------------
  // COLOR SEGÚN TIPO
  // ---------------------------------------------------------------
  function getResultadoIconClass(tipo: ResultadoBusqueda["tipo"]) {
    if (tipo === "orden") {
      return "bg-orange-50 text-orange-600";
    }

    if (tipo === "cliente") {
      return "bg-blue-50 text-blue-600";
    }

    return "bg-emerald-50 text-emerald-600";
  }

  // ---------------------------------------------------------------
  // INICIALES DEL USUARIO (fallback si no hay avatar)
  // ---------------------------------------------------------------
  function getIniciales(nombre: string) {
    return nombre
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }

  // ---------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-4 bg-slate-900 px-4 text-white lg:px-6">
      {/* ===========================================================
          OVERLAY
      ============================================================ */}
      {searchOpen && (
        <div
          className="fixed inset-0 z-[-1] bg-slate-950/40 backdrop-blur-[2px]"
          onClick={() => setSearchOpen(false)}
        />
      )}

      {/* ===========================================================
          MENÚ MOBILE
      ============================================================ */}
      <button
        type="button"
        className={`rounded-lg p-2 transition-all duration-300 lg:hidden ${
          searchOpen
            ? "pointer-events-none opacity-20 blur-[2px]"
            : "hover:bg-slate-800"
        }`}
      >
        <Menu size={20} />
      </button>

      {/* ===========================================================
          BUSCADOR GLOBAL
      ============================================================ */}
      <div
        ref={searchRef}
        className={`relative transition-all duration-300 ${
          searchOpen
            ? "fixed left-1/2 top-3 z-50 w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2"
            : "z-10 flex-1 max-w-xl"
        }`}
      >
        {/* ---------------------------------------------------------
            INPUT
        ---------------------------------------------------------- */}
        <div
          onClick={openSearch}
          className={`flex h-10 items-center gap-2 rounded-lg border px-3 text-slate-400 transition-all duration-300 ${
            searchOpen
              ? "border-blue-500 bg-slate-800 shadow-2xl ring-2 ring-blue-500/20"
              : "border-slate-700 bg-slate-800/80 hover:border-slate-600"
          }`}
        >
          <Search size={16} className="flex-shrink-0" />

          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            onFocus={() => setSearchOpen(true)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && resultados.length > 0) {
                seleccionarResultado(resultados[0]);
              }
            }}
            placeholder="Buscar orden, máquina, cliente..."
            className="flex-1 bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
          />

          {/* -------------------------------------------------------
              LIMPIAR
          -------------------------------------------------------- */}
          {searchQuery && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();

                setSearchQuery("");
                setResultados([]);

                inputRef.current?.focus();
              }}
              className="flex h-5 w-5 items-center justify-center rounded-full text-slate-400 hover:bg-slate-700 hover:text-white"
            >
              ×
            </button>
          )}

          {/* -------------------------------------------------------
              ATAJO
          -------------------------------------------------------- */}
          <kbd className="hidden items-center gap-0.5 rounded border border-slate-600 px-1.5 py-0.5 text-[11px] text-slate-400 sm:inline-flex">
            ⌘K
          </kbd>
        </div>

        {/* =========================================================
            RESULTADOS
        ========================================================== */}
        {searchOpen && (
          <div className="absolute left-0 right-0 top-12 overflow-hidden rounded-xl border border-slate-700 bg-white text-slate-800 shadow-2xl">
            {/* -----------------------------------------------------
                SIN TEXTO
            ------------------------------------------------------ */}
            {!searchQuery.trim() && (
              <div className="px-5 py-7">
                <div className="mb-4">
                  <p className="text-sm font-semibold text-gray-800">
                    Búsqueda global
                  </p>

                  <p className="mt-1 text-xs text-gray-400">
                    Busca órdenes, clientes o máquinas.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-lg border border-gray-100 p-3">
                    <FileText className="mb-2 h-4 w-4 text-orange-500" />

                    <p className="text-xs font-medium text-gray-700">Órdenes</p>

                    <p className="mt-1 text-[10px] text-gray-400">
                      Número, problema y diagnóstico
                    </p>
                  </div>

                  <div className="rounded-lg border border-gray-100 p-3">
                    <User className="mb-2 h-4 w-4 text-blue-500" />

                    <p className="text-xs font-medium text-gray-700">
                      Clientes
                    </p>

                    <p className="mt-1 text-[10px] text-gray-400">
                      Nombre del cliente
                    </p>
                  </div>

                  <div className="rounded-lg border border-gray-100 p-3">
                    <Wrench className="mb-2 h-4 w-4 text-emerald-500" />

                    <p className="text-xs font-medium text-gray-700">
                      Máquinas
                    </p>

                    <p className="mt-1 text-[10px] text-gray-400">
                      Modelo y número de serie
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* -----------------------------------------------------
                BUSCANDO
            ------------------------------------------------------ */}
            {searchQuery.trim() && buscando && (
              <div className="px-4 py-7 text-center">
                <div className="mx-auto mb-3 h-5 w-5 animate-spin rounded-full border-2 border-gray-200 border-t-orange-500" />

                <p className="text-xs text-gray-500">Buscando...</p>
              </div>
            )}

            {/* -----------------------------------------------------
                SIN RESULTADOS
            ------------------------------------------------------ */}
            {searchQuery.trim() && !buscando && resultados.length === 0 && (
              <div className="px-4 py-8 text-center">
                <Search className="mx-auto mb-2 h-5 w-5 text-gray-300" />

                <p className="text-sm font-medium text-gray-500">
                  No se encontraron resultados
                </p>

                <p className="mt-1 text-xs text-gray-400">
                  Prueba con otro número de orden, cliente o máquina.
                </p>
              </div>
            )}

            {/* -----------------------------------------------------
                RESULTADOS
            ------------------------------------------------------ */}
            {searchQuery.trim() && !buscando && resultados.length > 0 && (
              <div className="py-2">
                {/* ORDENES */}
                {resultados.some((resultado) => resultado.tipo === "orden") && (
                  <div className="px-4 pb-1 pt-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                      Órdenes
                    </p>
                  </div>
                )}

                {resultados.map((resultado) => (
                  <button
                    key={`${resultado.tipo}-${resultado.id}`}
                    type="button"
                    onClick={() => seleccionarResultado(resultado)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50"
                  >
                    <div
                      className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${getResultadoIconClass(
                        resultado.tipo,
                      )}`}
                    >
                      {getResultadoIcon(resultado.tipo)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-gray-900">
                        {resultado.titulo}
                      </p>

                      <p className="truncate text-[11px] text-gray-500">
                        {resultado.descripcion}
                      </p>

                      {resultado.detalle && (
                        <p className="truncate text-[10px] text-gray-400">
                          {resultado.detalle}
                        </p>
                      )}
                    </div>

                    <ArrowRight
                      size={14}
                      className="flex-shrink-0 text-gray-300"
                    />
                  </button>
                ))}

                {/* -------------------------------------------------
                      VER TODOS
                  -------------------------------------------------- */}
                {resultados.length >= 8 && (
                  <div className="border-t border-gray-100 px-4 py-2">
                    <button
                      type="button"
                      onClick={() =>
                        router.push(
                          `/buscar?q=${encodeURIComponent(searchQuery.trim())}`,
                        )
                      }
                      className="flex w-full items-center justify-center gap-1 py-2 text-xs font-medium text-orange-600 hover:text-orange-700"
                    >
                      Ver todos los resultados
                      <ArrowRight size={13} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ===========================================================
          PERFIL DEL USUARIO
      ============================================================ */}
      <div
        className={`ml-auto flex items-center gap-2 transition-all duration-300 ${
          searchOpen
            ? "pointer-events-none opacity-20 blur-[3px]"
            : "opacity-100"
        }`}
      >
        {usuario && (
          <div className="flex items-center gap-2 rounded-full py-1 pl-2 pr-3">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-orange-600 text-xs font-semibold uppercase">
              {usuario.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={usuario.avatarUrl}
                  alt={usuario.nombre}
                  className="h-full w-full object-cover"
                />
              ) : (
                getIniciales(usuario.nombre)
              )}
            </div>

            <div className="hidden text-left leading-tight md:block">
              <p className="text-sm font-medium text-white">
                {usuario.nombre}
              </p>

              <p className="text-[11px] text-slate-400">{usuario.rol}</p>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}