"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Mail, Lock, Eye, EyeOff, User, ArrowRight, ArrowLeft, Car, Fuel, MapPin, CircleCheck as CheckCircle2, CircleAlert as AlertCircle, Info, Zap, Droplets, Star, Pencil, Flame, Leaf, BatteryCharging, PlugZap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Tooltip, TooltipTrigger, TooltipContent, TooltipProvider,
} from "@/components/ui/tooltip"
import { createClient } from "@/lib/supabase"
import { CAR_MAKES, getModelsForMake } from "@/lib/car-data"
import type { FuelType } from "@/lib/types"
import { cn } from "@/lib/utils"
import {
  SuvIcon, BerlinaIcon, MonovolumenIcon, UrbanoIcon,
  RancheraIcon, DeportivoIcon, DescapotableIcon, ComercialIcon,
} from "@/components/cars"
import { ConnectorTypePicker } from "@/components/connector-type-picker"

const TOTAL_STEPS = 5

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
  description: string
  icon: React.ReactNode
  accentBg: string
  accentBorder: string
  accentText: string
  accentLight: string
  badge?: string
}[] = [
  {
    value: "combustion",
    label: "Combustión",
    description: "Motor de gasolina o diésel tradicional.",
    icon: <Flame className="h-4 w-4" />,
    accentBg: "bg-orange-500",
    accentBorder: "border-orange-500",
    accentText: "text-orange-600",
    accentLight: "bg-orange-50",
  },
  {
    value: "hybrid",
    label: "Híbrido",
    description: "Motor combinado. El eléctrico asiste al de combustión.",
    icon: <Leaf className="h-4 w-4" />,
    accentBg: "bg-emerald-500",
    accentBorder: "border-emerald-500",
    accentText: "text-emerald-600",
    accentLight: "bg-emerald-50",
  },
  {
    value: "plugin_hybrid",
    label: "Híbrido enchufable",
    description: "Se carga de la red y también usa combustible.",
    icon: <PlugZap className="h-4 w-4" />,
    accentBg: "bg-blue-500",
    accentBorder: "border-blue-500",
    accentText: "text-blue-600",
    accentLight: "bg-blue-50",
  },
  {
    value: "electric",
    label: "Eléctrico",
    description: "100% eléctrico. Próximamente: busca cargadores baratos.",
    icon: <BatteryCharging className="h-4 w-4" />,
    accentBg: "bg-teal-500",
    accentBorder: "border-teal-500",
    accentText: "text-teal-600",
    accentLight: "bg-teal-50",
    badge: "Próximamente",
  },
]

const FUEL_OPTIONS: {
  value: FuelType
  label: string
  description: string
  icon: React.ReactNode
  accentBg: string
  accentBorder: string
  accentText: string
  accentLight: string
}[] = [
  {
    value: "gasolina95",
    label: "Gasolina 95",
    description: "El más común. Ideal para coches de gasolina estándar.",
    icon: <Droplets className="h-4 w-4" />,
    accentBg: "bg-emerald-500",
    accentBorder: "border-emerald-500",
    accentText: "text-emerald-600",
    accentLight: "bg-emerald-50",
  },
  {
    value: "gasolina98",
    label: "Gasolina 98",
    description: "Alto octanaje. Para motores deportivos o de alto rendimiento.",
    icon: <Star className="h-4 w-4" />,
    accentBg: "bg-blue-500",
    accentBorder: "border-blue-500",
    accentText: "text-blue-600",
    accentLight: "bg-blue-50",
  },
  {
    value: "diesel",
    label: "Diésel",
    description: "Más eficiente para trayectos largos y conducción interurbana.",
    icon: <Droplets className="h-4 w-4" />,
    accentBg: "bg-amber-500",
    accentBorder: "border-amber-500",
    accentText: "text-amber-600",
    accentLight: "bg-amber-50",
  },
  {
    value: "dieselPremium",
    label: "Diésel Premium",
    description: "Máxima calidad. Limpia el motor y mejora el rendimiento.",
    icon: <Star className="h-4 w-4" />,
    accentBg: "bg-orange-500",
    accentBorder: "border-orange-500",
    accentText: "text-orange-600",
    accentLight: "bg-orange-50",
  },
  {
    value: "glp",
    label: "GLP / Autogas",
    description: "Gas licuado del petróleo. Más económico y menos contaminante.",
    icon: <Zap className="h-4 w-4" />,
    accentBg: "bg-teal-500",
    accentBorder: "border-teal-500",
    accentText: "text-teal-600",
    accentLight: "bg-teal-50",
  },
]

