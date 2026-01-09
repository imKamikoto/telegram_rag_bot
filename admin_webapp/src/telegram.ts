export type TelegramWebApp = {
  initData: string;
  initDataUnsafe?: {
    user?: {
      id: number;
      username?: string;
      first_name?: string;
      last_name?: string;
    };
  };
  ready: () => void;
  expand: () => void;
  themeParams?: Record<string, string>;
  MainButton?: { hide: () => void };
  BackButton?: { hide: () => void };
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
};

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp;
    };
  }
}

export const getTelegram = (): TelegramWebApp | undefined => window.Telegram?.WebApp;

export const getInitData = (): string => {
  const tg = getTelegram();
  return tg?.initData || "";
};

export const syncTelegramChrome = (): void => {
  const tg = getTelegram();
  if (!tg) return;

  tg.ready();
  tg.expand();
  tg.MainButton?.hide();
  tg.BackButton?.hide();

  const background = tg.themeParams?.bg_color ?? "#0f172a";
  tg.setBackgroundColor?.(background);
  tg.setHeaderColor?.(background);
};
