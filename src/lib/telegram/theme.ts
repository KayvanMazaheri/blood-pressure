// src/lib/telegram/theme.ts
export function applyChrome(tg: TelegramWebApp): void {
  tg.setHeaderColor('secondary_bg_color')
  tg.setBackgroundColor('bg_color')
  tg.setBottomBarColor('bottom_bar_bg_color')
  // Remove the web shell's hardcoded dark class; Telegram theme drives color scheme
  document.documentElement.classList.remove('dark')
  document.documentElement.dataset.colorScheme = tg.colorScheme
}
