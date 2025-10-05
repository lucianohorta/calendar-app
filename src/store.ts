import { create } from "zustand";

export type Reminder = {
    id: string;
    text: string;
    color: string;
    city: string;
    dateISO: string;
    time: string;
    weather?: string | null;
};

type State = {
    monthStartISO: string;
    remindersByDate: Record<string, Reminder[]>;
    setMonthStart: (iso: string) => void;
    addReminder: (r: Reminder) => void;
    updateReminder: (r: Reminder) => void;
    deleteReminder: (id: string) => void;
    clearDay: (dateISO: string) => void;
};

const STORAGE_REMINDERS = "calendar-reminders";
const STORAGE_MONTH = "calendar-month-start";

function safeGet(key: string) {
try {
    return localStorage.getItem(key);
} catch {
    return null;
}
}
function safeSet(key: string, value: string) {
try {
    localStorage.setItem(key, value);
} catch {}
}

function loadReminders(): Record<string, Reminder[]> {
const raw = safeGet(STORAGE_REMINDERS);
if (!raw) return {};
try {
    const parsed = JSON.parse(raw) as Record<string, Reminder[]>;
    return parsed ?? {};
} catch {
    return {};
}
}

function saveReminders(data: Record<string, Reminder[]>) {
safeSet(STORAGE_REMINDERS, JSON.stringify(data));
}

function loadMonthStart(): string {
    const raw = safeGet(STORAGE_MONTH);
    if (raw) return raw;
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}

function saveMonthStart(iso: string) {
    safeSet(STORAGE_MONTH, iso);
}

export const useStore = create<State>((set, get) => ({
    monthStartISO: loadMonthStart(),
    remindersByDate: loadReminders(),

    setMonthStart: (iso) => {
        saveMonthStart(iso);
        set({ monthStartISO: iso });
    },

    addReminder: (r) => {
        const { remindersByDate } = get();
        const k = r.dateISO.slice(0, 10);
        const arr = [...(remindersByDate[k] || []), r].sort((a, b) => a.time.localeCompare(b.time));
        const next = { ...remindersByDate, [k]: arr };
        saveReminders(next);
        set({ remindersByDate: next });
    },

    updateReminder: (r) => {
        const { remindersByDate } = get();
        const flat = Object.entries(remindersByDate).flatMap(([d, arr]) =>
        arr.map((x) => ({ ...x, dateKey: d }))
        );
        const idx = flat.findIndex((x) => x.id === r.id);
        if (idx < 0) return;

        const prevDateKey = flat[idx].dateKey as string;
        const map: Record<string, Reminder[]> = { ...remindersByDate };
        map[prevDateKey] = (map[prevDateKey] || []).filter((x) => x.id !== r.id);

        const nk = r.dateISO.slice(0, 10);
        map[nk] = [...(map[nk] || []), r].sort((a, b) => a.time.localeCompare(b.time));

        // limpa chaves vazias
        if (map[prevDateKey]?.length === 0) delete map[prevDateKey];

        saveReminders(map);
        set({ remindersByDate: map });
    },

    deleteReminder: (id) => {
        const { remindersByDate } = get();
        const map: Record<string, Reminder[]> = {};
        for (const [k, arr] of Object.entries(remindersByDate)) {
        const filtered = arr.filter((r) => r.id !== id);
        if (filtered.length) map[k] = filtered;
        }
        saveReminders(map);
        set({ remindersByDate: map });
    },

    clearDay: (dateISO) => {
        const { remindersByDate } = get();
        const k = dateISO.slice(0, 10);
        const { [k]: _, ...rest } = remindersByDate as any;
        saveReminders(rest);
        set({ remindersByDate: rest });
    },
}));
