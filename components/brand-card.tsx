import Link from "next/link"
import { ArrowRight } from "lucide-react"
import type { Brand } from "@/lib/types"
import { formatPrice } from "@/lib/format"
import { cn } from "@/lib/utils"

interface BrandCardProps {
  brand: Brand
  className?: string
}

export function BrandCard({ brand, className }: BrandCardProps) {
  return (
    <Link href={`/marca/${brand.slug}`}>
      <div className={cn(
        "group relative flex flex-col gap-3 p-5 bg-white rounded-2xl border border-slate-200",
        "hover:border-slate-300 hover:shadow-lg transition-all duration-200 cursor-pointer",
        className
      )}>
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm flex-shrink-0"
            style={{ backgroundColor: brand.color }}
          >
            {brand.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-base group-hover:text-emerald-700 transition-colors">
              {brand.name}
            </h3>
            {brand.stations && (
              <p className="text-xs text-slate-500">{brand.stations.toLocaleString("es-ES")} estaciones</p>
            )}
          </div>
          <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-emerald-500 transition-colors ml-auto" />
        </div>

        {(brand.avgGasolina95 || brand.avgDiesel) && (
          <div className="flex gap-3 pt-2 border-t border-slate-100">
            {brand.avgGasolina95 && (
              <div>
                <p className="text-xs text-slate-400 mb-0.5">G-95</p>
                <p className="text-sm font-semibold text-slate-700">{formatPrice(brand.avgGasolina95)}</p>
              </div>
            )}
            {brand.avgDiesel && (
              <div>
                <p className="text-xs text-slate-400 mb-0.5">Diésel</p>
                <p className="text-sm font-semibold text-slate-700">{formatPrice(brand.avgDiesel)}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </Link>
  )
}
