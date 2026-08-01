# Plantillas de email (Supabase Auth)

HTML on-brand para pegar en el dashboard de Supabase. Usan los tokens de
`DESIGN.md`: fondo neutro cálido, card con borde (sin sombra), wordmark
**EZ**Sale y CTA en arcilla `#B4462F`.

## Dónde pegarlas

1. Abrí [Supabase Dashboard](https://supabase.com/dashboard) → tu proyecto
2. **Authentication** → **Email** → **Templates**
3. Para cada plantilla:
   - Pegá el **Subject** de abajo
   - Pegá el contenido del `.html` correspondiente en el body (Body / Message)

| Plantilla en Supabase | Archivo | Subject sugerido |
| --- | --- | --- |
| Confirm signup | `confirm-signup.html` | `Confirmá tu cuenta en EZSale` |
| Reset password | `reset-password.html` | `Restablecé tu contraseña — EZSale` |

## Variables de Supabase

No las reemplaces a mano. Supabase las completa al enviar:

- `{{ .ConfirmationURL }}` — enlace del botón / fallback
- `{{ .SiteURL }}` — Site URL del proyecto (configurala en Auth → URL Configuration)

## Tip

Si en local los mails siguen apuntando a `localhost`, revisá **Site URL** y
**Redirect URLs** en Authentication → URL Configuration.
