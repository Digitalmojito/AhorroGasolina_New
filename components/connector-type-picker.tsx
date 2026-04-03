"use client"

import { cn } from "@/lib/utils"

interface ConnectorOption {
  value: string
  label: string
  description: string
  icon: React.ReactNode
}

const CONNECTOR_OPTIONS: ConnectorOption[] = [
  {
    value: "type2",
    label: "Type 2",
    description: "El más común en Europa",
    icon: (
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-10 h-10">
        <circle cx="24" cy="24" r="16" stroke="currentColor" strokeWidth="2.5" fill="none" />
        <circle cx="24" cy="18" r="2.5" fill="currentColor" />
        <circle cx="16" cy="24" r="2.5" fill="currentColor" />
        <circle cx="32" cy="24" r="2.5" fill="currentColor" />
        <circle cx="18" cy="31" r="2.5" fill="currentColor" />
        <circle cx="30" cy="31" r="2.5" fill="currentColor" />
        <rect x="21" y="34" width="6" height="3" rx="1.5" fill="currentColor" />
      </svg>
    ),
  },
  {
    value: "ccs",
    label: "CCS Combo",
    description: "Carga rápida en CC",
    icon: (
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-10 h-10">
        <circle cx="24" cy="18" r="12" stroke="currentColor" strokeWidth="2.5" fill="none" />
        <circle cx="24" cy="13" r="2" fill="currentColor" />
        <circle cx="18" cy="18" r="2" fill="currentColor" />
        <circle cx="30" cy="18" r="2" fill="currentColor" />
        <circle cx="20" cy="23" r="2" fill="currentColor" />
        <circle cx="28" cy="23" r="2" fill="currentColor" />
        <rect x="14" y="31" width="8" height="10" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
        <rect x="26" y="31" width="8" height="10" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
        <path d="M18 31 L14 28 M30 31 L34 28" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    value: "chademo",
    label: "CHAdeMO",
    description: "Estándar japonés",
    icon: (
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-10 h-10">
        <circle cx="24" cy="24" r="15" stroke="currentColor" strokeWidth="2.5" fill="none" />
        <circle cx="17" cy="20" r="3.5" stroke="currentColor" strokeWidth="2" fill="none" />
        <circle cx="31" cy="20" r="3.5" stroke="currentColor" strokeWidth="2" fill="none" />
        <circle cx="24" cy="30" r="2.5" fill="currentColor" />
        <path d="M20 30 L28 30" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    value: "schuko",
    label: "Schuko / Tipo 1",
    description: "Enchufe doméstico",
    icon: (
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-10 h-10">
        <circle cx="24" cy="24" r="15" stroke="currentColor" strokeWidth="2.5" fill="none" />
        <circle cx="19" cy="22" r="2.5" fill="currentColor" />
        <circle cx="29" cy="22" r="2.5" fill="currentColor" />
        <path d="M21 30 Q24 33 27 30" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },
]

interface ConnectorTypePickerProps {
  value: string
  onChange: (value: string) => void
  size?: "sm" | "md"
}

export function ConnectorTypePicker({ value, onChange, size = "md" }: ConnectorTypePickerProps) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {CONNECTOR_OPTIONS.map((opt) => {
        const selected = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(selected ? "" : opt.value)}
            className={cn(
              "relative flex flex-col items-center gap-2 rounded-xl border-2 transition-all duration-200 text-center",
              size === "md" ? "p-4" : "p-3",
              selected
                ? "border-teal-500 bg-teal-50 text-teal-700"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
            )}
          >
            {selected && (
              <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-teal-500 flex items-center justify-center">
                <svg viewBox="0 0 10 10" className="w-2.5 h-2.5 text-white" fill="currentColor">
                  <path d="M1.5 5L4 7.5L8.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </svg>
              </span>
            )}
            <span className={cn(selected ? "text-teal-600" : "text-slate-600")}>
              {opt.icon}
            </span>
            <div>
              <p className={cn("font-semibold leading-tight", size === "md" ? "text-sm" : "text-xs", selected ? "text-teal-800" : "text-slate-800")}>
                {opt.label}
              </p>
              <p className={cn("leading-snug mt-0.5", size === "md" ? "text-xs" : "text-[10px]", selected ? "text-teal-600" : "text-slate-400")}>
                {opt.description}
              </p>
            </div>
          </button>
        )
      })}
    </div>
  )
}

export { CONNECTOR_OPTIONS }
