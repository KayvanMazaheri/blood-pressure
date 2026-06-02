// src/lib/telegram/theme.ts
export function applyTelegramTheme(params: TelegramThemeParams): void {
  const map: [string, string | undefined][] = [
    ['--background', params.bg_color],
    ['--card', params.secondary_bg_color],
    ['--muted', params.secondary_bg_color],
    ['--accent', params.secondary_bg_color],
    ['--popover', params.section_bg_color ?? params.secondary_bg_color],
    ['--foreground', params.text_color],
    ['--card-foreground', params.text_color],
    ['--popover-foreground', params.text_color],
    ['--accent-foreground', params.text_color],
    ['--muted-foreground', params.hint_color],
    ['--primary', params.button_color],
    ['--primary-foreground', params.button_text_color],
    ['--destructive', params.destructive_text_color],
    ['--ring', params.accent_text_color ?? params.button_color],
    ['--border', params.hint_color ? `${params.hint_color}33` : undefined],
    ['--input', params.hint_color ? `${params.hint_color}33` : undefined],
  ]

  let styleEl = document.getElementById('tg-theme') as HTMLStyleElement | null
  if (!styleEl) {
    styleEl = document.createElement('style')
    styleEl.id = 'tg-theme'
    document.head.appendChild(styleEl)
  }

  const vars = map
    .filter((entry): entry is [string, string] => !!entry[1])
    .map(([k, v]) => `${k}: ${v};`)
    .join(' ')

  styleEl.textContent = `:root { ${vars} }`
}
