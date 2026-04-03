"use client"

import Link from "next/link"
import { useState } from "react"
import { Mail, ArrowLeft, CircleCheck as CheckCircle2, CircleAlert as AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase"

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/update-password`,
    })

    if (authError) {
      setError("No se pudo enviar el correo. Inténtalo de nuevo.")
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <span className="text-2xl font-black text-slate-900 tracking-tight">
              Ahorro<span className="text-emerald-600">Gasolina</span><span className="text-zinc-400 font-bold">.es</span>
            </span>
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Restablecer contraseña</h1>
          <p className="text-slate-500 mt-1">Te enviaremos un enlace para restablecer tu contraseña</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          {sent ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-7 w-7 text-emerald-600" />
              </div>
              <h2 className="font-bold text-slate-900 text-lg">Correo enviado</h2>
              <p className="text-slate-500 text-sm mt-2">
                Revisa tu bandeja de entrada y sigue el enlace para restablecer tu contraseña.
              </p>
              <Link href="/auth/login" className="inline-block mt-6">
                <Button variant="outline" className="gap-2 border-slate-200">
                  <ArrowLeft className="h-4 w-4" />
                  Volver al inicio de sesión
                </Button>
              </Link>
            </div>
          ) : (
            <>
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
                      className="pl-9 border-slate-200 focus:border-emerald-400 focus:ring-emerald-400/20"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-semibold h-11"
                >
                  {loading ? "Enviando..." : "Enviar enlace de restablecimiento"}
                </Button>
              </form>
            </>
          )}
        </div>

        {!sent && (
          <div className="text-center mt-6">
            <Link href="/auth/login" className="text-sm text-slate-500 hover:text-slate-700 flex items-center justify-center gap-1">
              <ArrowLeft className="h-3.5 w-3.5" />
              Volver al inicio de sesión
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
