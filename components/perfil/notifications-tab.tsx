"use client"

import { useState } from "react"
import { Bell, Mail, TrendingDown, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { createClient } from "@/lib/supabase"
import { cn } from "@/lib/utils"

export interface NotificationPrefs {
  price_alerts_enabled: boolean
  weekly_digest_enabled: boolean
  price_drop_threshold_pct: number
}

interface NotificationsTabProps {
  userId: string
  initialPrefs: NotificationPrefs
}

const THRESHOLD_OPTIONS = [10, 15, 20]

export function NotificationsTab({ userId, initialPrefs }: NotificationsTabProps) {
  const [prefs, setPrefs] = useState<NotificationPrefs>(initialPrefs)
  const [threshold, setThreshold] = useState(initialPrefs.price_drop_threshold_pct)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    setSaving(true)
    setSaved(false)

    const supabase = createClient()
    await supabase
      .from("notification_preferences")
      .update({
        price_alerts_enabled: prefs.price_alerts_enabled,
        weekly_digest_enabled: prefs.weekly_digest_enabled,
        price_drop_threshold_pct: threshold,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
            <Bell className="h-4 w-4 text-emerald-600" />
            Notificaciones por email
          </h2>
        </div>

        <div className="divide-y divide-slate-100">
          <div className="px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className={cn(
                  "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors",
                  prefs.price_alerts_enabled ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"
                )}>
                  <TrendingDown className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900 text-sm">Alertas de bajada de precio</p>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed max-w-xs">
                    Aviso cuando bajen los precios en tus gasolineras favoritas
                  </p>
                </div>
              </div>
              <Switch
                checked={prefs.price_alerts_enabled}
                onCheckedChange={(checked) => setPrefs((p) => ({ ...p, price_alerts_enabled: checked }))}
                className="flex-shrink-0 data-[state=checked]:bg-emerald-600"
              />
            </div>

            {prefs.price_alerts_enabled && (
              <div className="mt-4 ml-12 bg-slate-50 rounded-xl border border-slate-100 p-3">
                <p className="text-xs font-semibold text-slate-600 mb-2">Umbral mínimo de bajada</p>
                <div className="flex items-center gap-2 flex-wrap">
                  {THRESHOLD_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setThreshold(opt)}
                      className={cn(
                        "text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all",
                        threshold === opt
                          ? "bg-emerald-700 text-white border-emerald-700 shadow-sm"
                          : "bg-white text-slate-600 border-slate-200 hover:border-emerald-300 hover:text-emerald-700"
                      )}
                    >
                      {opt === 20 ? "20%+" : `${opt}%`}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  Recibirás un aviso cuando el precio baje un {threshold}% o más
                </p>
              </div>
            )}
          </div>

          <div className="px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className={cn(
                  "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors",
                  prefs.weekly_digest_enabled ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-400"
                )}>
                  <Mail className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900 text-sm">Resumen semanal</p>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed max-w-xs">
                    Cada lunes, los mejores precios de tus gasolineras favoritas
                  </p>
                </div>
              </div>
              <Switch
                checked={prefs.weekly_digest_enabled}
                onCheckedChange={(checked) => setPrefs((p) => ({ ...p, weekly_digest_enabled: checked }))}
                className="flex-shrink-0 data-[state=checked]:bg-emerald-600"
              />
            </div>
          </div>
        </div>

        <div className="px-5 py-4 bg-slate-50/50 border-t border-slate-100">
          <Button
            onClick={handleSave}
            disabled={saving}
            className={cn(
              "gap-2 font-semibold transition-all",
              saved
                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                : "bg-emerald-700 hover:bg-emerald-800 text-white"
            )}
          >
            {saved ? (
              <>
                <Check className="h-4 w-4" />
                Guardado
              </>
            ) : saving ? "Guardando..." : "Guardar preferencias"}
          </Button>
        </div>
      </div>
    </div>
  )
}
