import Link from "next/link"
import { MapPin, Shield, Zap, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SearchForm } from "@/components/search-form"

const STEPS = [
  { n: "01", title: "Escribe tu ciudad", desc: "O usa tu ubicación actual con un clic." },
  { n: "02", title: "Elige tu combustible", desc: "Gasolina 95, diésel, GLP y más." },
  { n: "03", title: "Ve a la más barata", desc: "Ordena por precio y ahorra en cada repostaje." },
]

export default function HomePage() {
  return (
    <div className="bg-zinc-50 min-h-screen">
      <section className="hero-section pb-20 pt-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <p className="text-emerald-400 text-sm font-semibold tracking-widest uppercase mb-6">
              Comparador de combustible en España
            </p>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-white leading-[1.02] mb-6 tracking-tight">
              Puedes seguir<br />
              pagando…<br />
              <span className="text-emerald-400">o empezar<br />a ahorrar.</span>
            </h1>

            <p className="text-slate-300 text-lg mb-3 leading-relaxed max-w-lg">
              En algunas zonas, la diferencia supera los <span className="text-white font-bold">30 céntimos por litro</span> entre la más cara y la más barata. En un depósito de 50 litros, eso son <span className="text-emerald-400 font-bold">más de 15 € en tu bolsillo</span>.
            </p>

            <div className="hero-search-card">
              <SearchForm />
            </div>

            <p className="text-slate-500 text-xs mt-3 flex items-center gap-1.5">
              <Shield className="h-3 w-3 text-slate-500 flex-shrink-0" />
              Datos oficiales del Ministerio de Industria, actualizados a diario.
            </p>
          </div>
        </div>
      </section>

      <section className="border-b border-zinc-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-zinc-200">
            <div className="py-6 sm:py-8 px-4 sm:px-6 text-center">
              <div className="text-3xl sm:text-4xl font-black text-slate-900 tabular-nums whitespace-nowrap">11.500+</div>
              <div className="text-sm text-zinc-500 mt-1">gasolineras en España</div>
            </div>
            <div className="py-6 sm:py-8 px-4 sm:px-6 text-center">
              <div className="text-3xl sm:text-4xl font-black text-emerald-600 tabular-nums whitespace-nowrap">+30 cts</div>
              <div className="text-sm text-zinc-500 mt-1">ahorro por litro en algunas zonas</div>
            </div>
            <div className="py-6 sm:py-8 px-4 sm:px-6 text-center">
              <div className="text-3xl sm:text-4xl font-black text-slate-900 tabular-nums whitespace-nowrap">24 h</div>
              <div className="text-sm text-zinc-500 mt-1">actualización de precios</div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="grid md:grid-cols-2 gap-10 items-start">
          <div>
            <p className="text-emerald-700 text-xs font-bold tracking-widest uppercase mb-4">Cómo funciona</p>
            <h2 className="text-3xl font-black text-slate-900 mb-8 leading-tight">
              Tres pasos.<br />Ahorras desde el primero.
            </h2>
            <div className="space-y-6">
              {STEPS.map((step) => (
                <div key={step.n} className="flex gap-5">
                  <div className="text-3xl font-black text-zinc-200 tabular-nums leading-none pt-0.5 w-10 flex-shrink-0">
                    {step.n}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base mb-0.5">{step.title}</h3>
                    <p className="text-sm text-zinc-500 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-8">
              <Link href="/buscar">
                <Button className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold gap-2 shadow-sm">
                  Buscar gasolineras
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-zinc-200 p-7">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                <Shield className="h-4 w-4 text-emerald-700" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Precios verificados</h3>
                <p className="text-xs text-zinc-500">Fuente oficial del Gobierno de España</p>
              </div>
            </div>
            <p className="text-sm text-zinc-600 leading-relaxed mb-5">
              Todos los precios que ves provienen directamente de la base de datos oficial del{" "}
              <span className="font-semibold text-slate-800">Ministerio de Industria, Comercio y Turismo</span>.
              No son estimaciones ni medias de usuarios — son los precios reales publicados por cada gasolinera.
            </p>
            <div className="bg-zinc-50 rounded-lg p-3.5 border border-zinc-200 mb-4">
              <p className="text-xs text-zinc-400 font-medium mb-0.5">API Oficial MINETUR</p>
              <p className="text-xs text-emerald-700 font-mono">sedeaplicaciones.minetur.gob.es</p>
            </div>
            <div className="flex items-start gap-2.5">
              <Zap className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-zinc-500 leading-relaxed">
                Los precios se sincronizan automáticamente cada 24 horas. Si una gasolinera sube o baja el precio, lo verás reflejado al día siguiente.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-emerald-700 py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                ¿Cuánto puedes ahorrar este año?
              </h2>
              <p className="text-emerald-200 text-sm mt-2 max-w-md">
                En algunas zonas el ahorro supera los 30 céntimos por litro. Si repones una vez a la semana y ahorras 15 € cada vez, son más de{" "}
                <strong className="text-white">780 € al año</strong>. Empieza ahora.
              </p>
            </div>
            <Link href="/buscar" className="flex-shrink-0">
              <Button size="lg" className="bg-white text-emerald-800 hover:bg-emerald-50 font-bold gap-2 shadow-md px-6">
                <MapPin className="h-4 w-4" />
                Ver gasolineras cerca de mí
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
