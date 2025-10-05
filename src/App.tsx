import { addMonths, endOfMonth, format, getDay, startOfMonth, subMonths } from "date-fns";
import { useMemo, useState } from "react";
import { useStore } from "./store";
import type { Reminder } from "./store";
import { getWeatherSummary } from "./weather";

/* Utils */
const DOW = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
const uid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2));

function useMonthGrid(monthStartISO: string) {
  const first = startOfMonth(new Date(monthStartISO));
  const last = endOfMonth(first);

  const leading = getDay(first); // 0..6 (Sun..Sat)
  const days: (Date | null)[] = [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: last.getDate() }, (_, i) => new Date(first.getFullYear(), first.getMonth(), i + 1)),
  ];
  while (days.length % 7) days.push(null);

  return { first, days };
}

function wxIcon(summary?: string | null) {
  const s = summary?.toLowerCase() || "";
  if (s.includes("clear")) return "☀️";
  if (s.includes("cloud")) return "☁️";
  if (s.includes("drizzle")) return "🌦️";
  if (s.includes("rain showers")) return "🌦️";
  if (s.includes("rain")) return "🌧️";
  if (s.includes("snow showers")) return "🌨️";
  if (s.includes("snow")) return "🌨️";
  if (s.includes("fog")) return "🌫️";
  if (s.includes("thunder")) return "⛈️";
  return "🌡️";
}

