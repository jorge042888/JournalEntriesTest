// Festivos colombianos según Ley 51 de 1983 (sistema de puentes)
// Incluye cálculo de Semana Santa basado en el algoritmo de Meeus/Jones/Butcher

function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 1-based
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// Traslada al lunes siguiente si no cae en lunes (Ley 51/1983)
function toNextMonday(date: Date): Date {
  const d = new Date(date);
  const dow = d.getDay(); // 0=Dom, 1=Lun, ...
  if (dow === 1) return d;
  const skip = dow === 0 ? 1 : 8 - dow;
  d.setDate(d.getDate() + skip);
  return d;
}

export function toYYYYMMDD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function getColombianHolidays(year: number): Set<string> {
  const h = new Set<string>();

  // Festivos de fecha fija
  for (const [mo, da] of [
    [1, 1],   // Año Nuevo
    [5, 1],   // Día del Trabajo
    [7, 20],  // Día de la Independencia
    [8, 7],   // Batalla de Boyacá
    [12, 8],  // Inmaculada Concepción
    [12, 25], // Navidad
  ] as [number, number][]) {
    h.add(toYYYYMMDD(new Date(year, mo - 1, da)));
  }

  // Festivos de puente (se trasladan al lunes siguiente)
  for (const [mo, da] of [
    [1, 6],   // Reyes Magos
    [3, 19],  // San José
    [6, 29],  // San Pedro y San Pablo
    [8, 15],  // Asunción de la Virgen
    [10, 12], // Día de la Raza
    [11, 1],  // Todos los Santos
    [11, 11], // Independencia de Cartagena
  ] as [number, number][]) {
    h.add(toYYYYMMDD(toNextMonday(new Date(year, mo - 1, da))));
  }

  // Festivos basados en Semana Santa
  const easter = easterSunday(year);
  h.add(toYYYYMMDD(addDays(easter, -3))); // Jueves Santo
  h.add(toYYYYMMDD(addDays(easter, -2))); // Viernes Santo
  h.add(toYYYYMMDD(toNextMonday(addDays(easter, 39))));  // Ascensión del Señor
  h.add(toYYYYMMDD(toNextMonday(addDays(easter, 60))));  // Corpus Christi
  h.add(toYYYYMMDD(toNextMonday(addDays(easter, 68))));  // Sagrado Corazón

  return h;
}

// Cache por año para evitar recalcular
const _cache = new Map<number, Set<string>>();

export function isSundayOrHoliday(dateStr: string): boolean {
  if (!dateStr || dateStr.length < 10) return false;
  const ymd = dateStr.slice(0, 10);
  // Usar mediodía para evitar problemas de DST
  const date = new Date(ymd + "T12:00:00");
  if (isNaN(date.getTime())) return false;
  if (date.getDay() === 0) return true; // Domingo
  const year = date.getFullYear();
  if (!_cache.has(year)) _cache.set(year, getColombianHolidays(year));
  return _cache.get(year)!.has(ymd);
}

export function getDayLabel(dateStr: string): string {
  if (!dateStr || dateStr.length < 10) return "";
  const ymd = dateStr.slice(0, 10);
  const date = new Date(ymd + "T12:00:00");
  if (date.getDay() === 0) return "Domingo";
  const year = date.getFullYear();
  if (!_cache.has(year)) _cache.set(year, getColombianHolidays(year));
  if (_cache.get(year)!.has(ymd)) return "Festivo";
  return "";
}
