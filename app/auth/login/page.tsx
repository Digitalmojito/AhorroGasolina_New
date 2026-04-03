"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Mail, Lock, Eye, EyeOff, ArrowRight, CircleAlert as AlertCircle, Fuel, TrendingDown, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase"
import { cn } from "@/lib/utils"

const PERKS = [
  {
    icon: <TrendingDown className="h-5 w-5" />,
    title: "Alertas de precio",
    desc: "Notificaciones cuando bajan los precios en tu zona",
  },
  {
    icon: <MapPin className="h-5 w-5" />,
    title: "Gasolineras cercanas",
    desc: "Las más baratas a tu alrededor, en tiempo real",
  },
  {
    icon: <Fuel className="h-5 w-5" />,
    title: "Por tu combustible",
    desc: "Filtrado por el tipo de carburante de tu coche",
  },
]

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace("/perfil")
      }
    })
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const supabase = createClient()

    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError || !data.session) {
      setError("Email o contraseña incorrectos.")
      setLoading(false)
      return
    }

    router.push("/perfil")
    router.refresh()
  }

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-[45%] bg-slate-900 relative overflow-hidden flex-col justify-between p-12">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-emerald-600/10 blur-3xl" />
          <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-emerald-500/5 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px]">
            <svg viewBox="0 0 600 600" className="w-full h-full opacity-[0.03]" fill="none">
              <circle cx="300" cy="300" r="250" stroke="white" strokeWidth="1"/>
              <circle cx="300" cy="300" r="200" stroke="white" strokeWidth="1"/>
              <circle cx="300" cy="300" r="150" stroke="white" strokeWidth="1"/>
              <circle cx="300" cy="300" r="100" stroke="white" strokeWidth="1"/>
              <circle cx="300" cy="300" r="50" stroke="white" strokeWidth="1"/>
              <line x1="50" y1="300" x2="550" y2="300" stroke="white" strokeWidth="1"/>
              <line x1="300" y1="50" x2="300" y2="550" stroke="white" strokeWidth="1"/>
            </svg>
          </div>
        </div>

        <Link href="/" className="relative z-10">
          <span className="text-2xl font-black text-white tracking-tight">
            Ahorro<span className="text-emerald-400">Gasolina</span><span className="text-slate-400 font-bold">.es</span>
          </span>
        </Link>

        <div className="relative z-10 space-y-8">
          <div>
            <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1 mb-6">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-400 text-xs font-semibold tracking-wide">Precios actualizados ahora</span>
            </div>
            <h2 className="text-3xl font-bold text-white leading-tight">
              Ahorra en cada<br />
              <span className="text-emerald-400">repostaje</span>
            </h2>
            <p className="text-slate-400 mt-3 leading-relaxed text-sm">
              Más de 11.000 gasolineras en tiempo real para que nunca pagues de más.
            </p>
          </div>

          <div className="space-y-4">
            {PERKS.map((perk, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
                  {perk.icon}
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{perk.title}</p>
                  <p className="text-slate-400 text-xs mt-0.5 leading-relaxed">{perk.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <div className="flex -space-x-2">
            {["EC", "MR", "AL"].map((initials, i) => (
              <div
                key={i}
                className="w-8 h-8 rounded-full bg-emerald-600 border-2 border-slate-900 text-white text-xs font-bold flex items-center justify-center"
              >
                {initials}
              </div>
            ))}
          </div>
          <p className="text-slate-400 text-xs">
            <span className="text-white font-semibold">+2.400 usuarios</span> ya ahorran con nosotros
          </p>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center px-6 py-12 lg:px-16 xl:px-24 bg-slate-50">
        <div className="w-full max-w-sm mx-auto">
          <div className="lg:hidden mb-8">
            <Link href="/">
              <span className="text-2xl font-black text-slate-900 tracking-tight">
                Ahorro<span className="text-emerald-600">Gasolina</span><span className="text-zinc-400 font-bold">.es</span>
              </span>
            </Link>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900">Bienvenido de nuevo</h1>
            <p className="text-slate-500 mt-1 text-sm">Accede para ver tus gasolineras y alertas</p>
          </div>

          {error && (
            <div className="flex items-center gap-2.5 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-6">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-slate-700">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  required
                  autoComplete="email"
                  className="pl-9 h-11 border-slate-200 focus-visible:ring-emerald-400 focus-visible:border-emerald-400 bg-white"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium text-slate-700">
                  Contraseña
                </Label>
                <Link href="/auth/reset-password" className="text-xs text-emerald-600 hover:text-emerald-700 font-medium transition-colors">
                  ¿La olvidaste?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="pl-9 pr-10 h-11 border-slate-200 focus-visible:ring-emerald-400 focus-visible:border-emerald-400 bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className={cn(
                "w-full h-11 font-semibold gap-2 rounded-xl transition-all duration-200",
                "bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm shadow-emerald-900/20",
                loading && "opacity-80"
              )}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Iniciando sesión...
                </span>
              ) : (
                <>
                  Iniciar sesión
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-4 pt-4 border-t border-slate-200 text-center">
            <p className="text-sm text-slate-500">
              ¿Sin cuenta todavía?{" "}
              <Link href="/auth/signup" className="text-emerald-600 hover:text-emerald-700 font-semibold transition-colors">
                Regístrate gratis
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
