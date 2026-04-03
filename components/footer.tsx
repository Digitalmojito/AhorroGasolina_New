import Link from "next/link"

export function Footer() {
  return (
    <footer className="border-t border-zinc-200 bg-white mt-auto">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-6">
          <Link href="/" className="flex-shrink-0">
            <span className="text-sm font-black text-slate-900 tracking-tight">
              Ahorro<span className="text-emerald-600">Gasolina</span><span className="text-zinc-400">.es</span>
            </span>
          </Link>

          <div className="flex items-center gap-5">
            <Link href="/" className="text-xs text-zinc-400 hover:text-slate-700 transition-colors">Inicio</Link>
            <Link href="/buscar" className="text-xs text-zinc-400 hover:text-slate-700 transition-colors">Buscar</Link>
            <Link href="/marcas" className="text-xs text-zinc-400 hover:text-slate-700 transition-colors">Marcas</Link>
          </div>

          <p className="text-xs text-zinc-400 text-right">
            Datos oficiales MINETUR · Actualizado diariamente
          </p>
        </div>
      </div>
    </footer>
  )
}
