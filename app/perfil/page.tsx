"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { User, Car, Bell, Heart, LogOut, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase"
import { ProfileTab } from "@/components/perfil/profile-tab"
import { VehiclesTab } from "@/components/perfil/vehicles-tab"
import { NotificationsTab } from "@/components/perfil/notifications-tab"
import { FavouritesTab } from "@/components/perfil/favourites-tab"
import { HistoryTab } from "@/components/perfil/history-tab"
import type { Vehicle } from "@/components/perfil/vehicles-tab"
import type { NotificationPrefs } from "@/components/perfil/notifications-tab"
import { cn } from "@/lib/utils"

type TabKey = "perfil" | "vehiculos" | "notificaciones" | "favoritas" | "historial"

const TABS: { key: TabKey; label: string; icon: React.ReactNode; desc: string }[] = [
  { key: "perfil", label: "Perfil", icon: <User className="h-4 w-4" />, desc: "Datos personales" },
  { key: "vehiculos", label: "Vehículos", icon: <Car className="h-4 w-4" />, desc: "Mis coches" },
  { key: "notificaciones", label: "Alertas", icon: <Bell className="h-4 w-4" />, desc: "Notificaciones" },
  { key: "favoritas", label: "Favoritas", icon: <Heart className="h-4 w-4" />, desc: "Gasolineras" },
  { key: "historial", label: "Historial", icon: <Clock className="h-4 w-4" />, desc: "Navegación" },
]

export default function PerfilPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialTab = (searchParams.get("tab") as TabKey) ?? "perfil"
  const [activeTab, setActiveTab] = useState<TabKey>(
    TABS.some((t) => t.key === initialTab) ? initialTab : "perfil"
  )

  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string>("")
  const [email, setEmail] = useState<string>("")
  const [displayName, setDisplayName] = useState<string>("")
  const [createdAt, setCreatedAt] = useState<string>("")
  const [postcode, setPostcode] = useState<string>("")
  const [location, setLocation] = useState<string>("")
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs>({
    price_alerts_enabled: true,
    weekly_digest_enabled: true,
    price_drop_threshold_pct: 10,
  })

  useEffect(() => {
    const supabase = createClient()

    async function loadUserData(userId: string) {
      const [profileResult, vehiclesResult, notifResult] = await Promise.all([
        supabase.from("profiles").select("display_name, postcode, location").eq("id", userId).maybeSingle(),
        supabase.from("vehicles").select("*").eq("user_id", userId).order("created_at"),
        supabase.from("notification_preferences").select("*").eq("user_id", userId).maybeSingle(),
      ])

      setDisplayName(profileResult.data?.display_name ?? "")
      setPostcode(profileResult.data?.postcode ?? "")
      setLocation(profileResult.data?.location ?? "")
      setVehicles((vehiclesResult.data ?? []) as Vehicle[])
      if (notifResult.data) {
        setNotifPrefs({
          price_alerts_enabled: notifResult.data.price_alerts_enabled,
          weekly_digest_enabled: notifResult.data.weekly_digest_enabled,
          price_drop_threshold_pct: notifResult.data.price_drop_threshold_pct,
        })
      }
      setLoading(false)
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        router.replace("/auth/login")
        return
      }
      const user = session.user
      setUserId(user.id)
      setEmail(user.email ?? "")
      setCreatedAt(user.created_at)
      ;(async () => { await loadUserData(user.id) })()
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [router])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
    router.refresh()
  }

  if (loading) {
    return (
      <div className="bg-slate-50 min-h-screen">
        <div className="max-w-3xl mx-auto px-4 py-10 space-y-4">
          <div className="h-32 bg-white rounded-2xl border border-slate-200 animate-pulse" />
          <div className="h-14 bg-white rounded-2xl border border-slate-200 animate-pulse" />
          <div className="h-64 bg-white rounded-2xl border border-slate-200 animate-pulse" />
        </div>
      </div>
    )
  }

  const initials = displayName
    ? displayName.trim().split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()
    : email[0]?.toUpperCase() ?? "U"

  const memberYear = createdAt ? new Date(createdAt).getFullYear() : null
  const primaryVehicle = vehicles[0]

  return (
    <div className="bg-slate-50 min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400" />
          <div className="p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="relative flex-shrink-0">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white text-xl font-bold flex items-center justify-center shadow-md shadow-emerald-200">
                    {initials}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full" />
                  </div>
                </div>
                <div>
                  <h1 className="text-lg font-bold text-slate-900 leading-tight">{displayName || "Usuario"}</h1>
                  <p className="text-sm text-slate-500">{email}</p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {memberYear && (
                      <span className="inline-flex items-center text-xs text-slate-400 font-medium">
                        Miembro desde {memberYear}
                      </span>
                    )}
                    {primaryVehicle && (
                      <>
                        <span className="text-slate-200">·</span>
                        <span className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-600 font-medium px-2 py-0.5 rounded-full">
                          <Car className="h-3 w-3" />
                          {primaryVehicle.nickname}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="text-slate-400 hover:text-red-600 hover:bg-red-50 gap-1.5 flex-shrink-0 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline text-sm">Salir</span>
              </Button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-1.5">
          <div className="grid grid-cols-5 gap-1">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "relative flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl text-xs font-medium transition-all duration-200",
                  activeTab === tab.key
                    ? "bg-emerald-700 text-white shadow-sm"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                )}
              >
                {tab.icon}
                <span className="hidden sm:block">{tab.label}</span>
                <span className="sm:hidden text-[10px]">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          {activeTab === "perfil" && (
            <ProfileTab
              userId={userId}
              email={email}
              displayName={displayName}
              createdAt={createdAt}
              onDisplayNameChange={setDisplayName}
              postcode={postcode}
              location={location}
              primaryFuelType={vehicles[0]?.fuel_type}
            />
          )}

          {activeTab === "vehiculos" && (
            <VehiclesTab userId={userId} initialVehicles={vehicles} />
          )}

          {activeTab === "notificaciones" && (
            <NotificationsTab userId={userId} initialPrefs={notifPrefs} />
          )}

          {activeTab === "favoritas" && (
            <FavouritesTab userId={userId} />
          )}

          {activeTab === "historial" && (
            <HistoryTab userId={userId} />
          )}
        </div>
      </div>
    </div>
  )
}
