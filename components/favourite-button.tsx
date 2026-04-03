"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Heart } from "lucide-react"
import { cn } from "@/lib/utils"
import { useFavourites } from "@/hooks/use-favourites"

interface FavouriteButtonProps {
  stationId: string
  className?: string
  size?: "sm" | "md"
}

export function FavouriteButton({ stationId, className, size = "md" }: FavouriteButtonProps) {
  const router = useRouter()
  const { favouriteIds, loading, isLoggedIn, toggle } = useFavourites()
  const [pending, setPending] = useState(false)

  const isFav = favouriteIds.has(stationId)

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()

    if (!isLoggedIn) {
      router.push("/auth/login")
      return
    }

    if (pending) return
    setPending(true)
    await toggle(stationId)
    setPending(false)
  }

  if (loading) return null

  return (
    <button
      onClick={handleClick}
      aria-label={isFav ? "Quitar de favoritos" : "Guardar en favoritos"}
      className={cn(
        "flex items-center justify-center rounded-lg border transition-all duration-150",
        size === "sm"
          ? "w-8 h-8"
          : "w-9 h-9",
        isFav
          ? "bg-red-50 border-red-200 text-red-500 hover:bg-red-100 hover:border-red-300"
          : "bg-white border-slate-200 text-slate-400 hover:bg-red-50 hover:border-red-200 hover:text-red-400",
        pending && "opacity-60 cursor-wait",
        className
      )}
    >
      <Heart className={cn(size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4", isFav && "fill-current")} />
    </button>
  )
}
