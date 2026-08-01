# Sistema de diseño de EZSale

Este documento es la fuente de verdad del diseño de EZSale. Si algo en el código
contradice lo que está acá, el código está mal.

EZSale es un sistema de punto de venta multi-tienda. La gente que lo usa mira
números todo el día y necesita cargar una venta rápido. El diseño tiene que
servir a eso, no a la primera impresión.

- **Contexto principal**: escritorio y notebook. Responsive real hacia abajo,
  con el flujo de venta usable en tablet.
- **Idioma**: español (es-AR). Moneda ARS.
- **Stack**: Next.js 16 (App Router), React 19, Tailwind CSS v4 sin archivo de
  configuración, shadcn/ui sobre Radix, lucide-react, recharts, sonner.

---

## 1. Principios

### 1.1 Neutro primero, el color se gana su lugar

La interfaz es gris cálido. El acento arcilla aparece únicamente en tres
lugares: la acción primaria de la pantalla, el ítem activo de la navegación y el
anillo de foco.

- **Hacé**: importes y cifras en `text-foreground`, etiquetas en
  `text-muted-foreground`.
- **No hagas**: pintar cada importe de color de marca, ni tener dos botones
  primarios en la misma pantalla.

Un tablero donde todo es color no tiene jerarquía. Si el total del día está en
arcilla y el total de la semana también y el botón también, ninguno resalta.

### 1.2 Bordes en vez de sombras

Las superficies se separan con un borde de 1px y un cambio de tono, no con
sombra. Solo los elementos que flotan de verdad sobre la página proyectan
sombra: dropdown, popover, tooltip, dialog, sheet.

- **Hacé**: `bg-card border border-border rounded-md`.
- **No hagas**: `shadow-xl` en tarjetas.

### 1.3 Jerarquía por tipografía y espacio, no por cajas

Una sección se distingue por su título y por el aire que la rodea. No hace falta
envolverla en una tarjeta. Nunca tres niveles de caja anidada.

- **Hacé**: título de sección + contenido directo, 32px entre secciones.
- **No hagas**: tarjeta que contiene una tarjeta que contiene una lista de
  tarjetas.

### 1.4 Los números son el producto

Toda cifra que se compara verticalmente usa figuras tabulares. Los importes van
en la fuente mono. En tablas, los números se alinean a la derecha y las palabras
a la izquierda.

- **Hacé**: `<Money value={total} />`, que ya resuelve fuente, tabulares y
  formato ARS.
- **No hagas**: interpolar `toLocaleString` a mano en cada vista.

### 1.5 Densidad deliberada

El alto de control por defecto es 36px. Una tabla de productos muestra veinte
filas sin scroll en una notebook. La generosidad de espacio va entre secciones,
no dentro de cada control.

- **Hacé**: `h-9` en botones e inputs, `py-2` en celdas de tabla.
- **No hagas**: `py-4` en todos los inputs porque "respira mejor".

### 1.6 Movimiento discreto

Las transiciones son de color, opacidad y posición de overlays. Los controles no
cambian de tamaño al presionarlos.

- **Hacé**: `transition-colors duration-100`.
- **No hagas**: `active:scale-95`, `hover:scale-110`.

### 1.7 Cero decoración

Sin degradados, sin blur decorativo, sin glassmorphism, sin emojis como iconos,
sin formas de fondo. Si un elemento no comunica información o no es accionable,
no va.

---

## 2. Tokens

Tres capas. Los componentes solo consumen la capa 2 y 3; nunca la capa 1.

```
primitivos (arcilla-600, neutro-100)
   ↓
semánticos (--primary, --background, --border)
   ↓
de componente (--control-h, --sidebar-w)
```

### 2.1 Capa 1: primitivos

Se declaran en `app/globals.css` y no se usan directamente en el markup.

**Arcilla** — el acento de marca. Un rojo anaranjado terroso, heredado de la
identidad original de EZSale pero más profundo y menos saturado.

