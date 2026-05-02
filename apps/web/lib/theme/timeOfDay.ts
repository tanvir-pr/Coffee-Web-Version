export type Tod = "morning" | "afternoon" | "night";
export type ColorTheme = "light" | "dark";
export type ThemeSource = "manual" | "time";

export const THEME_STORAGE_KEY = "crema:theme";
export const TZ_COOKIE = "crema-tz";

const MORNING_START = 6 * 60;
const AFTERNOON_START = 12 * 60;
const NIGHT_START = 18 * 60;

export function resolveTimeOfDay(hour: number, minute: number): Tod {
  const mins = hour * 60 + minute;
  if (mins >= NIGHT_START || mins < MORNING_START) return "night";
  if (mins < AFTERNOON_START) return "morning";
  return "afternoon";
}

export function themeForTod(tod: Tod): ColorTheme {
  return tod === "night" ? "dark" : "light";
}

export function greetingFor(tod: Tod | null): string {
  if (tod === "morning") return "Good mornings, freshly poured.";
  if (tod === "afternoon") return "Good afternoon, freshly poured.";
  if (tod === "night") return "Good evening, freshly poured.";
  return "Freshly poured.";
}

export function themeLabel(tod: Tod): string {
  if (tod === "morning") return "Morning Brew";
  if (tod === "afternoon") return "Afternoon Chill";
  return "Night Decaf";
}

export function resolveTheme(input: {
  manual: ColorTheme | null;
  hour: number;
  minute: number;
}): { tod: Tod; theme: ColorTheme; source: ThemeSource } {
  const tod = resolveTimeOfDay(input.hour, input.minute);
  if (input.manual === "light" || input.manual === "dark") {
    return { tod, theme: input.manual, source: "manual" };
  }
  return { tod, theme: themeForTod(tod), source: "time" };
}

const greetingCopy = {
  morning: greetingFor("morning"),
  afternoon: greetingFor("afternoon"),
  night: greetingFor("night"),
};

export const THEME_BOOT_SCRIPT = `(function(){try{var manual=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});var now=new Date();var mins=now.getHours()*60+now.getMinutes();var tod=mins>=${NIGHT_START}||mins<${MORNING_START}?"night":mins<${AFTERNOON_START}?"morning":"afternoon";var theme=manual==="light"||manual==="dark"?manual:(tod==="night"?"dark":"light");var root=document.documentElement;root.dataset.tod=tod;root.dataset.theme=theme;root.dataset.themeSource=manual==="light"||manual==="dark"?"manual":"time";var secure=location.protocol==="https:"?"; Secure":"";document.cookie=${JSON.stringify(`${TZ_COOKIE}=`)}+encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone)+"; Path=/; Max-Age=31536000; SameSite=Lax"+secure;}catch(e){}})();`;

export const GREETING_BOOT_SCRIPT = `(function(){try{var el=document.getElementById("greeting");var tod=document.documentElement.dataset.tod;var copy=${JSON.stringify(greetingCopy)};if(el&&Object.prototype.hasOwnProperty.call(copy,tod)){el.textContent=copy[tod];}}catch(e){}})();`;
