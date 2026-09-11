import { NextRequest, NextResponse } from "next/server";

const SRE_API_URL = "https://sre.cl/api/company_info";

function limpiarRut(rut: string) {
  return rut.replace(/\./g, "").replace(/\s/g, "").trim();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rut = limpiarRut(body.rut ?? "");

    if (!rut) {
      return NextResponse.json(
        { error: "Debes ingresar un RUT." },
        { status: 400 },
      );
    }

    const token = process.env.SRE_API_TOKEN;

    if (!token) {
      console.error("Falta configurar SRE_API_TOKEN");

      return NextResponse.json(
        { error: "Error de configuración del servidor." },
        { status: 500 },
      );
    }

    const response = await fetch(SRE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token,
        rut,
        version: "2.0",
      }),
      cache: "no-store",
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Error API SRE:", data);

      return NextResponse.json(
        {
          error:
            data?.message ||
            data?.error ||
            "No fue posible encontrar información para este RUT.",
        },
        { status: response.status },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error buscando RUT:", error);

    return NextResponse.json(
      {
        error: "Ocurrió un error al consultar la información del RUT.",
      },
      { status: 500 },
    );
  }
}