| Token | Hex | Uso |
| --- | --- | --- |
| `--clay-50` | `#FDF4F1` | fondos de estado seleccionado |
| `--clay-100` | `#FBE6E0` | fondos de badge |
| `--clay-200` | `#F6CCC0` | bordes de estado activo |
| `--clay-300` | `#EDA893` | — |
| `--clay-400` | `#DF7C61` | acento en modo oscuro |
| `--clay-500` | `#CE5A3D` | series de gráficos, hover en oscuro |
| `--clay-600` | `#B4462F` | **acento base en modo claro** |
| `--clay-700` | `#953826` | hover del primario en claro |
| `--clay-800` | `#7A3022` | presionado |
| `--clay-900` | `#662B21` | texto sobre fondos claros de arcilla |
| `--clay-950` | `#38130D` | texto sobre el primario en oscuro |

**Neutro** — gris cálido. Levemente más cálido que el gris puro para que
convive con la arcilla, pero sin llegar al beige.

| Token | Hex | | Token | Hex |
| --- | --- | --- | --- | --- |
| `--neutral-0` | `#FFFFFF` | | `--neutral-400` | `#A8A39C` |
| `--neutral-25` | `#FCFCFB` | | `--neutral-500` | `#837E77` |
| `--neutral-50` | `#F7F6F4` | | `--neutral-600` | `#67625C` |
| `--neutral-100` | `#EFEDEA` | | `--neutral-700` | `#4E4A45` |
| `--neutral-200` | `#E2DFDA` | | `--neutral-800` | `#34312D` |
| `--neutral-300` | `#CBC7C1` | | `--neutral-900` | `#21201D` |
| | | | `--neutral-950` | `#171614` |

**Estados** — no se derivan de la arcilla. Cada uno tiene versión clara,
oscura y sutil (para fondos de badge).

| Estado | Claro | Oscuro | Sutil claro | Sutil oscuro |
| --- | --- | --- | --- | --- |
| Éxito | `#1A7F4B` | `#34C77B` | `#E7F4EC` | `#12271C` |
| Atención | `#A96500` | `#E3A008` | `#FBF0DF` | `#2A2011` |
| Destructivo | `#C0202F` | `#D93843` | `#FBEAEC` | `#2B1417` |
| Información | `#1F5FA8` | `#6BA6E8` | `#EAF1FA` | `#141F2C` |

**Series de gráficos** — apagadas y armónicas. Sin neón, sin arcoíris.

| Token | Claro | Oscuro |
| --- | --- | --- |
| `--chart-1` | `#CE5A3D` arcilla | `#E08A6E` |
| `--chart-2` | `#2F6F5B` verde | `#4F9B82` |
| `--chart-3` | `#C08A2E` ocre | `#D6A64A` |
| `--chart-4` | `#5A6B8C` azul pizarra | `#8298BE` |
| `--chart-5` | `#8A5A7A` ciruela | `#B283A0` |

#### Tensión conocida: arcilla contra destructivo

El acento es un rojo anaranjado y el destructivo es un rojo frío. Están cerca en
el círculo cromático y a cierta distancia se pueden confundir. Esto es una
consecuencia aceptada de mantener la arcilla como color de marca. Las reglas que
lo compensan son obligatorias:

1. Un botón destructivo **nunca** comparte fila con un botón primario relleno.
   En una confirmación de borrado, la acción de cancelar es `variant="ghost"` o
   `variant="outline"`, jamás primaria.
