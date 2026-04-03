"use client"

import { useEffect, useRef } from "react"
import type * as LeafletType from "leaflet"
import type { Estacion, FuelType, Charger } from "@/lib/types"
import type { BadgeType } from "@/lib/scoring"
import { formatChargerPrice } from "@/lib/charger-utils"

declare const L: typeof LeafletType

interface LeafletMapProps {
  stations: Estacion[]
  chargers?: Charger[]
  fuelType: FuelType
  badges?: Record<string, BadgeType>
  userLat?: number
  userLng?: number
  centerLat?: number
  centerLng?: number
  zoom?: number
  onStationSelect?: (station: Estacion) => void
  onChargerSelect?: (charger: Charger) => void
  onMapMove?: (lat: number, lng: number) => void
}

function getPriceForFuel(station: Estacion, fuel: FuelType): number | undefined {
  const map: Record<FuelType, number | undefined> = {
    gasolina95: station.precioGasolina95,
    gasolina98: station.precioGasolina98,
    diesel: station.precioDiesel,
    dieselPremium: station.precioDieselPremium,
    glp: station.precioGLP,
    electric: undefined,
  }
  return map[fuel]
}

function getPriceColor(price: number, prices: number[]): string {
  if (!prices.length) return "#6b7280"
  const sorted = [...prices].sort((a, b) => a - b)
  const p25 = sorted[Math.floor(sorted.length * 0.25)]
  const p75 = sorted[Math.floor(sorted.length * 0.75)]
  if (price <= p25) return "#10b981"
  if (price <= p75) return "#f59e0b"
  return "#ef4444"
}

function createPriceMarker(price: number | undefined, color: string, badge?: BadgeType): string {
  const label = price !== undefined ? price.toFixed(3).replace(".", ",") : "—"

  let border = "2px solid rgba(255,255,255,0.9)"
  let extra = ""

  if (badge === "mejor_opcion") {
    border = "2px solid #f59e0b"
    extra = `box-shadow:0 0 0 2px #f59e0b,0 2px 8px rgba(0,0,0,0.3);`
  } else if (badge === "mejor_precio") {
    border = "2px solid white"
    extra = `box-shadow:0 0 0 2px rgba(16,185,129,0.8),0 2px 8px rgba(0,0,0,0.25);`
  } else if (badge === "mas_cercana") {
    border = "2px solid #3b82f6"
    extra = `box-shadow:0 0 0 2px #3b82f6,0 2px 8px rgba(0,0,0,0.25);`
  }

  return `<div style="background:${color};color:white;padding:3px 7px;border-radius:8px;font-size:11px;font-weight:700;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.25);border:${border};${extra}cursor:pointer;font-family:system-ui,sans-serif">${label}</div>`
}

function getChargerStatusColor(status: string): string {
  if (status === "operational") return "#10b981"
  if (status === "unavailable") return "#94a3b8"
  return "#f59e0b"
}

function createChargerMarker(charger: Charger): string {
  const statusColor = getChargerStatusColor(charger.status)
  const maxPower = charger.connectors?.reduce((max, c) => Math.max(max, c.power_kw ?? 0), 0) ?? 0
  const powerLabel = maxPower > 0 ? `${maxPower}kW` : "EV"

  return `
    <div style="position:relative;cursor:pointer">
      <div style="
        background:#fbbf24;
        color:#1e293b;
        padding:3px 7px;
        border-radius:8px;
        font-size:11px;
        font-weight:700;
        white-space:nowrap;
        box-shadow:0 2px 8px rgba(251,191,36,0.5),0 0 0 2px rgba(251,191,36,0.3);
        border:2px solid white;
        display:flex;
        align-items:center;
        gap:3px;
        font-family:system-ui,sans-serif;
        animation:chargerPulse 2.5s ease-in-out infinite;
      ">
        <span style="color:#1e293b;font-size:10px;">⚡</span>${powerLabel}
      </div>
      <div style="
        position:absolute;
        bottom:-3px;
        right:-3px;
        width:8px;
        height:8px;
        background:${statusColor};
        border-radius:50%;
        border:1.5px solid white;
      "></div>
    </div>
  `
}