function getPasswordStrength(pwd: string): 0 | 1 | 2 | 3 {
  if (pwd.length === 0) return 0
  let score = 0
  if (pwd.length >= 8) score++
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++
  if (/[0-9]/.test(pwd) || /[^A-Za-z0-9]/.test(pwd)) score++
  return score as 0 | 1 | 2 | 3
}

function FieldTooltip({ tip }: { tip: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className="text-slate-400 hover:text-slate-600 transition-colors ml-1.5 inline-flex items-center">
          <Info className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[220px] text-xs leading-relaxed">
        {tip}
      </TooltipContent>
    </Tooltip>
  )
}

function StepIndicator({ current, powertrain }: { current: number; powertrain: string }) {
  const isElectric = powertrain === "electric"
  const isPHEV = powertrain === "plugin_hybrid"
  const step3Label = isElectric ? "Conector" : isPHEV ? "Combustible" : "Combustible"
  const step3Icon = isElectric ? <BatteryCharging className="h-3 w-3" /> : <Fuel className="h-3 w-3" />

  const steps = [
    { label: "Cuenta", icon: <User className="h-3 w-3" /> },
    { label: "Vehículo", icon: <Car className="h-3 w-3" /> },
    { label: step3Label, icon: step3Icon },
    { label: "Ubicación", icon: <MapPin className="h-3 w-3" /> },
    { label: "Confirmar", icon: <CheckCircle2 className="h-3 w-3" /> },
  ]
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between relative">
        <div className="absolute left-0 right-0 top-4 h-0.5 bg-slate-100" />
        <div
          className="absolute left-0 top-4 h-0.5 bg-emerald-500 transition-all duration-500"
          style={{ width: `${((current - 1) / (TOTAL_STEPS - 1)) * 100}%` }}
        />
        {steps.map((step, i) => {
          const idx = i + 1
          const done = idx < current
          const active = idx === current
          return (
            <div key={idx} className="relative flex flex-col items-center gap-1.5 z-10">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 border-2",
                done
                  ? "bg-emerald-500 border-emerald-500 text-white shadow-sm shadow-emerald-200"
                  : active
                    ? "bg-white border-emerald-500 text-emerald-600 shadow-sm shadow-emerald-100"
                    : "bg-white border-slate-200 text-slate-300"
              )}>
                {done ? <CheckCircle2 className="h-4 w-4" /> : step.icon}
              </div>
              <span className={cn(
                "text-[9px] font-semibold uppercase tracking-wide hidden sm:block",
                active ? "text-emerald-600" : done ? "text-emerald-500" : "text-slate-300"
              )}>
                {step.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function StepHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-xl font-bold text-slate-900">{title}</h2>
      <p className="text-slate-500 mt-1 text-sm">{subtitle}</p>
    </div>
  )
}

export default function SignupPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [carMake, setCarMake] = useState("")
  const [carModel, setCarModel] = useState("")
  const [bodyType, setBodyType] = useState("")
  const [powertrain, setPowertrain] = useState("")
  const [fuelType, setFuelType] = useState<FuelType>("gasolina95")
  const [connectorType, setConnectorType] = useState("")
  const [postcode, setPostcode] = useState("")
  const [location, setLocation] = useState("")
  const [marketingConsent, setMarketingConsent] = useState(true)

  const availableModels = getModelsForMake(carMake)
  const pwdStrength = getPasswordStrength(password)
  const pwdStrengthLabel = ["", "Débil", "Media", "Fuerte"][pwdStrength]
  const pwdStrengthColor = ["", "bg-red-400", "bg-amber-400", "bg-emerald-500"][pwdStrength]
  const pwdStrengthText = ["", "text-red-500", "text-amber-500", "text-emerald-600"][pwdStrength]

  const isElectric = powertrain === "electric"
  const isPHEV = powertrain === "plugin_hybrid"

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace("/perfil")
    })
  }, [router])

  function validateStep(): string | null {
    if (step === 1) {
      if (!fullName.trim()) return "Introduce tu nombre completo."
      if (!email.trim() || !email.includes("@")) return "Introduce un email válido."
      if (password.length < 8) return "La contraseña debe tener al menos 8 caracteres."
    }
    if (step === 2) {
      if (!carMake) return "Selecciona la marca de tu vehículo."
      if (availableModels.length > 0 && !carModel) return "Selecciona el modelo de tu vehículo."
    }
    return null
  }

  function handleNext() {
    const err = validateStep()
    if (err) { setError(err); return }
    setError(null)
    setStep((s) => s + 1)
  }

  function handleBack() {
    setError(null)
    setStep((s) => s - 1)
  }

  async function handleSubmit() {
    setError(null)
    setLoading(true)

    const supabase = createClient()

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: fullName } },
    })

    if (authError || !authData.user) {
      setError(
        authError?.message.includes("already registered")
          ? "Ya existe una cuenta con este email."
          : "No se pudo crear la cuenta. Inténtalo de nuevo."
      )
      setLoading(false)
      return
    }

    const userId = authData.user.id

    await supabase
      .from("profiles")
      .upsert({
        id: userId,
        display_name: fullName,
        car_make: carMake,
        car_model: carModel,
        location,
        postcode,
        updated_at: new Date().toISOString(),
      })

    if (carMake) {
      await supabase.from("vehicles").insert({
        user_id: userId,
        nickname: carModel ? `${carMake} ${carModel}` : carMake,
        fuel_type: fuelType,
        tank_litres: 50,
        car_make: carMake,
        car_model: carModel,
        body_type: bodyType,
        powertrain: powertrain,
        connector_type: connectorType || null,
      })
    }

    await supabase
      .from("notification_preferences")
      .upsert({
        user_id: userId,
        price_alerts_enabled: true,
        weekly_digest_enabled: true,
        price_drop_threshold_pct: 10,
        updated_at: new Date().toISOString(),
      })

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (supabaseUrl && supabaseAnonKey) {
      fetch(`${supabaseUrl}/functions/v1/send-welcome-email`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${supabaseAnonKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, display_name: fullName }),
      }).catch(() => {})
    }

    setSuccess(true)
    setTimeout(() => {
      router.refresh()
      router.push("/perfil")
    }, 2500)
  }

  const firstName = fullName.split(" ")[0]

  if (success) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-emerald-600/10 blur-3xl" />
        </div>
        <div className="relative text-center">
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
            <div className="relative w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center shadow-xl shadow-emerald-900/50">
              <CheckCircle2 className="h-12 w-12 text-white" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white">
            {firstName ? `Bienvenido, ${firstName}!` : "Todo listo"}
          </h2>
          <p className="text-slate-400 mt-2">Tu cuenta ha sido creada correctamente.</p>
          {email && (
            <p className="text-sm text-slate-500 mt-1">
              Email de confirmación enviado a{" "}
              <span className="text-slate-300 font-medium">{email}</span>
            </p>
          )}
          <div className="mt-6 flex items-center justify-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        </div>
      </div>
    )
  }

  const step3Title = isElectric
    ? "Conector de carga"
    : isPHEV
      ? "Combustible y conector"
      : "Tipo de combustible"

  const step3Subtitle = isElectric
    ? "¿Qué tipo de enchufe usa tu coche?"
    : isPHEV
      ? "Selecciona el combustible para el motor y el conector de carga"
      : "Así filtramos los precios para lo que tú necesitas"

  return (
    <TooltipProvider delayDuration={200}>
      <div className="min-h-screen flex">
        <div className="hidden lg:flex lg:w-[40%] bg-slate-900 relative overflow-hidden flex-col justify-between p-12">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-emerald-600/10 blur-3xl" />
            <div className="absolute bottom-20 right-0 w-64 h-64 rounded-full bg-emerald-500/5 blur-3xl" />
          </div>

          <Link href="/" className="relative z-10">
            <span className="text-xl font-black text-white tracking-tight">
              Ahorro<span className="text-emerald-400">Gasolina</span><span className="text-slate-400 font-bold">.es</span>
            </span>
          </Link>

          <div className="relative z-10">
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest mb-4">Por qué registrarte</p>
            <div className="space-y-5">
              {[
                { n: "01", title: "Perfil personalizado", desc: "Filtros y alertas ajustadas a tu vehículo y combustible." },
                { n: "02", title: "Favoritas guardadas", desc: "Accede rápido a las gasolineras que más usas." },
                { n: "03", title: "Alertas de precio", desc: "Te avisamos cuando bajan los precios en tu zona." },
              ].map((item) => (
                <div key={item.n} className="flex gap-4">
                  <span className="text-emerald-500/40 font-black text-lg leading-none flex-shrink-0">{item.n}</span>
                  <div>
                    <p className="text-white font-semibold text-sm">{item.title}</p>
                    <p className="text-slate-400 text-xs mt-0.5 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10">
            <p className="text-slate-600 text-xs">Gratis. Sin tarjeta. Sin compromiso.</p>
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-center bg-slate-50 px-6 py-12 lg:px-12 xl:px-16 overflow-y-auto">
          <div className="w-full max-w-md mx-auto">
            <div className="lg:hidden mb-8">
              <Link href="/">
                <span className="text-xl font-black text-slate-900 tracking-tight">
                  Ahorro<span className="text-emerald-600">Gasolina</span><span className="text-zinc-400 font-bold">.es</span>
                </span>
              </Link>
            </div>

            <div className="mb-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Paso {step} de {TOTAL_STEPS}</p>
            </div>

            <StepIndicator current={step} powertrain={powertrain} />

            {error && (
              <div className="flex items-center gap-2.5 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {step === 1 && (
              <div>
                <StepHeader
                  title="Crea tu cuenta"
                  subtitle="Menos de 2 minutos y ya tienes acceso a todo"
                />

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center">
                      <Label className="text-sm font-medium text-slate-700">Nombre completo</Label>
                      <FieldTooltip tip="Usaremos tu nombre para personalizar tu experiencia." />
                    </div>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Tu nombre y apellidos"
                        autoComplete="name"
                        className="pl-9 h-11 border-slate-200 focus-visible:ring-emerald-400 focus-visible:border-emerald-400 bg-white"
                        onKeyDown={(e) => e.key === "Enter" && handleNext()}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center">
                      <Label className="text-sm font-medium text-slate-700">Email</Label>
                      <FieldTooltip tip="Solo lo usamos para enviarte alertas de precio cuando las actives. Sin spam." />
                    </div>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="tu@email.com"
                        autoComplete="email"
                        className="pl-9 h-11 border-slate-200 focus-visible:ring-emerald-400 focus-visible:border-emerald-400 bg-white"
                        onKeyDown={(e) => e.key === "Enter" && handleNext()}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center">
                      <Label className="text-sm font-medium text-slate-700">Contraseña</Label>
                      <FieldTooltip tip="Mezcla mayúsculas, números y símbolos para mayor seguridad." />
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Mínimo 8 caracteres"
                        autoComplete="new-password"
                        className="pl-9 pr-10 h-11 border-slate-200 focus-visible:ring-emerald-400 focus-visible:border-emerald-400 bg-white"
                        onKeyDown={(e) => e.key === "Enter" && handleNext()}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {password.length > 0 && (
                      <div className="space-y-1">
                        <div className="flex gap-1">
                          {[1, 2, 3].map((seg) => (
                            <div
                              key={seg}
                              className={cn(
                                "h-1 flex-1 rounded-full transition-all duration-300",
                                pwdStrength >= seg ? pwdStrengthColor : "bg-slate-200"
                              )}
                            />
                          ))}
                        </div>
                        <p className={cn("text-xs font-medium", pwdStrengthText)}>
                          Seguridad: {pwdStrengthLabel}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <Button
                  onClick={handleNext}
                  className="w-full mt-6 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold gap-2 h-11 rounded-xl transition-all"
                >
                  Continuar
                  <ArrowRight className="h-4 w-4" />
                </Button>

                <p className="text-center text-sm text-slate-500 mt-4">
                  ¿Ya tienes cuenta?{" "}
                  <Link href="/auth/login" className="text-emerald-600 hover:text-emerald-700 font-semibold transition-colors">
                    Inicia sesión
                  </Link>
                </p>
              </div>
            )}

            {step === 2 && (
              <div>
                <StepHeader
                  title="Tu vehículo"
                  subtitle="Lo usamos para calcular tu ahorro real por repostaje"
                />

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center">
                      <Label className="text-sm font-medium text-slate-700">Marca</Label>
                      <FieldTooltip tip="Esto nos permite mostrarte ofertas y cálculos de ahorro relevantes para tu coche." />
                    </div>
                    <Select value={carMake} onValueChange={(v) => { setCarMake(v); setCarModel("") }}>
                      <SelectTrigger className="border-slate-200 h-11 bg-white">
                        <SelectValue placeholder="Selecciona la marca..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-64">
                        {CAR_MAKES.map((make) => (
                          <SelectItem key={make} value={make}>{make}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {carMake && availableModels.length > 0 && (
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium text-slate-700">Modelo</Label>
                      <Select value={carModel} onValueChange={setCarModel}>
                        <SelectTrigger className="border-slate-200 h-11 bg-white">
                          <SelectValue placeholder="Selecciona el modelo..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-64">
                          {availableModels.map((model) => (
                            <SelectItem key={model} value={model}>{model}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {carMake && availableModels.length === 0 && (
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium text-slate-700">Modelo</Label>
                      <Input
                        value={carModel}
                        onChange={(e) => setCarModel(e.target.value)}
                        placeholder="Escribe el modelo..."
                        className="h-11 border-slate-200 focus-visible:ring-emerald-400 bg-white"
                      />
                    </div>
                  )}

                  <div className="space-y-2 pt-1">
                    <Label className="text-sm font-medium text-slate-700">Carrocería</Label>
                    <div className="grid grid-cols-2 gap-2.5">
                      {BODY_TYPES.map((bt) => {
                        const IconComp = bt.icon
                        const selected = bodyType === bt.value
                        return (
                          <button
                            key={bt.value}
                            type="button"
                            onClick={() => setBodyType(bodyType === bt.value ? "" : bt.value)}
                            className={cn(
                              "relative flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all duration-150 text-center",
                              selected
                                ? "border-emerald-500 bg-emerald-50"
                                : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                            )}
                          >
                            {selected && (
                              <span className="absolute top-2 left-2 w-4 h-4 rounded bg-emerald-500 flex items-center justify-center">
                                <svg viewBox="0 0 10 10" className="w-2.5 h-2.5 text-white" fill="currentColor">
                                  <path d="M1.5 5L4 7.5L8.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                                </svg>
                              </span>
                            )}
                            <IconComp className={cn("w-full h-10", selected ? "text-slate-900" : "text-slate-600")} />
                            <span className={cn("text-sm font-semibold leading-tight", selected ? "text-slate-900" : "text-slate-700")}>
                              {bt.label}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="space-y-2 pt-1">
                    <Label className="text-sm font-medium text-slate-700">Propulsión</Label>
                    <div className="space-y-2">
                      {POWERTRAIN_OPTIONS.map((opt) => {
                        const selected = powertrain === opt.value
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              const newPowertrain = powertrain === opt.value ? "" : opt.value
                              setPowertrain(newPowertrain)
                              if (newPowertrain === "electric") {
                                setFuelType("electric")
                              } else if (fuelType === "electric") {
                                setFuelType("gasolina95")
                              }
                            }}
                            className={cn(
                              "w-full flex items-center gap-3 rounded-xl border-2 text-left transition-all duration-200 overflow-hidden",
                              selected
                                ? cn("border-2", opt.accentBorder, opt.accentLight)
                                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                            )}
                          >
                            <div className={cn("w-1 self-stretch flex-shrink-0 transition-colors", selected ? opt.accentBg : "bg-transparent")} />
                            <div className="flex items-center gap-3 py-2.5 pr-4 flex-1">
                              <div className={cn(
                                "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors",
                                selected ? cn(opt.accentBg, "text-white") : "bg-slate-100 text-slate-400"
                              )}>
                                {opt.icon}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className={cn("font-semibold text-sm", selected ? "text-slate-900" : "text-slate-700")}>
                                    {opt.label}
                                  </p>
                                  {opt.badge && (
                                    <span className="text-[10px] font-semibold bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded-full">
                                      {opt.badge}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-slate-500 leading-relaxed">{opt.description}</p>
                              </div>
                              <div className={cn(
                                "w-4 h-4 rounded-full border-2 flex-shrink-0 transition-all",
                                selected ? cn(opt.accentBorder, opt.accentBg) : "border-slate-300 bg-white"
                              )} />
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <Button variant="outline" onClick={handleBack} className="h-11 px-4 border-slate-200 rounded-xl bg-white">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={handleNext}
                    className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold gap-2 h-11 rounded-xl"
                  >
                    Continuar
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>

                <button
                  onClick={() => { setCarMake(""); setCarModel(""); setError(null); setStep(3) }}
                  className="w-full mt-3 text-sm text-slate-400 hover:text-slate-600 transition-colors"
                >
                  Omitir por ahora
                </button>
              </div>
            )}

            {step === 3 && (
              <div>
                <StepHeader title={step3Title} subtitle={step3Subtitle} />

                {isElectric ? (
                  <div className="space-y-2">
                    <ConnectorTypePicker value={connectorType} onChange={setConnectorType} size="md" />
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      {FUEL_OPTIONS.map((opt) => {
                        const selected = fuelType === opt.value
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setFuelType(opt.value)}
                            className={cn(
                              "w-full flex items-center gap-3 rounded-xl border-2 text-left transition-all duration-200 overflow-hidden",
                              selected
                                ? cn("border-2", opt.accentBorder, opt.accentLight)
                                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                            )}
                          >
                            <div className={cn("w-1 self-stretch flex-shrink-0 transition-colors", selected ? opt.accentBg : "bg-transparent")} />
                            <div className="flex items-center gap-3 py-3 pr-4 flex-1">
                              <div className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors",
                                selected ? cn(opt.accentBg, "text-white") : "bg-slate-100 text-slate-400"
                              )}>
                                {opt.icon}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={cn("font-semibold text-sm", selected ? "text-slate-900" : "text-slate-700")}>
                                  {opt.label}
                                </p>
                                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{opt.description}</p>
                              </div>
                              <div className={cn(
                                "w-4 h-4 rounded-full border-2 flex-shrink-0 transition-all",
                                selected ? cn(opt.accentBorder, opt.accentBg) : "border-slate-300 bg-white"
                              )} />
                            </div>
                          </button>
                        )
                      })}
                    </div>

                    {isPHEV && (
                      <div className="mt-5">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="flex-1 h-px bg-slate-200" />
                          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Conector de carga</span>
                          <div className="flex-1 h-px bg-slate-200" />
                        </div>
                        <ConnectorTypePicker value={connectorType} onChange={setConnectorType} size="md" />
                      </div>
                    )}
                  </>
                )}

                <div className="flex gap-3 mt-6">
                  <Button variant="outline" onClick={handleBack} className="h-11 px-4 border-slate-200 rounded-xl bg-white">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={() => { setError(null); setStep(4) }}
                    className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold gap-2 h-11 rounded-xl"
                  >
                    Continuar
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div>
                <StepHeader
                  title="Tu zona"
                  subtitle="Para mostrarte las gasolineras más baratas cerca de ti"
                />

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center">
                      <Label className="text-sm font-medium text-slate-700">Código postal</Label>
                      <FieldTooltip tip="Tus datos de ubicación nunca se comparten con terceros." />
                    </div>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        type="text"
                        value={postcode}
                        onChange={(e) => setPostcode(e.target.value)}
                        placeholder="28001"
                        maxLength={10}
                        className="pl-9 h-11 border-slate-200 focus-visible:ring-emerald-400 bg-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-slate-700">
                      Localidad o ciudad
                      <span className="ml-1.5 text-xs font-normal text-slate-400">(opcional)</span>
                    </Label>
                    <Input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Madrid"
                      className="h-11 border-slate-200 focus-visible:ring-emerald-400 bg-white"
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <Button variant="outline" onClick={handleBack} className="h-11 px-4 border-slate-200 rounded-xl bg-white">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={() => {
                      if (!postcode.trim() && !location.trim()) {
                        setError("Introduce tu código postal o localidad.")
                        return
                      }
                      setError(null)
                      setStep(5)
                    }}
                    className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold gap-2 h-11 rounded-xl"
                  >
                    Continuar
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>

                <button
                  onClick={() => { setPostcode(""); setLocation(""); setError(null); setStep(5) }}
                  className="w-full mt-3 text-sm text-slate-400 hover:text-slate-600 transition-colors"
                >
                  Omitir por ahora
                </button>
              </div>
            )}

            {step === 5 && (
              <div>
                <StepHeader
                  title="Revisa y confirma"
                  subtitle="Un vistazo antes de crear tu cuenta"
                />

                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-4">
                  <SummaryRow label="Nombre" value={fullName} onEdit={() => setStep(1)} />
                  <SummaryRow label="Email" value={email} onEdit={() => setStep(1)} />
                  <SummaryRow label="Contraseña" value="••••••••" onEdit={() => setStep(1)} />
                  {carMake && (
                    <SummaryRow
                      label="Vehículo"
                      value={carModel ? `${carMake} ${carModel}` : carMake}
                      onEdit={() => setStep(2)}
                    />
                  )}
                  {carMake && !isElectric && (
                    <SummaryRow
                      label="Combustible"
                      value={FUEL_OPTIONS.find((f) => f.value === fuelType)?.label ?? fuelType}
                      onEdit={() => setStep(3)}
                    />
                  )}
                  {connectorType && (
                    <SummaryRow
                      label="Conector"
                      value={connectorType === "type2" ? "Type 2" : connectorType === "ccs" ? "CCS Combo" : connectorType === "chademo" ? "CHAdeMO" : "Schuko"}
                      onEdit={() => setStep(3)}
                    />
                  )}
                  {(postcode || location) && (
                    <SummaryRow
                      label="Zona"
                      value={[postcode, location].filter(Boolean).join(" · ")}
                      onEdit={() => setStep(4)}
                    />
                  )}
                </div>

                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-5">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="marketing-consent"
                      checked={marketingConsent}
                      onCheckedChange={(v) => setMarketingConsent(v === true)}
                      className="mt-0.5 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                    />
                    <div className="flex-1">
                      <label
                        htmlFor="marketing-consent"
                        className="text-sm text-slate-700 leading-relaxed cursor-pointer"
                      >
                        <span className="font-semibold text-slate-900">Quiero recibir alertas de precios</span> cuando bajen en mis gasolineras guardadas.
                      </label>
                      <p className="text-xs text-slate-500 mt-1">
                        Puedes desactivarlas en cualquier momento desde tu perfil.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={handleBack} className="h-11 px-4 border-slate-200 rounded-xl bg-white">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold gap-2 h-11 rounded-xl"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        Creando cuenta...
                      </span>
                    ) : (
                      <>
                        Crear cuenta
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>

                <p className="text-xs text-slate-400 text-center mt-4 leading-relaxed">
                  Al registrarte aceptas nuestros{" "}
                  <span className="underline cursor-pointer hover:text-slate-600 transition-colors">Términos de uso</span>
                  {" "}y{" "}
                  <span className="underline cursor-pointer hover:text-slate-600 transition-colors">Política de privacidad</span>.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}

function SummaryRow({
  label,
  value,
  onEdit,
}: {
  label: string
  value: string
  onEdit: () => void
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 last:border-0 group">
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide w-20 flex-shrink-0">{label}</span>
        <span className="text-sm font-medium text-slate-900 truncate max-w-[160px]">{value}</span>
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="text-slate-300 hover:text-emerald-600 transition-colors ml-2 flex-shrink-0 opacity-0 group-hover:opacity-100"
        aria-label={`Editar ${label}`}
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
