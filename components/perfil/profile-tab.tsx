"use client"

import { useState } from "react"
import { User, Mail, Calendar, Pencil, Check, X, KeyRound, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createClient } from "@/lib/supabase"
import Link from "next/link"
import type { FuelType } from "@/lib/types"
import { NearbyStationsWidget } from "./nearby-stations-widget"

interface ProfileTabProps {
  userId: string
  email: string
  displayName: string
  createdAt: string
  onDisplayNameChange: (name: string) => void
  postcode?: string
  location?: string
  primaryFuelType?: FuelType
}

export function ProfileTab({
  userId,
  email,
  displayName,
  createdAt,
  onDisplayNameChange,
  postcode = "",
  location = "",
  primaryFuelType,
}: ProfileTabProps) {
  const [editing, setEditing] = useState(false)
  const [nameInput, setNameInput] = useState(displayName)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const formattedDate = new Date(createdAt).toLocaleDateString("es-ES", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  async function handleSave() {
    setError(null)
    setSaving(true)

    const supabase = createClient()
    const { error: dbError } = await supabase
      .from("profiles")
      .update({ display_name: nameInput.trim(), updated_at: new Date().toISOString() })
      .eq("id", userId)

    if (dbError) {
      setError("No se pudo guardar el nombre.")
      setSaving(false)
      return
    }

    onDisplayNameChange(nameInput.trim())
    setEditing(false)
    setSaving(false)
  }

  function handleCancel() {
    setNameInput(displayName)
    setEditing(false)
    setError(null)
  }

  const hasLocation = !!(postcode || location)
  const showWidget = hasLocation && primaryFuelType && primaryFuelType !== "electric"

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
            <User className="h-4 w-4 text-emerald-600" />
            Información personal
          </h2>
        </div>

        <div className="divide-y divide-slate-100">
          <div className="px-5 py-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Nombre</p>
            {editing ? (
              <div className="space-y-2">
                <Input
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Tu nombre"
                  className="border-slate-200 focus-visible:ring-emerald-400 focus-visible:border-emerald-400 h-10"
                  autoFocus
                />
                {error && <p className="text-xs text-red-500">{error}</p>}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={saving || !nameInput.trim()}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white gap-1.5 h-8"
                  >
                    <Check className="h-3.5 w-3.5" />
                    {saving ? "Guardando..." : "Guardar"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCancel}
                    className="gap-1.5 text-slate-500 h-8"
                  >
                    <X className="h-3.5 w-3.5" />
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between group">
                <p className="text-slate-900 font-medium text-sm">{displayName || "Sin nombre"}</p>
                <button
                  onClick={() => { setNameInput(displayName); setEditing(true) }}
                  className="text-slate-300 hover:text-emerald-600 transition-colors opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-emerald-50"
                  title="Editar nombre"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          <div className="px-5 py-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Email</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-slate-400" />
                <p className="text-slate-900 text-sm">{email}</p>
              </div>
              <span className="text-xs bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded-full border border-emerald-100">
                Verificado
              </span>
            </div>
          </div>

          <div className="px-5 py-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Miembro desde</p>
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              <p className="text-slate-900 text-sm">{formattedDate}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
            <Shield className="h-4 w-4 text-slate-500" />
            Seguridad
          </h2>
        </div>
        <div className="px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center">
                <KeyRound className="h-4 w-4 text-slate-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">Contraseña</p>
                <p className="text-xs text-slate-500">Cambia tu contraseña de acceso</p>
              </div>
            </div>
            <Link href="/auth/update-password">
              <Button variant="outline" size="sm" className="border-slate-200 text-slate-600 hover:border-emerald-300 hover:text-emerald-700 hover:bg-emerald-50 transition-colors h-8 text-xs">
                Cambiar
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {showWidget && (
        <NearbyStationsWidget
          postcode={postcode}
          location={location}
          fuelType={primaryFuelType}
        />
      )}
    </div>
  )
}
