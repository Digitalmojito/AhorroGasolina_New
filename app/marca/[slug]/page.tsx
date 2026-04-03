import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, MapPin, TrendingDown, Fuel } from "lucide-react"
import { Button } from "@/components/ui/button"
import { StationCard } from "@/components/station-card"
import { getBrandBySlug } from "@/lib/brands"
import { formatPrice } from "@/lib/format"
import type { Estacion } from "@/lib/types"

interface PageProps {
  params: { slug: string }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const brand = getBrandBySlug(params.slug)
  return {
    title: `${brand?.name ?? params.slug} - AhorroGasolina.es`,
    description: `Precios de combustible en gasolineras ${brand?.name ?? params.slug} en España.`,
  }
}

async function getBrandData(slug: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
    const res = await fetch(`${baseUrl}/api/marca/${slug}`, { next: { revalidate: 3600 } })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

const BRAND_DESCRIPTIONS: Record<string, string> = {
  repsol: "Repsol es la principal compañía energética de España y una de las mayores de Europa. Con más de 3.500 estaciones en España, es la red más extensa del país.",
  cepsa: "Cepsa es una compañía energética española con una amplia red de estaciones de servicio en toda la Península Ibérica y Canarias.",
  bp: "BP (British Petroleum) opera en España una extensa red de estaciones con servicios adicionales como tiendas Wild Bean Cafe.",
  shell: "Shell es una de las compañías de energía más grandes del mundo, con presencia en más de 70 países, incluyendo España.",
  galp: "Galp es una empresa energética portuguesa con importante presencia en España, especialmente en el norte y oeste peninsular.",
  ballenoil: "Ballenoil es una cadena española de gasolineras conocida por sus precios muy competitivos, con estaciones de autoservicio sin personal.",
  plenoil: "Plenoil es una cadena española de gasolineras de bajo coste que opera principalmente en la mitad sur de España.",
  alcampo: "Alcampo opera gasolineras asociadas a sus hipermercados, ofreciendo precios muy competitivos a sus clientes.",
  carrefour: "Carrefour gestiona estaciones de servicio en sus centros comerciales, destacando por sus precios reducidos.",
}

export default async function MarcaPage({ params }: PageProps) {
  const slug = params.slug.toLowerCase()
  const brand = getBrandBySlug(slug)
  const data = await getBrandData(slug)

  const stations: Estacion[] = data?.stations ?? []
  const avgGasolina95: number | undefined = data?.brand?.avgGasolina95
  const avgDiesel: number | undefined = data?.brand?.avgDiesel
  const description = BRAND_DESCRIPTIONS[slug] ?? `${brand?.name ?? slug} opera una red de gasolineras en España con combustibles de calidad.`

  return (
    <div className="bg-slate-50 min-h-screen">
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <Link href="/marcas">
            <Button variant="ghost" className="mb-4 -ml-2 text-white/70 hover:text-white hover:bg-white/10 gap-2">
              <ArrowLeft className="h-4 w-4" />
              Todas las marcas
            </Button>
          </Link>

          <div className="flex items-center gap-4 mb-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-lg flex-shrink-0"
              style={{ backgroundColor: brand?.color ?? "#6b7280" }}
            >
              {(brand?.name ?? slug).slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h1 className="text-4xl font-extrabold text-white">{brand?.name ?? slug}</h1>
              {stations.length > 0 && (
                <p className="text-slate-400 mt-1">{stations.length} estaciones en España</p>
              )}
            </div>
          </div>

          <p className="text-slate-300 max-w-2xl text-sm leading-relaxed">{description}</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {(avgGasolina95 !== undefined || avgDiesel !== undefined) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {avgGasolina95 !== undefined && (
              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-8 w-8 bg-emerald-50 rounded-xl flex items-center justify-center">
                    <Fuel className="h-4 w-4 text-emerald-600" />
                  </div>
                  <span className="font-medium text-slate-700">Gasolina 95 (media)</span>
                </div>
                <p className="text-3xl font-extrabold text-slate-900">{formatPrice(avgGasolina95)}</p>
              </div>
            )}
            {avgDiesel !== undefined && (
              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-8 w-8 bg-blue-50 rounded-xl flex items-center justify-center">
                    <TrendingDown className="h-4 w-4 text-blue-600" />
                  </div>
                  <span className="font-medium text-slate-700">Diésel A (media)</span>
                </div>
                <p className="text-3xl font-extrabold text-slate-900">{formatPrice(avgDiesel)}</p>
              </div>
            )}
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-900">
              Estaciones de {brand?.name ?? slug}
            </h2>
            <Link href={`/buscar?tipo=gasolina95`}>
              <Button variant="outline" size="sm" className="border-slate-200 text-slate-600 gap-1">
                <MapPin className="h-3.5 w-3.5" />
                Ver en mapa
              </Button>
            </Link>
          </div>

          {stations.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <Fuel className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No se encontraron estaciones</p>
              <p className="text-sm text-slate-400 mt-1">Intenta buscar directamente en el mapa</p>
              <Link href="/buscar" className="mt-4 inline-block">
                <Button className="bg-emerald-500 hover:bg-emerald-600 text-white mt-4">
                  Buscar en el mapa
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {stations.slice(0, 50).map((s) => (
                <StationCard
                  key={s.id}
                  station={s}
                />
              ))}
              {stations.length > 50 && (
                <p className="text-center text-sm text-slate-500 py-4">
                  Mostrando 50 de {stations.length} estaciones
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
