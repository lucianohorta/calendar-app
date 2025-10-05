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

/** Safely read from localStorage */
function safeGet(key: string) {
    try {
        return localStorage.getItem(key);
    } catch {
        return null;
    }
}

/** Safely write to localStorage */
function safeSet(key: string, value: string) {
    try {
        localStorage.setItem(key, value);
    } catch {}
}

/** Load reminders map (YYYY-MM-DD → Reminder[]) from storage. */
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

/** Persist the full reminders map to storage. */
function saveReminders(data: Record<string, Reminder[]>) {
    safeSet(STORAGE_REMINDERS, JSON.stringify(data));
}

/** Load the current month start (ISO). Defaults to the first day of today’s month. */
function loadMonthStart(): string {
    const raw = safeGet(STORAGE_MONTH);
    if (raw) return raw;
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}

/** Persist the month start ISO to storage. */
function saveMonthStart(iso: string) {
    safeSet(STORAGE_MONTH, iso);
}

/**
 * Global store (Zustand)
 * - Holds current month view and reminders grouped by date.
 * - All mutations persist to localStorage.
 */
export const useStore = create<State>((set, get) => ({
    monthStartISO: loadMonthStart(),
    remindersByDate: loadReminders(),

    /** Change current month start and persist it. */
    setMonthStart: (iso) => {
        saveMonthStart(iso);
        set({ monthStartISO: iso });
    },

    /** Add a reminder, keep the day list time-ordered, and persist. */
    addReminder: (r) => {
        const { remindersByDate } = get();
        const k = r.dateISO.slice(0, 10);
        const arr = [...(remindersByDate[k] || []), r].sort((a, b) =>
        a.time.localeCompare(b.time)
        );
        const next = { ...remindersByDate, [k]: arr };
        saveReminders(next);
        set({ remindersByDate: next });
    },

    /**
     * Update a reminder (and possibly move it to a different day).
     * Removes the previous entry, inserts in the new day, re-sorts, cleans empty keys,
     * and persists the whole map.
     */
    updateReminder: (r) => {
        const { remindersByDate } = get();

        const flat = Object.entries(remindersByDate).flatMap(([d, arr]) =>
            arr.map((x) => ({ ...x, dateKey: d }))
        );
        const idx = flat.findIndex((x) => x.id === r.id);
        if (idx < 0) return;

        const prevDateKey = flat[idx].dateKey as string;
        const map: Record<string, Reminder[]> = { ...remindersByDate };

        // remove from previous day
        map[prevDateKey] = (map[prevDateKey] || []).filter((x) => x.id !== r.id);

        // add to new day and keep time order
        const nk = r.dateISO.slice(0, 10);
        map[nk] = [...(map[nk] || []), r].sort((a, b) => a.time.localeCompare(b.time));

        // drop empty day arrays to keep storage tidy
        if (map[prevDateKey]?.length === 0) delete map[prevDateKey];

        saveReminders(map);
        set({ remindersByDate: map });
    },

    /** Delete a reminder by id across all days and persist the result. */
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

    /** Clear all reminders for a given date (YYYY-MM-DD derived from ISO). */
    clearDay: (dateISO) => {
        const { remindersByDate } = get();
        const k = dateISO.slice(0, 10);
        const { [k]: _, ...rest } = remindersByDate as any;
        saveReminders(rest);
        set({ remindersByDate: rest });
    },
}));