2. Toda acción destructiva lleva icono (`Trash2`) o texto explícito ("Eliminar
   producto"). El color nunca es el único indicador.
3. El borrado siempre pasa por `ConfirmDialog`. No hay borrado de un solo clic.

### 2.2 Capa 2: semánticos

Respetan el contrato de shadcn/ui, más lo que este producto necesita. Se definen
en `:root` y se redefinen en `.dark`.

| Token | Claro | Oscuro | Qué es |
| --- | --- | --- | --- |
| `--background` | `neutral-50` | `neutral-950` | fondo de la página |
| `--foreground` | `neutral-900` | `neutral-100` | texto principal |
| `--card` | `neutral-0` | `#1D1C1A` | superficie elevada |
| `--card-foreground` | `neutral-900` | `neutral-100` | |
| `--popover` | `neutral-0` | `#232220` | overlays flotantes |
| `--surface-sunken` | `neutral-100` | `#131211` | fondo de input, celda de encabezado |
| `--primary` | `clay-600` | `clay-400` | acción primaria, ítem activo |
| `--primary-foreground` | `neutral-0` | `clay-950` | |
| `--secondary` | `neutral-100` | `#2A2825` | botón secundario |
| `--secondary-foreground` | `neutral-800` | `neutral-100` | |
| `--muted` | `neutral-100` | `#26241F` | fondo apagado |
| `--muted-foreground` | `neutral-600` | `neutral-400` | texto de apoyo |
| `--accent` | `neutral-100` | `#2A2825` | hover de ítems de lista y menú |
| `--accent-foreground` | `neutral-900` | `neutral-100` | |
| `--destructive` | `#C0202F` | `#D93843` | |
| `--border` | `neutral-200` | `#302E2A` | separadores y bordes de card |
| `--input` | `neutral-500` | `neutral-600` | borde de controles de formulario |
| `--ring` | `clay-600` | `clay-400` | anillo de foco |
| `--sidebar` | `neutral-100` | `#131211` | |
| `--sidebar-foreground` | `neutral-700` | `neutral-400` | |
| `--sidebar-border` | `neutral-200` | `#282622` | |
| `--sidebar-accent` | `neutral-200` | `#232220` | hover de ítem de nav |

Nota sobre `--input`: es más oscuro que en la mayoría de los sistemas a
propósito. Un borde de `neutral-200` sobre blanco da 1.2:1 y no cumple el 3:1
que exige WCAG 1.4.11 para el límite de un control. `neutral-500` da 3.9:1.

Los tres niveles de superficie en modo claro son `sidebar #EFEDEA` →
`background #F7F6F4` → `card #FFFFFF`. En oscuro se invierte la lógica: el
sidebar es el más oscuro y la card la más clara.

### 2.3 Capa 3: de componente

| Token | Valor | Uso |
| --- | --- | --- |
| `--control-h-sm` | `30px` | botones e inputs compactos, filtros |
| `--control-h` | `36px` | **por defecto** |
| `--control-h-lg` | `44px` | acción primaria del POS, objetivos táctiles |
| `--sidebar-w` | `248px` | sidebar expandido |
| `--sidebar-w-collapsed` | `56px` | sidebar colapsado |
| `--header-h` | `56px` | encabezado de página |
| `--content-max` | `1200px` | ancho máximo de contenido |

---

## 3. Tipografía

Tres familias, cada una con un trabajo.

| Rol | Familia | Variable | Cuándo |
| --- | --- | --- | --- |
| Display | Bricolage Grotesque | `--font-display` | `h1`–`h3`, cifras grandes de métricas |
| UI | Geist Sans | `--font-sans` | todo el resto |
| Numérico | Geist Mono | `--font-mono` | importes, cantidades, columnas numéricas |

Bricolage Grotesque es variable y tiene detalles idiosincráticos que hacen que un
título no parezca salido de una plantilla. Se usa con `tracking` negativo en
tamaños grandes.

### 3.1 Escala

La base de UI es 14px, no 16px. Es un sistema de gestión, no un blog.

| Clase | Tamaño / línea | Tracking | Peso | Familia |
| --- | --- | --- | --- | --- |
| `text-display-lg` | 40 / 44 | -0.015em | 700 | display |
| `text-display` | 32 / 36 | -0.015em | 700 | display |
| `text-h1` | 24 / 30 | -0.01em | 600 | display |
| `text-h2` | 19 / 26 | -0.005em | 600 | display |
| `text-h3` | 16 / 22 | 0 | 600 | sans |
| `text-body` | 14 / 21 | 0 | 400 | sans |
| `text-body-sm` | 13 / 18 | 0 | 400 | sans |
| `text-label` | 13 / 16 | 0 | 500 | sans |
| `text-caption` | 12 / 16 | 0 | 400 | sans |
| `text-overline` | 11 / 14 | 0.06em | 600 | sans |

### 3.2 Mayúsculas

`text-overline` (mayúsculas con tracking abierto) se permite **únicamente** en
encabezados de columna de tabla. En ningún otro lugar.

Hoy el patrón `text-xs uppercase tracking-[0.2em]` aparece como decoración en
casi todas las vistas. Es una de las señales más fuertes de interfaz generada:
se usa para dar aire de "diseño" a un texto que no lo necesita. Se elimina.

### 3.3 Números

- Todo importe pasa por `<Money>`.
- Cualquier columna de números lleva `tabular-nums`.
- El formato es `es-AR` con símbolo `$`, sin decimales cuando son cero.
- Las cifras de métrica van en display 32px con `tabular-nums`, no en mono: a ese
  tamaño la mono se ve técnica de más. La mono es para tablas y detalles de
  venta.

### 3.4 Wordmark de marca

La marca tipográfica vive en `components/app/brand-mark.tsx`.

- Completo: **EZ** en `text-primary` + **Sale** en `text-foreground`, Bricolage
  bold, tracking −0.045em.
- Compacto (sidebar colapsado): **Ez** en primary.
- Sin badge, sin ícono, sin cuadrado de color. Si el nombre cambia, se toca un
  solo archivo.

---

## 4. Espacio y layout

Base de 4px. Escala permitida: `4 8 12 16 20 24 32 40 48 64`. No hay valores
arbitrarios.

| Contexto | Valor |
| --- | --- |
| Padding de página | 24px |
| Entre secciones | 32px |
| Padding de card | 20px |
| Entre label y control | 6px |
| Entre campos de formulario | 16px |
| Gap de grilla de métricas | 16px |
| Padding vertical de celda | 8px (denso) / 12px (normal) |

### 4.1 Estructura de la aplicación

```
┌──────────┬─────────────────────────────────────────┐
│ Sidebar  │ PageHeader (56px, sticky)               │
│ 248px    ├─────────────────────────────────────────┤
│          │                                         │
│ tienda   │ contenido, max 1200px, padding 24px     │
│ nav      │                                         │
│ ─────    │                                         │
│ usuario  │                                         │
└──────────┴─────────────────────────────────────────┘
```

- El sidebar es fijo, colapsable a 56px, y su estado se persiste en `localStorage`.
- Por debajo de `lg` el sidebar se convierte en un `Sheet` que abre desde un
  botón en el encabezado.
- `/new-sale` es la excepción: usa todo el ancho disponible sin el límite de
  1200px, porque la grilla de productos y el carrito necesitan el espacio.
- No hay footer en las pantallas de la aplicación. El footer es solo de la
  landing pública.

---

## 5. Radios, elevación y bordes

### 5.1 Radios

| Token | Valor | Uso |
| --- | --- | --- |
| `rounded-sm` | 4px | badge, checkbox, indicadores |
| `rounded-md` | 6px | **botón, input, select** |
| `rounded-lg` | 8px | card, dropdown, popover |
| `rounded-xl` | 12px | dialog, sheet |
| `rounded-full` | — | solo avatares y puntos de estado |

`rounded-2xl` y superiores no se usan. `rounded-4xl` (32px) queda prohibido: un
radio así grande en una tarjeta de datos hace que la interfaz parezca un juguete
y desperdicia las esquinas.

### 5.2 Elevación

Dos sombras en todo el sistema.

| Token | Uso |
| --- | --- |
| `shadow-overlay-sm` | dropdown, popover, tooltip |
| `shadow-overlay` | dialog, sheet |

Las tarjetas, tablas y paneles no llevan sombra. Nunca.

### 5.3 Bordes

- 1px, `border-border`, siempre.
- Los separadores dentro de una card usan `border-border` también, no un tono
  más claro inventado.
- Los controles de formulario usan `border-input`.

---

## 6. Movimiento

| Token | Duración | Easing | Uso |
| --- | --- | --- | --- |
| micro | 100ms | `ease-out` | hover, foco, cambios de color |
| enter | 160ms | `cubic-bezier(0.2, 0, 0, 1)` | aparición de contenido |
| overlay | 200ms | `cubic-bezier(0.2, 0, 0, 1)` | dialog, sheet, dropdown |

Reglas:

- Los controles no escalan al presionarse.
- Nada anima al cargar la página excepto los skeletons.
- Todo se envuelve en `@media (prefers-reduced-motion: reduce)` para reducirse a
  cambios instantáneos.

---

## 7. Iconografía

- `lucide-react`, exclusivamente. Se elimina la fuente Material Symbols cargada
  por CDN.
- Tamaños: 16px (dentro de texto y botones pequeños), 18px (botones por defecto,
  ítems de nav), 20px (encabezados de sección, estados vacíos).
- `strokeWidth={1.75}`.
- Un icono nunca es más grande que el bloque de texto que acompaña. No hay
  iconos de 32px o 48px como decoración.
- Todo botón de solo icono lleva `aria-label` y, en escritorio, un `Tooltip`.

Vocabulario fijo, para que el mismo concepto tenga siempre el mismo icono:

| Concepto | Icono |
| --- | --- |
| Nueva venta | `Plus` |
| Panel | `LayoutDashboard` |
| Productos | `Package` |
| Reportes | `ChartColumn` |
| Equipo | `Users` |
| Categoría | `Tag` |
| Medio de pago | `CreditCard` |
| Editar | `Pencil` |
| Eliminar | `Trash2` |
| Buscar | `Search` |
| Filtrar | `SlidersHorizontal` |
| Ocultar importes | `Eye` / `EyeOff` |
| Cerrar sesión | `LogOut` |

---

## 8. Accesibilidad

Es requisito, no mejora futura.

- Texto: 4.5:1 mínimo. Texto grande (≥ 19px semibold): 3:1.
- Límites de controles y elementos gráficos portadores de información: 3:1.
- Foco: `outline-none` está prohibido sin reemplazo. El patrón es
  `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`.
- Objetivos: 32px mínimo en escritorio, 44px en superficies táctiles
  (`/new-sale`).
- Overlays siempre vía Radix: trampa de foco, `Escape`, restauración de foco y
  `aria` correctos vienen resueltos.
- Todo input tiene un `<Label>` asociado por `htmlFor`. Placeholder no es label.
- Los errores de formulario se anuncian con `role="alert"` y se vinculan al
  control con `aria-describedby` + `aria-invalid`.
- El color nunca es el único portador de información: los estados llevan icono o
  texto.

---

## 9. Patrones

### 9.1 Formularios

Anatomía: `Label` → control → texto de ayuda o error.

- Un formulario en un dialog usa una columna. Los formularios de página pueden
  usar dos columnas a partir de `md`.
- El botón de envío va a la derecha, abajo. Muestra estado de carga
  deshabilitándose y cambiando el texto ("Guardando…").
- Los errores de campo van debajo del control, en `text-destructive`
  `text-body-sm`.
- Los errores de servidor van en un `Alert` destructivo arriba del formulario.
- `FormField` encapsula label, control, ayuda, error y el cableado de `aria`.

### 9.2 Tablas de datos

Las listas de registros son tablas, no grillas de tarjetas. Una tabla permite
comparar valores en vertical; una grilla de tarjetas, no.

- Encabezado con `text-overline`, fondo `surface-sunken`, sticky cuando la tabla
  scrollea.
- Texto a la izquierda, números y fechas a la derecha, acciones en la última
  columna alineadas a la derecha con ancho fijo.
- Fila: `h-11` con padding vertical de 8px. Hover `bg-muted/50`.
- Las acciones de fila viven en un `DropdownMenu` con botón `MoreHorizontal`, no
  como tres botones sueltos por fila.
- El orden por columna se maneja con un botón en el encabezado y una flecha de
  dirección.

### 9.3 Estados vacíos

`EmptyState` con icono de 20px en un contenedor de `surface-sunken`, título en
`text-h3`, una línea de explicación en `text-muted-foreground` y, cuando
corresponde, una única acción primaria. Nunca una ilustración.

### 9.4 Estados de carga

`Skeleton` con la forma del contenido real: bloques del ancho y alto que va a
ocupar el dato. No spinners centrados en la página. Los botones sí muestran un
`Loader2` girando cuando la acción está en curso.

### 9.5 Feedback

- Éxito de una acción: `toast.success` con sonner. Arriba a la derecha, 4s.
- Error de una acción: `toast.error`, sin cierre automático.
- Errores de validación: inline, nunca en toast.
- Nada de mensajes de éxito que quedan pegados en la página para siempre.

### 9.6 Confirmaciones destructivas

`ConfirmDialog` con el nombre del registro en el cuerpo, botón destructivo con
`Trash2` a la derecha, cancelar en `ghost` a su izquierda. La tecla `Escape`
cancela.

### 9.7 Filtros

Fila de controles compactos (`--control-h-sm`) arriba de la tabla: búsqueda a la
izquierda con icono `Search`, selects a su derecha, contador de resultados al
final. Los filtros activos se pueden limpiar con un botón "Limpiar".

---

## 10. Antipatrones prohibidos

Cada uno de estos existe hoy en el código y debe desaparecer. Sirve como lista de
verificación de la migración.

| Antipatrón | Dónde está hoy |
| --- | --- |
| Hero con degradado y orbe difuminado (`bg-linear-to-br`, `blur-3xl`) | `app/components/dashboard-view.tsx` |
| Degradado como fondo de botón (`bg-gradient-to-br`, `.pill-gradient`) | `login-form.tsx`, `register-form.tsx`, `globals.css` |
| `rounded-4xl` en tarjetas y paneles | 6 archivos de vista |
| `shadow-xl` en tarjetas de contenido | `dashboard-view.tsx`, `products-view.tsx`, `team-view.tsx` |
| `uppercase tracking-[0.2em]` / `tracking-widest` como decoración | todas las vistas |
| `active:scale-95`, `hover:scale-110` | todos los botones y el FAB |
| Fuente de iconos por CDN (`material-symbols-outlined`) | `layout.tsx` y todas las vistas |
| Enmascarado de importes con la cadena `"********"` | `dashboard-view.tsx`, `reports-view.tsx` |
| Modales `fixed inset-0` hechos a mano | `products-view.tsx`, `team-view.tsx`, `reports-view.tsx` |
| `TopAppBar` importado dentro de cada vista en vez de un layout | las 5 vistas de la app |
| Footer del sitio en las pantallas de la aplicación | `layout.tsx` |
| FAB flotante en escritorio | `dashboard-view.tsx`, `products-view.tsx` |
| Utilidades `stone-*` crudas mezcladas con tokens | `top-app-bar.tsx` y otras |
| Listas de registros como grillas de tarjetas | `products-view.tsx`, `team-view.tsx` |
| Gráfico de barras con alturas en píxeles calculadas a mano | `dashboard-view.tsx` |

Sobre el enmascarado con asteriscos: la intención (poder ocultar los montos si
hay un cliente mirando la pantalla) es buena, la ejecución no. El reemplazo es un
toggle de privacidad que muestra `$ ********` en lugar del valor real,
mantiene el layout estable y anuncia el cambio de estado con
`aria-pressed`.

---

## 11. Especificación por pantalla

### `/` — Landing pública

Grupo de rutas `(marketing)`. Página de marketing full-bleed (sin el límite de
1200px de la app). Secciones en este orden: nav sticky, hero con video + mockup
de notebook, barra de prueba, features (3 bloques), cards crema, sección de
celular, testimonios, precios (4 planes + tabla de comparación), FAQ, CTA final
y footer. Usa la capa de marketing (§13). CTAs primarios: "Crear mi tienda" →
`/registro`; "Iniciar sesión" → `/login`.

### `/login`

Layout `(auth)`: pantalla centrada, card de 420px de ancho, marca arriba,
formulario de acceso, enlace a registro. Sin sidebar, sin footer.

### `/registro`, `/registro/completar`, `/auth/cambiar-password`

Layout `(auth)`: pantalla centrada, card de 420px de ancho, marca arriba, título,
formulario, enlace de vuelta. Sin sidebar, sin footer.

### `/dashboard`

1. `PageHeader` con "Panel", el nombre de la tienda como descripción, el toggle
   de privacidad y el botón primario "Nueva venta".
2. Fila de cuatro `MetricTile`: total de hoy, ventas de hoy, ticket promedio,
   total de la semana. Cada una con la cifra en display y la comparación contra
   el período anterior.
3. Dos columnas a partir de `lg`: gráfico de la semana (recharts, `--chart-1`) a
   la izquierda ocupando dos tercios, top de productos a la derecha.
4. Tabla de las ventas de hoy, con el detalle de líneas expandible por fila.

### `/new-sale`

Dos paneles. A la izquierda, filtro de categorías, buscador con foco automático y
grilla de productos con botones de 44px de alto. A la derecha, un panel de
carrito fijo de 360px con las líneas, el total en display, la selección de medio
de pago y el botón de confirmación de 44px. En mobile el carrito pasa a ser una
barra inferior fija que abre un `Sheet`.

### `/products`

`PageHeader` con "Productos" y el botón "Nuevo producto". `Tabs` para productos y
categorías. Fila de filtros. Tabla con nombre, categoría, precio a la derecha y
menú de acciones. Los formularios de creación y edición van en `Dialog`.

### `/reports`

`PageHeader` con "Reportes" y el rango de fechas. Fila de métricas del período.
Desglose por medio de pago como barras horizontales con porcentaje. Tabla de
ventas del período con detalle expandible y edición en `Dialog`.

### `/team`

`PageHeader` con "Equipo" y "Invitar". Tabla con nombre, correo, rol como
`StatusBadge` y menú de acciones. Invitación, edición y cambio de contraseña en
`Dialog`.

---

## 12. Organización del código

```
components/
  ui/       primitivas de shadcn, sin lógica de negocio
  app/      componentes compartidos del producto
  marketing/  componentes exclusivos de la landing
app/
  (marketing)/  landing pública
  (auth)/       autenticación (login, registro, password)
  (app)/        pantallas autenticadas, con AppShell
    <ruta>/_components/   componentes de esa pantalla
lib/
  utils.ts  helper cn()
  format.ts formateo de moneda, fecha y hora
```

Reglas:

- Una vista de más de 300 líneas se parte en `_components/`.
- Nada de valores de color literales en el markup. Solo tokens semánticos.
- `cn()` para todo class merge condicional.
- Los componentes de `components/ui` no importan nada de `components/app`.
- Los tokens y utilidades de marketing (§13) no se usan fuera de
  `app/(marketing)/` y `components/marketing/`.

---

## 13. Superficie de marketing

La landing pública necesita recursos visuales que la aplicación de gestión no
debe tener. Esta sección abre excepciones **exclusivas** para
`app/(marketing)/` y `components/marketing/`. Fuera de esos directorios, §1.7 y
§10 siguen vigentes sin cambios.

### 13.1 Permitido solo en marketing

- Degradados y radiales de marca como fondo de sección (`bg-hero-radial`,
  `bg-clay-field`, radial sobre blanco en precios).
- Video de fondo con overlay y blur (hero).
- Sombras en tarjetas de feature/pricing y en marcos de dispositivo.
- Radios grandes (`rounded-[2.5rem]` y similares) únicamente en marcos de
  notebook y celular.
- Escala tipográfica de display más grande que 40px (`text-hero`,
  `text-section-title`).
- Animación de entrada al scroll (vía `motion`), respetando
  `prefers-reduced-motion`.
- Superficie crema (`--surface-cream`) para bandas y cards de contenido.
- Espaciado entre secciones de 96px / 128px.

### 13.2 Sigue prohibido incluso en la landing

- Emojis como iconos.
- Iconos decorativos de 32px o más sin texto asociado.
- `uppercase tracking-widest` / `tracking-[0.2em]` como decoración.
- `active:scale-95`, `hover:scale-110` en controles.
- Colores literales (hex) en el markup; solo tokens semánticos / de marketing.
- Más de un botón primario relleno por sección.
- Glassmorphism genérico fuera del nav sticky (backdrop-blur del nav sí).

### 13.3 Tokens de marketing

| Token / utilidad | Uso |
| --- | --- |
| `--surface-cream` | Fondo de bandas y cards crema |
| `--control-h-xl` / `size="xl"` | CTAs de la landing (48px) |
| `text-hero` | Título del hero |
| `text-section-title` | Títulos de sección |
| `bg-hero-radial` | Radial arcilla sobre fondo oscuro |
| `bg-clay-field` | Campo saturado de la sección celular |

Estos tokens están prohibidos en `app/(app)/` y en componentes de `components/app`.
