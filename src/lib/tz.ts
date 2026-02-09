// src/lib/tz.ts
export const STORE_TZ = "Europe/Lisbon";

// retorna offset (minutos) do timezone para uma data UTC
function tzOffsetMinutes(dateUtc: Date, timeZone: string) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = dtf.formatToParts(dateUtc);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";

  const asLocal = Date.UTC(
    Number(get("year")),
    Number(get("month")) - 1,
    Number(get("day")),
    Number(get("hour")),
    Number(get("minute")),
    Number(get("second"))
  );

  const asUtc = dateUtc.getTime();
  return (asLocal - asUtc) / 60000;
}

// converte "YYYY-MM-DD" + "HH:MM" (em Europe/Lisbon) para Date UTC
export function lisbonLocalToUtc(dateISO: string, hhmm: string): Date {
  const [y, m, d] = dateISO.split("-").map(Number);
  const [hh, mm] = hhmm.split(":").map(Number);

  // chute inicial: interpretar como UTC
  const guess = new Date(Date.UTC(y, m - 1, d, hh, mm, 0));
  const offset = tzOffsetMinutes(guess, STORE_TZ);

  // ajustar: local = utc + offset  => utc = local - offset
  const utc = new Date(guess.getTime() - offset * 60_000);

  // 2ª passagem para DST exato
  const offset2 = tzOffsetMinutes(utc, STORE_TZ);
  return new Date(guess.getTime() - offset2 * 60_000);
}

// cria limites de dia em UTC para uma data local (Lisboa)
export function lisbonDayRangeUtc(dateISO: string) {
  const start = lisbonLocalToUtc(dateISO, "00:00");
  const end = lisbonLocalToUtc(dateISO, "23:59");
  return { start, end };
}

export function addMinutes(d: Date, mins: number) {
  return new Date(d.getTime() + mins * 60_000);
}

export function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && aEnd > bStart;
}
