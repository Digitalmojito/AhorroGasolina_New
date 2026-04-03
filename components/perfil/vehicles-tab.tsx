"use client"

import { useState } from "react"
import { Car, Plus, Trash2, Pencil, Check, X, Droplets, Star, Zap, Info, Flame, Leaf, BatteryCharging, PlugZap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createClient } from "@/lib/supabase"
import { CAR_MAKES, getModelsForMake } from "@/lib/car-data"
import type { FuelType } from "@/lib/types"
import { cn } from "@/lib/utils"
import {
  SuvIcon, BerlinaIcon, MonovolumenIcon, UrbanoIcon,
  RancheraIcon, DeportivoIcon, DescapotableIcon, ComercialIcon,
} from "@/components/cars"
import { ConnectorTypePicker, CONNECTOR_OPTIONS } from "@/components/connector-type-picker"

const FUEL_OPTIONS: {
  value: FuelType
  label: string
  shortLabel: string
  icon: React.ReactNode
  bg: string
  text: string
  border: string
}[] = [
  { value: "gasolina95", label: "Gasolina 95", shortLabel: "G95", icon: <Droplets className="h-3.5 w-3.5" />, bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-200" },
  { value: "gasolina98", label: "Gasolina 98", shortLabel: "G98", icon: <Star className="h-3.5 w-3.5" />, bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-200" },
  { value: "diesel", label: "Diésel", shortLabel: "DSL", icon: <Droplets className="h-3.5 w-3.5" />, bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-200" },
  { value: "dieselPremium", label: "Diésel Premium", shortLabel: "D+", icon: <Star className="h-3.5 w-3.5" />, bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-200" },
  { value: "glp", label: "GLP", shortLabel: "GLP", icon: <Zap className="h-3.5 w-3.5" />, bg: "bg-teal-100", text: "text-teal-700", border: "border-teal-200" },
  { value: "electric", label: "Eléctrico", shortLabel: "EV", icon: <BatteryCharging className="h-3.5 w-3.5" />, bg: "bg-sky-100", text: "text-sky-700", border: "border-sky-200" },
]

const BODY_TYPES: { value: string; label: string; icon: React.ElementType }[] = [
  { value: "suv", label: "SUV y 4x4", icon: SuvIcon },
  { value: "sedan", label: "Berlina", icon: BerlinaIcon },
  { value: "monovolumen", label: "Monovolumen", icon: MonovolumenIcon },
  { value: "urbano", label: "Urbano", icon: UrbanoIcon },
  { value: "ranchera", label: "Ranchera", icon: RancheraIcon },
  { value: "deportivo", label: "Deportivo", icon: DeportivoIcon },
  { value: "descapotable", label: "Descapotable", icon: DescapotableIcon },
  { value: "comercial", label: "Comercial", icon: ComercialIcon },
]

const POWERTRAIN_OPTIONS: {
  value: string
  label: string
  icon: React.ReactNode
  bg: string
  text: string
  border: string
}[] = [
  { value: "combustion", label: "Combustión", icon: <Flame className="h-3.5 w-3.5" />, bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-200" },
  { value: "hybrid", label: "Híbrido", icon: <Leaf className="h-3.5 w-3.5" />, bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-200" },
  { value: "plugin_hybrid", label: "Híbrido enchufable", icon: <PlugZap className="h-3.5 w-3.5" />, bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-200" },
  { value: "electric", label: "Eléctrico", icon: <BatteryCharging className="h-3.5 w-3.5" />, bg: "bg-teal-100", text: "text-teal-700", border: "border-teal-200" },
]

export interface Vehicle {
  id: string
  user_id: string
  nickname: string
  fuel_type: FuelType
  tank_litres: number
  created_at: string
  car_make?: string
  car_model?: string
  body_type?: string
  powertrain?: string
  connector_type?: string
}

interface VehiclesTabProps {
  userId: string
  initialVehicles: Vehicle[]
}

interface VehicleFormState {
  nickname: string
  fuel_type: FuelType
  tank_litres: string
  car_make: string
  car_model: string
  body_type: string
  powertrain: string
  connector_type: string
}

const EMPTY_FORM: VehicleFormState = {
  nickname: "",
  fuel_type: "gasolina95",
  tank_litres: "50",
  car_make: "",
  car_model: "",
  body_type: "",
  powertrain: "",
  connector_type: "",
}

function FuelBadge({ fuelType }: { fuelType: FuelType }) {
  const opt = FUEL_OPTIONS.find((o) => o.value === fuelType)
  if (!opt) return null
  return (
    <span className={cn(
      "inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border",
      opt.bg, opt.text, opt.border
    )}>
      {opt.icon}
      {opt.shortLabel}
    </span>
  )
}

function BodyTypeSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-slate-500">Carrocería</Label>
      <div className="grid grid-cols-4 gap-1.5">
        {BODY_TYPES.map((bt) => {
          const IconComp = bt.icon
          const selected = value === bt.value
          return (
            <button
              key={bt.value}
              type="button"
              onClick={() => onChange(selected ? "" : bt.value)}
              className={cn(
                "flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all duration-150 text-center",
                selected
                  ? "border-emerald-500 bg-emerald-50 text-slate-900"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
              )}
            >
              <IconComp className={cn("w-10 h-6", selected ? "text-slate-900" : "text-slate-500")} />
              <span className="text-[10px] font-medium leading-tight">{bt.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function PowertrainSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-slate-500">Propulsión</Label>
      <div className="flex flex-wrap gap-1.5">
        {POWERTRAIN_OPTIONS.map((pt) => {
          const selected = value === pt.value
          return (
            <button
              key={pt.value}
              type="button"
              onClick={() => onChange(selected ? "" : pt.value)}
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all",
                selected
                  ? cn(pt.bg, pt.text, pt.border, "border-2")
                  : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
              )}
            >
              {pt.icon}
              {pt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function FuelConnectorSection({
  powertrain,
  fuelType,
  connectorType,
  onFuelChange,
  onConnectorChange,
}: {
  powertrain: string
  fuelType: FuelType
  connectorType: string
  onFuelChange: (v: FuelType) => void
  onConnectorChange: (v: string) => void
}) {
  const isElectric = powertrain === "electric"
  const isPHEV = powertrain === "plugin_hybrid"
  const showFuel = !isElectric

  return (
    <div className="space-y-3">
      {showFuel && (
        <div className="space-y-1">
          <Label className="text-xs text-slate-500">Combustible</Label>
          <Select
            value={fuelType}
            onValueChange={(val) => onFuelChange(val as FuelType)}
          >
            <SelectTrigger className="border-slate-200 bg-white h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FUEL_OPTIONS.filter((o) => o.value !== "electric").map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      {isElectric && (
        <div className="space-y-1.5">
          <Label className="text-xs text-slate-500">Conector de carga</Label>
          <ConnectorTypePicker value={connectorType} onChange={onConnectorChange} size="sm" />
        </div>
      )}
      {isPHEV && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-slate-400 font-medium uppercase tracking-wide">
            <div className="flex-1 h-px bg-slate-100" />
            Conector de carga
            <div className="flex-1 h-px bg-slate-100" />
          </div>
          <ConnectorTypePicker value={connectorType} onChange={onConnectorChange} size="sm" />
        </div>
      )}
    </div>
  )
}

function VehicleForm({
  form,
  setForm,
  models,
  onSave,
  onCancel,
  saving,
  error,
  isEdit = false,
}: {
  form: VehicleFormState
  setForm: React.Dispatch<React.SetStateAction<VehicleFormState>>
  models: string[]
  onSave: () => void
  onCancel: () => void
  saving?: boolean
  error?: string | null
  isEdit?: boolean
}) {
  return (
    <div className="space-y-3">
      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="space-y-1">
        <Label className="text-xs text-slate-500">Marca</Label>
        <Select
          value={form.car_make}
          onValueChange={(val) => setForm((prev) => ({ ...prev, car_make: val, car_model: "" }))}
        >
          <SelectTrigger className="border-slate-200 bg-white h-10">
            <SelectValue placeholder="Selecciona la marca..." />
          </SelectTrigger>
          <SelectContent className="max-h-64">
            {CAR_MAKES.map((make) => (
              <SelectItem key={make} value={make}>{make}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {form.car_make && models.length > 0 && (
        <div className="space-y-1">
          <Label className="text-xs text-slate-500">Modelo</Label>
          <Select
            value={form.car_model}
            onValueChange={(val) => setForm((prev) => ({ ...prev, car_model: val }))}
          >
            <SelectTrigger className="border-slate-200 bg-white h-10">
              <SelectValue placeholder="Selecciona el modelo..." />
            </SelectTrigger>
            <SelectContent className="max-h-64">
              {models.map((model) => (
                <SelectItem key={model} value={model}>{model}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {form.car_make && models.length === 0 && (
        <div className="space-y-1">
          <Label className="text-xs text-slate-500">Modelo</Label>
          <Input
            value={form.car_model}
            onChange={(e) => setForm((prev) => ({ ...prev, car_model: e.target.value }))}
            placeholder="Escribe el modelo..."
            className="border-slate-200 bg-white focus-visible:ring-emerald-400 h-10"
          />
        </div>
      )}

      <BodyTypeSelector
        value={form.body_type}
        onChange={(val) => setForm((prev) => ({ ...prev, body_type: val }))}
      />

      <PowertrainSelector
        value={form.powertrain}
        onChange={(val) => {
          const isEV = val === "electric"
          setForm((prev) => ({
            ...prev,
            powertrain: val,
            fuel_type: isEV ? "electric" : prev.fuel_type === "electric" ? "gasolina95" : prev.fuel_type,
          }))
        }}
      />

      <Input
        value={form.nickname}
        onChange={(e) => setForm((prev) => ({ ...prev, nickname: e.target.value }))}
        placeholder="Nombre personalizado (opcional)"
        className="border-slate-200 bg-white focus-visible:ring-emerald-400 h-10"
      />

      <FuelConnectorSection
        powertrain={form.powertrain}
        fuelType={form.fuel_type}
        connectorType={form.connector_type}
        onFuelChange={(val) => setForm((prev) => ({ ...prev, fuel_type: val }))}
        onConnectorChange={(val) => setForm((prev) => ({ ...prev, connector_type: val }))}
      />

      {form.powertrain !== "electric" && (
        <div className="space-y-1">
          <Label className="text-xs text-slate-500">Depósito (litros)</Label>
          <Input
            type="number"
            value={form.tank_litres}
            onChange={(e) => setForm((prev) => ({ ...prev, tank_litres: e.target.value }))}
            placeholder="50"
            min="1"
            max="200"
            className="border-slate-200 bg-white focus-visible:ring-emerald-400 h-10"
          />
        </div>
      )}

      <div className="flex gap-2">
        <Button size="sm" onClick={onSave} disabled={saving} className="bg-emerald-700 hover:bg-emerald-800 text-white gap-1.5 h-8">
          <Check className="h-3.5 w-3.5" />
          {saving ? "Guardando..." : isEdit ? "Guardar" : "Añadir"}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel} className="gap-1.5 h-8 text-slate-500">
          <X className="h-3.5 w-3.5" />
          Cancelar
        </Button>
      </div>
    </div>
  )
}

export function VehiclesTab({ userId, initialVehicles }: VehiclesTabProps) {
  const [vehicles, setVehicles] = useState<Vehicle[]>(initialVehicles)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<VehicleFormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<VehicleFormState>(EMPTY_FORM)

  const addModels = getModelsForMake(form.car_make)
  const editModels = getModelsForMake(editForm.car_make)

  async function handleAdd() {
    setError(null)
    if (!form.car_make) {
      setError("Selecciona la marca del vehículo.")
      return
    }
    if (vehicles.length >= 3) {
      setError("Máximo 3 vehículos permitidos.")
      return
    }
    setSaving(true)

    const nickname = form.nickname.trim() || (form.car_model ? `${form.car_make} ${form.car_model}` : form.car_make)

    const supabase = createClient()
    const { data, error: dbError } = await supabase
      .from("vehicles")
      .insert({
        user_id: userId,
        nickname,
        fuel_type: form.fuel_type,
        tank_litres: parseFloat(form.tank_litres) || 50,
        car_make: form.car_make,
        car_model: form.car_model,
        body_type: form.body_type,
        powertrain: form.powertrain,
        connector_type: form.connector_type || null,
      })
      .select()
      .single()

    if (dbError || !data) {
      setError("No se pudo guardar el vehículo.")
      setSaving(false)
      return
    }

    setVehicles((prev) => [...prev, data as Vehicle])
    setForm(EMPTY_FORM)
    setShowForm(false)
    setSaving(false)
  }

  async function handleDelete(id: string) {
    const supabase = createClient()
    await supabase.from("vehicles").delete().eq("id", id)
    setVehicles((prev) => prev.filter((v) => v.id !== id))
  }

  function startEdit(vehicle: Vehicle) {
    setEditingId(vehicle.id)
    setEditForm({
      nickname: vehicle.nickname,
      fuel_type: vehicle.fuel_type,
      tank_litres: String(vehicle.tank_litres),
      car_make: vehicle.car_make ?? "",
      car_model: vehicle.car_model ?? "",
      body_type: vehicle.body_type ?? "",
      powertrain: vehicle.powertrain ?? "",
      connector_type: vehicle.connector_type ?? "",
    })
  }

  async function handleEditSave(id: string) {
    const nickname = editForm.nickname.trim() || (editForm.car_model ? `${editForm.car_make} ${editForm.car_model}` : editForm.car_make)
    const supabase = createClient()
    const { data, error: dbError } = await supabase
      .from("vehicles")
      .update({
        nickname,
        fuel_type: editForm.fuel_type,
        tank_litres: parseFloat(editForm.tank_litres) || 50,
        car_make: editForm.car_make,
        car_model: editForm.car_model,
        body_type: editForm.body_type,
        powertrain: editForm.powertrain,
        connector_type: editForm.connector_type || null,
      })
      .eq("id", id)
      .select()
      .single()

    if (dbError || !data) return

    setVehicles((prev) => prev.map((v) => (v.id === id ? (data as Vehicle) : v)))
    setEditingId(null)
  }

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
            <Car className="h-4 w-4 text-emerald-600" />
            Mis vehículos
            <span className="text-xs font-normal text-slate-400 ml-1">({vehicles.length}/3)</span>
          </h2>
          {vehicles.length < 3 && !showForm && (
            <Button
              size="sm"
              onClick={() => setShowForm(true)}
              className="bg-emerald-700 hover:bg-emerald-800 text-white gap-1.5 h-7 text-xs"
            >
              <Plus className="h-3 w-3" />
              Añadir
            </Button>
          )}
        </div>

        {vehicles.length === 0 && !showForm ? (
          <div className="px-5 py-10 text-center">
            <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Car className="h-7 w-7 text-slate-300" />
            </div>
            <p className="text-slate-600 font-medium text-sm">Sin vehículos guardados</p>
            <p className="text-xs text-slate-400 mt-1 mb-4">Añade tu coche para calcular tu ahorro por repostaje</p>
            <Button
              size="sm"
              onClick={() => setShowForm(true)}
              className="bg-emerald-700 hover:bg-emerald-800 text-white gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              Añadir vehículo
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {vehicles.map((v, i) => (
              <div key={v.id} className="px-5 py-4">
                {editingId === v.id ? (
                  <VehicleForm
                    form={editForm}
                    setForm={setEditForm}
                    models={editModels}
                    onSave={() => handleEditSave(v.id)}
                    onCancel={() => setEditingId(null)}
                    isEdit
                  />
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm",
                        i === 0 ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                      )}>
                        <Car className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-slate-900 text-sm">{v.nickname}</p>
                          {i === 0 && (
                            <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">
                              Principal
                            </span>
                          )}
                          {v.body_type && (
                            <span className="text-[10px] font-medium bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full capitalize">
                              {BODY_TYPES.find((b) => b.value === v.body_type)?.label ?? v.body_type}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <FuelBadge fuelType={v.fuel_type} />
                          {v.powertrain && (
                            <span className={cn(
                              "inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border",
                              POWERTRAIN_OPTIONS.find((p) => p.value === v.powertrain)?.bg ?? "bg-slate-100",
                              POWERTRAIN_OPTIONS.find((p) => p.value === v.powertrain)?.text ?? "text-slate-600",
                              POWERTRAIN_OPTIONS.find((p) => p.value === v.powertrain)?.border ?? "border-slate-200",
                            )}>
                              {POWERTRAIN_OPTIONS.find((p) => p.value === v.powertrain)?.icon}
                              {POWERTRAIN_OPTIONS.find((p) => p.value === v.powertrain)?.label}
                            </span>
                          )}
                          {v.connector_type && (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border bg-sky-100 text-sky-700 border-sky-200">
                              {CONNECTOR_OPTIONS.find((c) => c.value === v.connector_type)?.label ?? v.connector_type}
                            </span>
                          )}
                          {v.powertrain !== "electric" && (
                            <span className="text-xs text-slate-400">{v.tank_litres}L</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => startEdit(v)}
                        className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(v.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {showForm && (
          <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-4 space-y-3">
            <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
              <Plus className="h-3.5 w-3.5 text-emerald-600" />
              Nuevo vehículo
            </p>
            <VehicleForm
              form={form}
              setForm={setForm}
              models={addModels}
              onSave={handleAdd}
              onCancel={() => { setShowForm(false); setForm(EMPTY_FORM); setError(null) }}
              saving={saving}
              error={error}
            />
          </div>
        )}
      </div>

      <div className="flex items-start gap-2 px-1">
        <Info className="h-3.5 w-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-slate-400 leading-relaxed">
          El vehículo añadido durante el registro aparece aquí. Puedes añadir hasta 3 coches distintos y gestionar todos desde esta sección.
        </p>
      </div>
    </div>
  )
}
