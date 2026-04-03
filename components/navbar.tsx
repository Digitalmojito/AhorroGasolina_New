"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Menu, Search, Tag, User, LogOut, Heart, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { createClient } from "@/lib/supabase"
import type { User as SupabaseUser } from "@supabase/supabase-js"

export function Navbar() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [displayName, setDisplayName] = useState<string>("")
  const [loadingUser, setLoadingUser] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoadingUser(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!user) {
      setDisplayName("")
      return
    }
    const supabase = createClient()
    supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setDisplayName(data?.display_name ?? "")
      })
  }, [user])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
    router.refresh()
  }

  const initials = displayName
    ? displayName.trim().split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? "U"

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-200 bg-white/95 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 flex-nowrap gap-2">
        <Link href="/" className="group flex items-center flex-shrink-0">
          <span className="text-lg font-black text-slate-900 tracking-tight group-hover:text-slate-700 transition-colors">
            Ahorro<span className="text-emerald-600">Gasolina</span><span className="text-zinc-400 font-bold">.es</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          <Link href="/buscar">
            <Button variant="ghost" size="sm" className="text-zinc-600 hover:text-slate-900 hover:bg-zinc-100 gap-2 font-medium">
              <Search className="h-3.5 w-3.5" />
              Buscar
            </Button>
          </Link>
          <Link href="/marcas">
            <Button variant="ghost" size="sm" className="text-zinc-600 hover:text-slate-900 hover:bg-zinc-100 gap-2 font-medium">
              <Tag className="h-3.5 w-3.5" />
              Marcas
            </Button>
          </Link>

          {!loadingUser && (
            user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="ml-3 flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors">
                    <div className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {initials}
                    </div>
                    <span className="max-w-[120px] truncate">{displayName || user.email}</span>
                    <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuItem asChild>
                    <Link href="/perfil" className="flex items-center gap-2 cursor-pointer">
                      <User className="h-4 w-4 text-slate-500" />
                      Mi perfil
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/perfil?tab=favoritas" className="flex items-center gap-2 cursor-pointer">
                      <Heart className="h-4 w-4 text-slate-500" />
                      Mis favoritas
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="flex items-center gap-2 cursor-pointer text-red-600 focus:text-red-600"
                  >
                    <LogOut className="h-4 w-4" />
                    Cerrar sesión
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2 ml-3">
                <Link href="/auth/login">
                  <Button variant="ghost" size="sm" className="text-zinc-600 hover:text-slate-900 font-medium">
                    Entrar
                  </Button>
                </Link>
                <Link href="/auth/signup">
                  <Button size="sm" className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold shadow-sm">
                    Registrarse
                  </Button>
                </Link>
              </div>
            )
          )}

          {loadingUser && (
            <div className="ml-3 w-28 h-8 bg-slate-100 rounded-full animate-pulse" />
          )}
        </nav>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild className="md:hidden flex-shrink-0">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[260px]">
            <div className="flex flex-col gap-1 mt-8">
              <Link href="/buscar" onClick={() => setOpen(false)}>
                <Button variant="ghost" className="w-full justify-start gap-3">
                  <Search className="h-4 w-4 text-emerald-600" />
                  Buscar gasolineras
                </Button>
              </Link>
              <Link href="/marcas" onClick={() => setOpen(false)}>
                <Button variant="ghost" className="w-full justify-start gap-3">
                  <Tag className="h-4 w-4 text-emerald-600" />
                  Marcas
                </Button>
              </Link>

              {!loadingUser && user && (
                <>
                  <Link href="/perfil" onClick={() => setOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start gap-3">
                      <User className="h-4 w-4 text-emerald-600" />
                      Mi perfil
                    </Button>
                  </Link>
                  <Link href="/perfil?tab=favoritas" onClick={() => setOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start gap-3">
                      <Heart className="h-4 w-4 text-emerald-600" />
                      Mis favoritas
                    </Button>
                  </Link>
                </>
              )}

              <div className="mt-4 pt-4 border-t border-zinc-100 flex flex-col gap-2">
                {!loadingUser && !user ? (
                  <>
                    <Link href="/auth/login" onClick={() => setOpen(false)}>
                      <Button variant="outline" className="w-full border-slate-200">
                        Entrar
                      </Button>
                    </Link>
                    <Link href="/auth/signup" onClick={() => setOpen(false)}>
                      <Button className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-semibold">
                        Registrarse
                      </Button>
                    </Link>
                  </>
                ) : !loadingUser && user ? (
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-3 text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => { setOpen(false); handleSignOut() }}
                  >
                    <LogOut className="h-4 w-4" />
                    Cerrar sesión
                  </Button>
                ) : null}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}
