type GeoHit = { name: string; latitude: number; longitude: number };
type GeoResp = { results?: GeoHit[] };

type ForecastResp = {
    hourly?: { time: string[]; weathercode: number[] };
};

async function geocode(city: string): Promise<GeoHit | null> {
const r = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
    city
    )}&count=1&language=en&format=json`
);
const j = (await r.json()) as GeoResp;
return j.results?.[0] ?? null;
}

function wmoToText(code: number): string {
    if ([0].includes(code)) return "Clear";
    if ([1, 2, 3].includes(code)) return "Clouds";
    if ([45, 48].includes(code)) return "Fog";
    if ([51, 53, 55, 56, 57].includes(code)) return "Drizzle";
    if ([61, 63, 65, 66, 67].includes(code)) return "Rain";
    if ([71, 73, 75, 77].includes(code)) return "Snow";
    if ([80, 81, 82].includes(code)) return "Rain showers";
    if ([85, 86].includes(code)) return "Snow showers";
    if ([95, 96, 99].includes(code)) return "Thunderstorm";
    return "Unknown";
}

function roundToNearestHour(hhmm: string): string {
    const [hStr, mStr] = hhmm.split(":");
    let h = parseInt(hStr, 10);
    const m = parseInt(mStr || "0", 10);
    if (m >= 30) h = (h + 1) % 24;
    return String(h).padStart(2, "0") + ":00";
}

export async function getWeatherSummary(city: string, dateISO: string, time: string) {
    try {
        const geo = await geocode(city);
        if (!geo) return null;

        const day = dateISO.slice(0, 10);
        const hh = roundToNearestHour(time);
        const targetKey = `${day}T${hh}`;

        const url =
        `https://api.open-meteo.com/v1/forecast` +
        `?latitude=${geo.latitude}&longitude=${geo.longitude}` +
        `&hourly=weathercode` +
        `&timezone=auto` +
        `&start_date=${day}&end_date=${day}`;

        const r = await fetch(url);
        const j = (await r.json()) as ForecastResp;

        const times = j.hourly?.time ?? [];
        const codes = j.hourly?.weathercode ?? [];
        const idx = times.indexOf(targetKey);

        if (idx >= 0 && codes[idx] != null) return wmoToText(codes[idx]);

        if (times.length && codes.length) {
        let best = 0;
        let bestDiff = Infinity;
        const target = new Date(`${day}T${hh}:00`);
        times.forEach((t, i) => {
            const diff = Math.abs(+new Date(t) - +target);
            if (diff < bestDiff) {
            bestDiff = diff;
            best = i;
            }
        });
        return wmoToText(codes[best]);
        }

        return null;
    } catch {
        return null;
    }
}
