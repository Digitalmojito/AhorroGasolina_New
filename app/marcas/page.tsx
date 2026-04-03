import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, Tag } from "lucide-react"
import { BRANDS } from "@/lib/brands"

export const metadata: Metadata = {
  title: "Marcas de Gasolineras en España - AhorroGasolina.es",
  description: "Explora todas las marcas de gasolineras en España. Compara precios medios por cadena.",
}

export default function MarcasPage() {
  return (
    <div className="bg-slate-50 min-h-screen">
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="inline-flex items-center gap-2 bg-white/10 text-white/80 text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
            <Tag className="h-3 w-3" />
            {BRANDS.length} marcas disponibles
          </div>
          <h1 className="text-4xl font-extrabold text-white mb-2">
            Marcas de Gasolineras
          </h1>
          <p className="text-slate-300 text-lg max-w-xl">
            Compara precios medios entre las principales cadenas de gasolineras de España.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {BRANDS.map((brand) => (
            <Link key={brand.slug} href={`/marca/${brand.slug}`}>
              <div className="group bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-lg hover:border-slate-300 transition-all duration-200 cursor-pointer h-full">
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-base shadow-sm flex-shrink-0"
                    style={{ backgroundColor: brand.color }}
                  >
                    {brand.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-900 text-base group-hover:text-emerald-700 transition-colors truncate">
                      {brand.name}
                    </h3>
                    <p className="text-xs text-slate-400">Gasolineras en España</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-emerald-500 transition-colors flex-shrink-0" />
                </div>
                <div className="bg-slate-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-slate-400 mb-1">Ver precios actuales</p>
                  <p className="text-sm font-semibold text-emerald-600 group-hover:text-emerald-700">
                    Consultar →
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
