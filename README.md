# EZSale

Sistema de punto de venta multi-tienda: ventas, productos, reportes y equipo.

## Stack

- Next.js 16 (App Router) + React 19
- Supabase (auth + PostgreSQL)
- Tailwind CSS v4 + shadcn/ui
- TypeScript

## Diseño

La fuente de verdad visual está en [`DESIGN.md`](./DESIGN.md): tokens, tipografía,
patrones y antipatrones. No inventar estilos fuera de ese documento.

## Desarrollo

```bash
npm install
cp .env.example .env.local   # si existe; sino crear .env.local
npm run dev
```

Variables mínimas en `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

(y las de service role si el registro por API las necesita).

```bash
npm run build
npm run lint
```

## Estructura relevante

```
app/
  (auth)/     landing y autenticación
  (app)/      panel autenticado (sidebar)
components/
  ui/         primitivas shadcn
  app/        componentes de producto
DESIGN.md     sistema de diseño
```
