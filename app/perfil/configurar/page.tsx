"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  User, Car, MapPin, Check, ChevronRight, Zap,
  Droplets, Star, BatteryCharging, Flame, Leaf, PlugZap,
  Sparkles, ArrowLeft, Shield,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { createClient } from "@/lib/supabase"
import { CAR_MAKES, getModelsForMake } from "@/lib/car-data"
import type { FuelType } from "@/lib/types"
import { cn } from "@/lib/utils"
import {
  SuvIcon, BerlinaIcon, MonovolumenIcon, UrbanoIcon,
  RancheraIcon, DeportivoIcon, DescapotableIcon, ComercialIcon,
} from "@/components/cars"
import { ConnectorTypePicker } from "@/components/connector-type-picker"

const STEPS = ["perfil", "vehiculo", "listo"] as const
type Step = (typeof STEPS)[number]

const FUEL_OPTIONS: { value: FuelType; label: string; icon: React.ReactNode; bg: string; text: string; border: string }[] = [
  { value: "gasolina95", label: "Gasolina 95", icon: <Droplets className="h-4 w-4" />, bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  { value: "gasolina98", label: "Gasolina 98", icon: <Star className="h-4 w-4" />, bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  { value: "diesel", label: "Diésel", icon: <Droplets className="h-4 w-4" />, bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  { value: "dieselPremium", label: "Diésel Premium", icon: <Star className="h-4 w-4" />, bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  { value: "glp", label: "GLP / Gas", icon: <Zap className="h-4 w-4" />, bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-200" },
  { value: "electric", label: "Eléctrico", icon: <BatteryCharging className="h-4 w-4" />, bg: "bg-sky-50", text: "text-sky-700", border: "border-sky-200" },
]

const BODY_TYPES: { value: string; label: string; icon: React.ElementType }[] = [
  { value: "suv", label: "SUV / 4x4", icon: SuvIcon },
  { value: "sedan", label: "Berlina", icon: BerlinaIcon },
  { value: "monovolumen", label: "Monovolumen", icon: MonovolumenIcon },
  { value: "urbano", label: "Urbano", icon: UrbanoIcon },
  { value: "ranchera", label: "Ranchera", icon: RancheraIcon },
  { value: "deportivo", label: "Deportivo", icon: DeportivoIcon },
  { value: "descapotable", label: "Descapotable", icon: DescapotableIcon },
  { value: "comercial", label: "Comercial", icon: ComercialIcon },
]

const POWERTRAIN_OPTIONS: { value: string; label: string; icon: React.ReactNode; bg: string; text: string; border: string }[] = [
  { value: "combustion", label: "Combustión", icon: <Flame className="h-4 w-4" />, bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  { value: "hybrid", label: "Híbrido", icon: <Leaf className="h-4 w-4" />, bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  { value: "plugin_hybrid", label: "Híbrido enchufable", icon: <PlugZap className="h-4 w-4" />, bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  { value: "electric", label: "Eléctrico", icon: <BatteryCharging className="h-4 w-4" />, bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-200" },
]

interface VehicleForm {
  car_make: string
  car_model: string
  nickname: string
  powertrain: string
  fuel_type: FuelType
  body_type: string
  connector_type: string
  tank_litres: string
}

const EMPTY_VEHICLE: VehicleForm = {
  car_make: "", car_model: "", nickname: "", powertrain: "",
  fuel_type: "gasolina95", body_type: "", connector_type: "", tank_litres: "50",
}

export default function ProfileSetupPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>("perfil")
  const [userId, setUserId] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [displayName, setDisplayName] = useState("")
  const [postcode, setPostcode] = useState("")
  const [location, setLocation] = useState("")

  const [vehicle, setVehicle] = useState<VehicleForm>(EMPTY_VEHICLE)
  const [enriching, setEnriching] = useState(false)
  const [enriched, setEnriched] = useState(false)
  const [skipVehicle, setSkipVehicle] = useState(false)

  const models = getModelsForMake(vehicle.car_make)
  const isEV = vehicle.powertrain === "electric"
  const isPHEV = vehicle.powertrain === "plugin_hybrid"

  useEffect(() => {
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) { router.replace("/auth/login"); return }
      setUserId(session.user.id)
      const meta = session.user.user_metadata as Record<string, string> | null
      if (meta?.full_name) setDisplayName(meta.full_name)
      setLoading(false)
    })
    return () => { subscription.unsubscribe() }
  }, [router])

  const handleModelSelect = useCallback(async (model: string) => {
    setVehicle((prev) => ({ ...prev, car_model: model }))
    if (!vehicle.car_make || !model) return
    setEnriching(true)
    setEnriched(false)
    try {
      const res = await fetch(`/api/vehicle-info?action=enrich&make=${encodeURIComponent(vehicle.car_make)}&model=${encodeURIComponent(model)}`)
      if (res.ok) {
        const data = await res.json() as { powertrain: string | null; fuel_type: string | null; body_type: string | null }
        setVehicle((prev) => {
          const powertrain = data.powertrain ?? prev.powertrain
          const isElectric = powertrain === "electric"
          return {
            ...prev,
            car_model: model,
            powertrain: data.powertrain ?? prev.powertrain,
            body_type: data.body_type ?? prev.body_type,
            fuel_type: data.fuel_type
              ? (data.fuel_type as FuelType)
              : isElectric ? "electric"
              : prev.fuel_type === "electric" ? "gasolina95" : prev.fuel_type,
          }
        })
        if (data.powertrain || data.fuel_type || data.body_type) setEnriched(true)
      }
    } catch { /* ignore */ }
    setEnriching(false)
  }, [vehicle.car_make])

  async function handleProfileSave() {
    setError(null)
    if (!displayName.trim()) { setError("Introduce tu nombre."); return }
    setSaving(true)
    const supabase = createClient()
    const { error: dbError } = await supabase
      .from("profiles")
      .update({ display_name: displayName.trim(), postcode: postcode.trim(), location: location.trim(), updated_at: new Date().toISOString() })
      .eq("id", userId)
    if (dbError) { setError("No se pudieron guardar los datos."); setSaving(false); return }
    setSaving(false)
    setStep("vehiculo")
  }

  async function handleVehicleSave() {
    setError(null)
    if (!vehicle.car_make) { setError("Selecciona la marca del vehículo."); return }
    setSaving(true)
    const supabase = createClient()
    const nickname = vehicle.nickname.trim() || (vehicle.car_model ? `${vehicle.car_make} ${vehicle.car_model}` : vehicle.car_make)
    const { error: dbError } = await supabase.from("vehicles").insert({
      user_id: userId,
      nickname,
      fuel_type: vehicle.fuel_type,
      tank_litres: parseFloat(vehicle.tank_litres) || 50,
      car_make: vehicle.car_make,
      car_model: vehicle.car_model,
      body_type: vehicle.body_type,
      powertrain: vehicle.powertrain,
      connector_type: vehicle.connector_type || null,
    })
    if (dbError) { setError("No se pudo guardar el vehículo."); setSaving(false); return }
    setSaving(false)
    setStep("listo")
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const stepIndex = STEPS.indexOf(step)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">

          <div className="mb-8 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-lg shadow-emerald-200 mb-4">
              <Shield className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900">Configura tu perfil</h1>
            <p className="text-slate-500 text-sm mt-1">Solo te llevará un minuto</p>
          </div>

          <div className="flex items-center justify-center gap-2 mb-8">
            {(["perfil", "vehiculo"] as const).map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all",
                  step === s ? "bg-emerald-700 text-white shadow-md" :
                  stepIndex > i ? "bg-emerald-100 text-emerald-700" :
                  "bg-slate-100 text-slate-400"
                )}>
                  {stepIndex > i ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                <span className={cn(
                  "text-xs font-medium hidden sm:block",
                  step === s ? "text-slate-800" : "text-slate-400"
                )}>
                  {s === "perfil" ? "Tu perfil" : "Tu vehículo"}
                </span>
                {i < 1 && <div className={cn("w-8 h-px mx-1", stepIndex > i ? "bg-emerald-300" : "bg-slate-200")} />}
              </div>
            ))}
          </div>

          {step === "perfil" && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 pt-6 pb-2 border-b border-slate-100">
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center">
                    <User className="h-5 w-5 text-emerald-700" />
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-900">Información personal</h2>
                    <p className="text-xs text-slate-500">Cómo quieres que te llamemos</p>
                  </div>
                </div>
              </div>

              <div className="px-6 py-5 space-y-4">
                {error && <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-slate-700">Tu nombre</Label>
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Pedro García"
                    className="border-slate-200 focus-visible:ring-emerald-400 focus-visible:border-emerald-400 h-11 text-base"
                    autoFocus
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    Localidad
                    <span className="text-slate-400 font-normal text-xs">(opcional)</span>
                  </Label>
                  <Input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Madrid, Barcelona..."
                    className="border-slate-200 focus-visible:ring-emerald-400 focus-visible:border-emerald-400 h-11"
                  />
                  <p className="text-xs text-slate-400">Se usa para mostrar gasolineras cercanas en tu perfil</p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                    Código postal
                    <span className="text-slate-400 font-normal text-xs">(opcional)</span>
                  </Label>
                  <Input
                    value={postcode}
                    onChange={(e) => setPostcode(e.target.value)}
                    placeholder="28001"
                    maxLength={5}
                    className="border-slate-200 focus-visible:ring-emerald-400 focus-visible:border-emerald-400 h-11"
                  />
                </div>

                <Button
                  onClick={handleProfileSave}
                  disabled={saving || !displayName.trim()}
                  className="w-full bg-emerald-700 hover:bg-emerald-800 text-white h-11 font-semibold gap-2 mt-2"
                >
                  {saving ? "Guardando..." : "Continuar"}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {step === "vehiculo" && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 pt-6 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center">
                    <Car className="h-5 w-5 text-emerald-700" />
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-900">Tu vehículo principal</h2>
                    <p className="text-xs text-slate-500">Para calcular ahorros y mostrar precios relevantes</p>
                  </div>
                </div>
              </div>

              <div className="px-6 py-5 space-y-4">
                {error && <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-slate-700">Marca</Label>
                  <Select
                    value={vehicle.car_make}
                    onValueChange={(val) => { setVehicle((prev) => ({ ...prev, car_make: val, car_model: "" })); setEnriched(false) }}
                  >
                    <SelectTrigger className="border-slate-200 bg-white h-11">
                      <SelectValue placeholder="Selecciona la marca..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-64">
                      {CAR_MAKES.map((make) => (
                        <SelectItem key={make} value={make}>{make}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {vehicle.car_make && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium text-slate-700">Modelo</Label>
                      {enriching && (
                        <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 animate-pulse">
                          <Sparkles className="h-3 w-3" />
                          Detectando datos...
                        </span>
                      )}
                      {enriched && !enriching && (
                        <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                          <Sparkles className="h-3 w-3" />
                          Datos completados automáticamente
                        </span>
                      )}
                    </div>
                    {models.length > 0 ? (
                      <Select value={vehicle.car_model} onValueChange={handleModelSelect}>
                        <SelectTrigger className="border-slate-200 bg-white h-11">
                          <SelectValue placeholder="Selecciona el modelo..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-64">
                          {models.map((m) => (
                            <SelectItem key={m} value={m}>{m}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        value={vehicle.car_model}
                        onChange={(e) => setVehicle((prev) => ({ ...prev, car_model: e.target.value }))}
                        placeholder="Escribe el modelo..."
                        className="border-slate-200 focus-visible:ring-emerald-400 h-11"
                      />
                    )}
                  </div>
                )}

                {vehicle.car_make && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700">Carrocería</Label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {BODY_TYPES.map((bt) => {
                          const IconComp = bt.icon
                          const selected = vehicle.body_type === bt.value
                          return (
                            <button
                              key={bt.value}
                              type="button"
                              onClick={() => setVehicle((prev) => ({ ...prev, body_type: selected ? "" : bt.value }))}
                              className={cn(
                                "flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all text-center",
                                selected
                                  ? "border-emerald-500 bg-emerald-50 text-slate-900"
                                  : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                              )}
                            >
                              <IconComp className={cn("w-10 h-6", selected ? "text-slate-900" : "text-slate-400")} />
                              <span className="text-[10px] font-medium leading-tight">{bt.label}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700">Propulsión</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {POWERTRAIN_OPTIONS.map((pt) => {
                          const selected = vehicle.powertrain === pt.value
                          return (
                            <button
                              key={pt.value}
                              type="button"
                              onClick={() => {
                                const isElectric = pt.value === "electric"
                                setVehicle((prev) => ({
                                  ...prev,
                                  powertrain: selected ? "" : pt.value,
                                  fuel_type: isElectric ? "electric" : prev.fuel_type === "electric" ? "gasolina95" : prev.fuel_type,
                                }))
                              }}
                              className={cn(
                                "flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all text-left",
                                selected
                                  ? cn(pt.bg, pt.text, pt.border, "border-2")
                                  : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                              )}
                            >
                              {pt.icon}
                              {pt.label}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {!isEV && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-slate-700">Combustible</Label>
                        <div className="grid grid-cols-2 gap-2">
                          {FUEL_OPTIONS.filter((f) => f.value !== "electric").map((f) => {
                            const selected = vehicle.fuel_type === f.value
                            return (
                              <button
                                key={f.value}
                                type="button"
                                onClick={() => setVehicle((prev) => ({ ...prev, fuel_type: f.value }))}
                                className={cn(
                                  "flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all text-left",
                                  selected
                                    ? cn(f.bg, f.text, f.border, "border-2")
                                    : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                                )}
                              >
                                {f.icon}
                                {f.label}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {(isEV || isPHEV) && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-slate-700">Conector de carga</Label>
                        <ConnectorTypePicker value={vehicle.connector_type} onChange={(val) => setVehicle((prev) => ({ ...prev, connector_type: val }))} size="sm" />
                      </div>
                    )}

                    {!isEV && (
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium text-slate-700">Depósito (litros)</Label>
                        <Input
                          type="number"
                          value={vehicle.tank_litres}
                          onChange={(e) => setVehicle((prev) => ({ ...prev, tank_litres: e.target.value }))}
                          placeholder="50"
                          min="1"
                          max="200"
                          className="border-slate-200 focus-visible:ring-emerald-400 h-11"
                        />
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                        Nombre personalizado
                        <span className="text-slate-400 font-normal text-xs">(opcional)</span>
                      </Label>
                      <Input
                        value={vehicle.nickname}
                        onChange={(e) => setVehicle((prev) => ({ ...prev, nickname: e.target.value }))}
                        placeholder={vehicle.car_model ? `${vehicle.car_make} ${vehicle.car_model}` : "Mi coche"}
                        className="border-slate-200 focus-visible:ring-emerald-400 h-11"
                      />
                    </div>
                  </>
                )}

                <div className="flex gap-2 pt-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setStep("perfil")}
                    className="gap-1.5 text-slate-500"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Atrás
                  </Button>
                  <Button
                    onClick={handleVehicleSave}
                    disabled={saving || enriching || !vehicle.car_make}
                    className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white h-11 font-semibold gap-2"
                  >
                    {saving ? "Guardando..." : "Guardar vehículo"}
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                <button
                  onClick={() => { setSkipVehicle(true); setStep("listo") }}
                  className="w-full text-xs text-slate-400 hover:text-slate-600 transition-colors text-center py-1"
                >
                  Omitir por ahora
                </button>
              </div>
            </div>
          )}

          {step === "listo" && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden text-center">
              <div className="px-6 pt-10 pb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-100 mb-5">
                  <Check className="h-8 w-8 text-emerald-700" />
                </div>
                <h2 className="text-2xl font-extrabold text-slate-900 mb-2">
                  {skipVehicle ? "Perfil creado" : "Todo listo"}
                </h2>
                <p className="text-slate-500 text-sm leading-relaxed mb-6">
                  {skipVehicle
                    ? "Tu perfil está configurado. Puedes añadir vehículos en cualquier momento desde tu perfil."
                    : "Tu perfil y vehículo han sido guardados. Ya puedes buscar las mejores gasolineras y cargadores."}
                </p>
                <div className="space-y-2">
                  <Button
                    onClick={() => router.push("/buscar")}
                    className="w-full bg-emerald-700 hover:bg-emerald-800 text-white h-11 font-semibold"
                  >
                    Buscar gasolineras
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => router.push("/perfil")}
                    className="w-full border-slate-200 text-slate-600 h-11"
                  >
                    Ver mi perfil
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