/* Day cell */
function DayCell({
  date,
  reminders,
  onAdd,
  onEdit,
  onDelete,
  onClear,
}: {
  date: Date | null;
  reminders: Reminder[];
  onAdd: (d: Date) => void;
  onEdit: (r: Reminder) => void;
  onDelete: (id: string) => void;
  onClear: (d: Date) => void;
}) {
  const [openList, setOpenList] = useState(false);
  if (!date) return <div className="day disabled" />;

  const isToday = date.toDateString() === new Date().toDateString();
  const list = reminders ?? [];
  const visible = list.slice(0, 3);
  const overflow = list.length - visible.length;

  return (
    <div className={`day ${isToday ? "today" : ""}`}>
      <div className="day__header">
        <span className="muted">{date.getDate()}</span>
        <button className="icon" onClick={() => onAdd(date)}>＋</button>
      </div>

      <div className="reminders">
        {visible.map((r) => (
          <div
            key={r.id}
            className="reminder"
            style={{ borderLeftColor: r.color }}
            title={`${r.time} ${r.text}${r.weather ? " • " + r.weather : ""}`}
            onClick={() => onEdit(r)}
          >
            <div className="reminder__main">
              <span className="dot" style={{ background: r.color }} />
              <span className="reminder__time">{r.time}</span>
              <span className="reminder__text">{r.text}</span>
              <button
                className="del"
                aria-label="delete reminder"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(r.id);
                }}
              >
                ×
              </button>
            </div>

            {(r.weather || r.city) && (
              <div className="meta-row">
                {r.weather && (
                  <>
                    <span className="wx-icon">{wxIcon(r.weather)}</span>
                    <span className="wx-label">{r.weather}</span>
                  </>
                )}
                {r.weather && r.city && <span className="wx-sep">•</span>}
                {r.city && <span className="wx-city">{r.city}</span>}
              </div>
            )}
          </div>
        ))}

        {overflow > 0 && (
          <button className="more" onClick={() => setOpenList(true)}>
            +{overflow} more
          </button>
        )}
      </div>

      {list.length > 0 && (
        <div className="day__footer">
          <button
            className="icon icon-sm danger"
            aria-label="clear day"
            title="Delete all reminders of this day"
            onClick={() => onClear(date)}
          >
            🗑
          </button>
        </div>
      )}

      {openList && (
        <div className="modal" onClick={() => setOpenList(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet__title">
              <b>{format(date, "PPPP")}</b>
              <div className="spacer" />
            </div>

            <div className="list">
              {list.map((r) => (
                <div key={r.id} className="row">
                  <div className="row__left">
                    <span className="dot" style={{ background: r.color }} />
                    <span className="tm">{r.time}</span>
                    <span>{r.text}</span>
                    {r.weather && (
                      <span className="wx">
                        <span className="wx-icon">{wxIcon(r.weather)}</span>
                        {r.weather}
                      </span>
                    )}
                    {r.city && <span className="wx-city"> • {r.city}</span>}
                  </div>
                  <div className="row__right">
                    <button onClick={() => onEdit(r)}>Edit</button>
                    <button className="danger" onClick={() => onDelete(r.id)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="actions" style={{ marginTop: 12 }}>
              <button className="danger" onClick={() => onClear(date)}>Clear all</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* Editor */
function Editor({
  initial,
  onClose,
  onSave,
}: {
  initial?: Partial<Reminder> & { dateISO: string };
  onClose: () => void;
  onSave: (r: Reminder) => void;
}) {
  const [text, setText] = useState(initial?.text ?? "");
  const [city, setCity] = useState(initial?.city ?? "");
  const [dateISO, setDateISO] = useState(initial?.dateISO ?? new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState(initial?.time ?? "09:00");
  const [color, setColor] = useState(initial?.color ?? "#3b82f6");
  const [busy, setBusy] = useState(false);

  const valid = text.trim().length > 0 && text.length <= 30 && city.trim().length > 0;

  return (
    <div className="modal" onClick={onClose}>
      <form
        className="sheet"
        onClick={(e) => e.stopPropagation()}
        onSubmit={async (e) => {
          e.preventDefault();
          if (!valid) return;
          setBusy(true);
          const weather = await getWeatherSummary(city, dateISO, time);
          onSave({
            id: (initial as Reminder)?.id ?? uid(),
            text: text.trim(),
            color,
            city: city.trim(),
            dateISO: new Date(dateISO).toISOString(),
            time,
            weather,
          });
          setBusy(false);
          onClose();
        }}
      >
        <h3>{initial?.id ? "Edit reminder" : "New reminder"}</h3>

        <label>
          Text
          <input aria-label="text" value={text} maxLength={30} onChange={(e) => setText(e.target.value)} />
        </label>

        <label>
          City
          <input aria-label="city" value={city} onChange={(e) => setCity(e.target.value)} />
        </label>

        <div className="row2">
          <label>
            Date
            <input aria-label="date" type="date" value={dateISO} onChange={(e) => setDateISO(e.target.value)} />
          </label>
          <label>
            Time
            <input aria-label="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </label>
          <label>
            Color
            <input aria-label="color" type="color" value={color} onChange={(e) => setColor(e.target.value)} />
          </label>
        </div>

        <div className="actions">
          <button type="button" onClick={onClose}>Cancel</button>
          <button disabled={!valid || busy} type="submit">{busy ? "Saving..." : "Save"}</button>
        </div>
      </form>
    </div>
  );
}

/* App */
export default function App() {
  const { monthStartISO, remindersByDate, setMonthStart, addReminder, updateReminder, deleteReminder, clearDay } =
    useStore();

  const { first, days } = useMonthGrid(monthStartISO);
  const [editing, setEditing] = useState<null | (Partial<Reminder> & { dateISO: string })>(null);

  const weeks = useMemo(() => {
    const out: (Date | null)[][] = [];
    for (let i = 0; i < days.length; i += 7) out.push(days.slice(i, i + 7));
    return out;
  }, [days]);

  return (
    <div className="wrap">
      <header className="topbar">
        <button onClick={() => setMonthStart(subMonths(new Date(monthStartISO), 1).toISOString())}>‹</button>
        <h2>{format(first, "LLLL yyyy")}</h2>
        <button onClick={() => setMonthStart(addMonths(new Date(monthStartISO), 1).toISOString())}>›</button>
      </header>

      <div className="grid">
        {DOW.map((d) => (
          <div key={d} className="dow">{d}</div>
        ))}

        {weeks.flat().map((d, i) => {
          const key = d ? d.toISOString().slice(0, 10) : `x${i}`;
          return (
            <DayCell
              key={key}
              date={d}
              reminders={d ? remindersByDate[key] ?? [] : []}
              onAdd={(date) => setEditing({ dateISO: date.toISOString().slice(0, 10) })}
              onEdit={(r) => setEditing(r)}
              onDelete={deleteReminder}
              onClear={(date) => clearDay(date.toISOString())}
            />
          );
        })}
      </div>

      {editing && (
        <Editor
          initial={editing}
          onClose={() => setEditing(null)}
          onSave={(r) => ((editing as any)?.id ? updateReminder(r) : addReminder(r))}
        />
      )}
    </div>
  );
}
