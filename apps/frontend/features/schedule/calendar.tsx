import { useState } from "react";
import { circleDate, circleLabel } from "../circles/api";
import type { ScheduleCycle } from "./api";
import { calendarDays, dayKey, monthYear } from "./model";
import { Facts } from "./components";

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const monthStart = (date: Date, offset = 0) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + offset, 1));

export function Calendar({ cycles }: { cycles: ScheduleCycle[ ] }) {
  const [today] = useState(() => new Date());
  const [initial] = useState(() => cycles.find((cycle) => cycle.dueDate.slice(0, 10) >= dayKey(today))?.dueDate ?? today.toISOString());
  const [month, setMonth] = useState(() => monthStart(new Date(initial)));
  const [selected, setSelected] = useState(() => initial.slice(0, 10));
  const cyclesOn = (date: string) => cycles.filter((cycle) => cycle.dueDate.startsWith(date));

  function changeMonth(target: Date) {
    setMonth(target);
    const prefix = dayKey(target).slice(0, 7);
    setSelected(cycles.find((cycle) => cycle.dueDate.startsWith(prefix))?.dueDate.slice(0, 10) ?? dayKey(target));
  }

  const selectedCycles = cyclesOn(selected);
  return <div className="schedule-columns">
    <section className="schedule-card schedule-calendar" aria-label="Contribution calendar">
      <div className="schedule-month"><h2 aria-live="polite">{monthYear(month)}</h2>
        <div className="schedule-actions">
          <button className="schedule-button outline" aria-label="Previous month" onClick={() => changeMonth(monthStart(month, -1))}>‹</button>
          <button className="schedule-button outline" onClick={() => { setMonth(monthStart(today)); setSelected(dayKey(today)); }}>Today</button>
          <button className="schedule-button outline" aria-label="Next month" onClick={() => changeMonth(monthStart(month, 1))}>›</button>
        </div>
      </div>
      <div className="schedule-days schedule-weekdays" aria-hidden="true">{weekdays.map((day) => <span key={day}>{day}</span>)}</div>
      <div className="schedule-days">{calendarDays(month).map((day) => {
        const key = dayKey(day);
        const due = cyclesOn(key);
        return <button key={key} className="schedule-day" data-outside={day.getUTCMonth() !== month.getUTCMonth()} data-today={key === dayKey(today)}
          data-due={due.length ? "Upcoming" : undefined} aria-pressed={key === selected} aria-label={`${circleDate(key)}${due.length ? `, ${due.length} scheduled` : ""}`}
          onClick={() => setSelected(key)}><span>{day.getUTCDate()}</span>{due.length > 0 && <small>{due.length === 1 ? "Cycle due" : `${due.length} cycles due`}</small>}</button>;
      })}</div>
    </section>
    <aside className="schedule-card schedule-stack" aria-live="polite">
      <h2>{circleDate(selected)}</h2>
      {selectedCycles.length ? selectedCycles.map((cycle) => <section key={cycle.cycleIndex}><h3>Cycle {cycle.cycleIndex}</h3><Facts rows={[
        ["Status", circleLabel(cycle.status)], ["Target pool", `${cycle.targetAmount} USDC`],
        ["Collected", `${cycle.collectedAmount} USDC`], ["Recipient", cycle.recipientName],
      ]} /></section>) : <p>No cycles due on this date.</p>}
    </aside>
  </div>;
}
