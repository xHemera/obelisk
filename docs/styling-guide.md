# Styling — Tailwind CSS v4

On vise un thème JRPG sombre / fantasy médiévale.Inspirations : Final Fantasy, Dragon Quest, Honkai Star Rail MMORPG mobiles.

## Palette utilisée dans le code

| Usage | Classe | Hex |
|-------|--------|-----|
| Fond principal | `bg-[#0f0e13]` | Noir profond |
| Texte clair | `text-[#f5e6c8]` | Beige |
| Texte secondaire | `text-[#cfc8e6]` | Lavande |
| Texte grisé | `text-[#8b82a6]` | Gris-violet |
| Bordures | `border-[#3c3650]` | Violet foncé |
| Bordures hover | `border-[#5b5480]` | Violet moyen |
| Fond carte | `bg-[#242033]` | Violet très foncé |

## Patterns récurrents

```tsx
// Carte de base
<div className="rounded border border-[#3c3650] bg-[#0f0e13] p-4 text-[#cfc8e6]">

// Grille de combat
<div className="grid grid-cols-3 gap-2 sm:gap-3">

// Input / recherche
<input className="w-full rounded border border-[#3c3650] bg-[#0f0e13] px-4 py-2 text-[#f5e6c8] placeholder-[#8b82a6]" />

// Badge / tag
<span className="rounded bg-[#242033] px-2 py-1 text-xs text-[#cfc8e6]">

// Bouton secondaire
<Button variant="secondary" className="w-full md:w-auto">
```

## Atomic Design

Les classes Tailwind sont écrites directement dans les composants. Pas de fichiers CSS séparés.

Responsive : `sm:`, `md:`, `lg:`.

## Composant exemple (Card)

```tsx
export function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded border border-[#3c3650] bg-[#0f0e13] p-4 text-[#cfc8e6]">
      {children}
    </div>
  );
}
```
