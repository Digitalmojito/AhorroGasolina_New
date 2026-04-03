"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { MapPin, Loader as Loader2 } from "lucide-react"
import type { CiudadSuggestion } from "@/app/api/ciudades/route"

interface CityAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onSelect: (suggestion: CiudadSuggestion) => void
  placeholder?: string
  inputClassName?: string
  compact?: boolean
}

function highlightMatch(text: string, query: string) {
  if (!query) return <span>{text}</span>
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return <span>{text}</span>
  return (
    <span>
      {text.slice(0, idx)}
      <span className="font-semibold text-slate-900">{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </span>
  )
}

export function CityAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "Ciudad, dirección o código postal...",
  inputClassName = "",
  compact = false,
}: CityAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<CiudadSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const skipFetchRef = useRef(false)

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.length < 2) {
      setSuggestions([])
      setOpen(false)
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/ciudades?q=${encodeURIComponent(q)}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: CiudadSuggestion[] = await res.json()
      const safeData = Array.isArray(data) ? data : []
      setSuggestions(safeData)
      setOpen(safeData.length > 0)
      setActiveIndex(-1)
    } catch {
      setSuggestions([])
      setOpen(false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (skipFetchRef.current) {
      skipFetchRef.current = false
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchSuggestions(value), 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [value, fetchSuggestions])

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open])

  function handleSelect(suggestion: CiudadSuggestion) {
    skipFetchRef.current = true
    onChange(suggestion.localidad)
    onSelect(suggestion)
    setOpen(false)
    setSuggestions([])
    setActiveIndex(-1)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, -1))
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault()
      handleSelect(suggestions[activeIndex])
    } else if (e.key === "Escape") {
      setOpen(false)
    }
  }

  const inputHeight = compact ? "h-9" : "h-12"
  const textSize = compact ? "text-sm" : "text-base"

  return (
    <div ref={containerRef} className="relative flex-1">
      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none z-10" />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => { if (suggestions.length > 0) setOpen(true) }}
        placeholder={placeholder}
        autoComplete="off"
        className={[
          "w-full pl-9 pr-8 rounded-md border border-slate-200 bg-white/80 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-shadow",
          inputHeight,
          textSize,
          inputClassName,
        ].join(" ")}
      />
      {loading && (
        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 animate-spin" />
      )}

      {open && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 rounded-lg border border-slate-200 bg-white shadow-xl overflow-hidden z-[9999]">
          {suggestions.map((s, i) => (
            <button
              key={`${s.localidad}||${s.provincia}`}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                handleSelect(s)
              }}
              onMouseEnter={() => setActiveIndex(i)}
              className={[
                "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                i === activeIndex ? "bg-emerald-50" : "hover:bg-slate-50",
              ].join(" ")}
            >
              <MapPin className={["h-4 w-4 shrink-0", i === activeIndex ? "text-emerald-500" : "text-slate-400"].join(" ")} />
              <div className="flex-1 min-w-0">
                <div className={["text-sm truncate", i === activeIndex ? "text-emerald-700" : "text-slate-700"].join(" ")}>
                  {highlightMatch(s.localidad, value)}
                </div>
                <div className="text-xs text-slate-400 truncate">{s.provincia}</div>
              </div>
              <div className="text-xs text-slate-400 shrink-0">{s.stationCount} est.</div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