export default function LeafletMap({
  stations,
  chargers = [],
  fuelType,
  badges = {},
  userLat,
  userLng,
  centerLat = 40.4168,
  centerLng = -3.7038,
  zoom = 13,
  onStationSelect,
  onChargerSelect,
  onMapMove,
}: LeafletMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletType.Map | null>(null)
  const markersRef = useRef<LeafletType.Layer[]>([])
  const onMapMoveRef = useRef(onMapMove)
  const onStationSelectRef = useRef(onStationSelect)
  const onChargerSelectRef = useRef(onChargerSelect)
  const stationsRef = useRef(stations)
  const chargersRef = useRef(chargers)
  const fuelTypeRef = useRef(fuelType)
  const badgesRef = useRef(badges)
  const userLatRef = useRef(userLat)
  const userLngRef = useRef(userLng)

  useEffect(() => { onMapMoveRef.current = onMapMove }, [onMapMove])
  useEffect(() => { onStationSelectRef.current = onStationSelect }, [onStationSelect])
  useEffect(() => { onChargerSelectRef.current = onChargerSelect }, [onChargerSelect])

  function renderMarkers(map: LeafletType.Map) {
    markersRef.current.forEach((m) => map.removeLayer(m))
    markersRef.current = []

    const currentStations = stationsRef.current
    const currentChargers = chargersRef.current
    const currentFuel = fuelTypeRef.current
    const currentBadges = badgesRef.current
    const uLat = userLatRef.current
    const uLng = userLngRef.current

    if (uLat !== undefined && uLng !== undefined) {
      const userIcon = L.divIcon({
        html: `<div style="width:14px;height:14px;background:#3b82f6;border:3px solid white;border-radius:50%;box-shadow:0 0 0 3px rgba(59,130,246,0.3)"></div>`,
        className: "",
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      })
      markersRef.current.push(L.marker([uLat, uLng], { icon: userIcon }).addTo(map))
    }

    const prices = currentStations
      .map((s) => getPriceForFuel(s, currentFuel))
      .filter((p): p is number => p !== undefined)

    currentStations.forEach((station) => {
      if (!station.latitud || !station.longitud) return
      const price = getPriceForFuel(station, currentFuel)
      const color = price !== undefined ? getPriceColor(price, prices) : "#6b7280"
      const badge = currentBadges[station.id]

      const icon = L.divIcon({
        html: createPriceMarker(price, color, badge),
        className: "",
        iconSize: [60, 24],
        iconAnchor: [30, 12],
      })

      const marker = L.marker([station.latitud, station.longitud], { icon })
      const popupContent = `
        <div style="font-family:system-ui,sans-serif;min-width:180px;padding:4px">
          <div style="font-weight:700;font-size:14px;color:#0f172a;margin-bottom:4px">${station.rotulo}</div>
          <div style="font-size:12px;color:#64748b;margin-bottom:8px">${station.direccion}, ${station.localidad}</div>
          ${price !== undefined ? `<div style="font-size:18px;font-weight:800;color:${color};margin-bottom:8px">${price.toFixed(3).replace(".", ",")} €/L</div>` : ""}
          <div style="display:flex;gap:6px">
            <a href="/estacion/${station.id}" style="flex:1;padding:5px;background:#f1f5f9;border-radius:6px;text-align:center;font-size:11px;font-weight:600;color:#0f172a;text-decoration:none">Ver detalles</a>
            <a href="https://www.google.com/maps/dir/?api=1&destination=${station.latitud},${station.longitud}" target="_blank" style="flex:1;padding:5px;background:#10b981;border-radius:6px;text-align:center;font-size:11px;font-weight:600;color:white;text-decoration:none">Cómo llegar</a>
          </div>
        </div>
      `
      marker.bindPopup(popupContent, { maxWidth: 240, className: "leaflet-popup-custom" })
      marker.on("click", () => {
        onStationSelectRef.current?.(station)
        marker.closePopup()
      })
      marker.addTo(map)
      markersRef.current.push(marker)
    })

    currentChargers.forEach((charger) => {
      if (!charger.lat || !charger.lng) return

      const icon = L.divIcon({
        html: createChargerMarker(charger),
        className: "",
        iconSize: [70, 28],
        iconAnchor: [35, 14],
      })

      const connectors = charger.connectors ?? []
      const seenPlugs = new Map<string, boolean>()
      const plugList = connectors
        .map((c) => c.plug_type_label || c.plug_type)
        .filter((v) => { if (seenPlugs.has(v)) return false; seenPlugs.set(v, true); return true })
        .slice(0, 3)
        .join(", ")
      const maxPower = connectors.reduce((max, c) => Math.max(max, c.power_kw ?? 0), 0)
      const priceStr = formatChargerPrice(charger)

      const marker = L.marker([charger.lat, charger.lng], { icon })
      const popupContent = `
        <div style="font-family:system-ui,sans-serif;min-width:200px;padding:4px">
          <div style="font-weight:700;font-size:14px;color:#0f172a;margin-bottom:4px">${charger.name || charger.operator_name || "Cargador EV"}</div>
          <div style="font-size:12px;color:#64748b;margin-bottom:6px">${charger.address}, ${charger.city}</div>
          ${plugList ? `<div style="font-size:11px;color:#475569;margin-bottom:4px">${plugList}</div>` : ""}
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
            <div style="font-size:16px;font-weight:800;color:#d97706">${priceStr}</div>
            ${maxPower > 0 ? `<div style="font-size:11px;font-weight:600;color:#64748b">${maxPower} kW</div>` : ""}
          </div>
          <div style="display:flex;gap:6px">
            <a href="/cargador/${charger.id}" style="flex:1;padding:5px;background:#f1f5f9;border-radius:6px;text-align:center;font-size:11px;font-weight:600;color:#0f172a;text-decoration:none">Ver detalles</a>
            <a href="https://www.google.com/maps/dir/?api=1&destination=${charger.lat},${charger.lng}" target="_blank" style="flex:1;padding:5px;background:#fbbf24;border-radius:6px;text-align:center;font-size:11px;font-weight:600;color:#1e293b;text-decoration:none">Cómo llegar</a>
          </div>
        </div>
      `
      marker.bindPopup(popupContent, { maxWidth: 260, className: "leaflet-popup-custom" })
      marker.on("click", () => {
        onChargerSelectRef.current?.(charger)
        marker.closePopup()
      })
      marker.addTo(map)
      markersRef.current.push(marker)
    })
  }

  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current) return

    function tryInit() {
      if (mapRef.current || !containerRef.current) return
      const win = window as unknown as { L?: typeof LeafletType }
      if (!win.L) return

      const map = L.map(containerRef.current, {
        dragging: true,
        touchZoom: true,
        scrollWheelZoom: true,
        doubleClickZoom: true,
        boxZoom: false,
        keyboard: true,
        zoomControl: true,
      })

      map.setView([centerLat, centerLng], zoom)

      L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
        maxZoom: 19,
      }).addTo(map)

      map.on("moveend", () => {
        const center = map.getCenter()
        onMapMoveRef.current?.(center.lat, center.lng)
      })

      mapRef.current = map
      renderMarkers(map)
    }

    tryInit()

    if (!mapRef.current) {
      const interval = setInterval(() => {
        tryInit()
        if (mapRef.current) clearInterval(interval)
      }, 50)
      return () => clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    stationsRef.current = stations
    chargersRef.current = chargers
    fuelTypeRef.current = fuelType
    badgesRef.current = badges
    userLatRef.current = userLat
    userLngRef.current = userLng
    if (mapRef.current) renderMarkers(mapRef.current)
  }, [stations, chargers, fuelType, badges, userLat, userLng])

  const initialCenterSet = useRef(false)

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (!initialCenterSet.current) {
      initialCenterSet.current = true
      return
    }
    map.panTo([centerLat, centerLng])
  }, [centerLat, centerLng])

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ minHeight: "400px" }}
    />
  )
}
