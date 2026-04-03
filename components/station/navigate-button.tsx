"use client"

import { Navigation } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase"
import type { Estacion } from "@/lib/types"

interface NavigateButtonProps {
  station: Estacion
  mapsUrl: string
}

export function NavigateButton({ station, mapsUrl }: NavigateButtonProps) {
  function handleClick() {
    window.open(mapsUrl, "_blank", "noopener,noreferrer")

    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) return
      supabase.from("navigation_history").insert({
        user_id: session.user.id,
        station_id: station.id,
        station_name: station.rotulo,
        station_address: `${station.direccion}, ${station.localidad}`,
        precio_gasolina_95: station.precioGasolina95 ?? null,
        precio_gasolina_98: station.precioGasolina98 ?? null,
        precio_diesel: station.precioDiesel ?? null,
        precio_diesel_premium: station.precioDieselPremium ?? null,
        precio_glp: station.precioGLP ?? null,
      })
    })
  }

  return (
    <Button
      onClick={handleClick}
      className="w-full bg-emerald-500 hover:bg-emerald-600 text-white gap-2"
    >
      <Navigation className="h-4 w-4" />
      Cómo llegar
    </Button>
  )
}
