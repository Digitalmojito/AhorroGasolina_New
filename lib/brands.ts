import type { Brand } from "./types"

export const BRANDS: Brand[] = [
  { slug: "repsol", name: "Repsol", color: "#FF6B00" },
  { slug: "cepsa", name: "Cepsa", color: "#0071B9" },
  { slug: "bp", name: "BP", color: "#007A33" },
  { slug: "shell", name: "Shell", color: "#DD1D21" },
  { slug: "galp", name: "Galp", color: "#E4002B" },
  { slug: "petronor", name: "Petronor", color: "#0052A5" },
  { slug: "ballenoil", name: "Ballenoil", color: "#1A1A2E" },
  { slug: "plenoil", name: "Plenoil", color: "#00A651" },
  { slug: "alcampo", name: "Alcampo", color: "#E30613" },
  { slug: "carrefour", name: "Carrefour", color: "#007DC5" },
  { slug: "bonarea", name: "BonÀrea", color: "#E4002B" },
  { slug: "meroil", name: "Meroil", color: "#FF6600" },
  { slug: "avia", name: "Avia", color: "#FF0000" },
  { slug: "campsa", name: "Campsa", color: "#D22027" },
  { slug: "tamoil", name: "Tamoil", color: "#FF6600" },
  { slug: "eroski", name: "Eroski", color: "#E20020" },
  { slug: "disa", name: "Disa", color: "#005BAC" },
  { slug: "texaco", name: "Texaco", color: "#CC0000" },
]

export function getBrandBySlug(slug: string): Brand | undefined {
  return BRANDS.find((b) => b.slug === slug.toLowerCase())
}

export function slugifyBrand(rotulo: string): string {
  return rotulo
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "")
}

export function getBrandColor(rotulo: string): string {
  const slug = slugifyBrand(rotulo)
  const brand = BRANDS.find((b) => slug.includes(b.slug) || b.slug.includes(slug))
  return brand?.color ?? "#6b7280"
}

export function getBrandInitials(rotulo: string): string {
  return rotulo
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}
