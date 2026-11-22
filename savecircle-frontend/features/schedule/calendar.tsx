import { useState } from "react";
import type { SavedCircle } from "../circles/model";
import { usdc } from "../landing/plan";
import { Action, Badge, Facts, StatusBadge, scheduleHref } from "./components";
import { calendarDays, canPay, dateLabel, dayKey, fullDate, monthYear, type Cycle } from "./model";

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const monthStart = (date: Date, offset = 0) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + offset, 1));

export function Calendar({ circle, cycles, today, amount }: { circle: SavedCircle; cycles: Cycle[]; today: Date; amount: number }) {
  const featured = cycles.find(cycle => canPay(cycle) || cycle.status === "Pending") ?? cycles.filter(cycle => cycle.due <= today).at(-1) ?? cycles[0];
  const [month, setMonth] = useState(() => monthStart(featured?.due ?? today));
  const [selected, setSelected] = useState(() => dayKey(featured?.due ?? today));
  const todayKey = dayKey(today);
  const days = calendarDays(month);
  const current = cycles.find(cycle => dayKey(cycle.due) === selected) ?? cycles.find(cycle => dayKey(cycle.deadline) === selected);
  const upcoming = cycles.filter(cycle => cycle.status === "Upcoming").slice(0, 3);

  function changeMonth(target: Date) {
    setMonth(target);
    const first = cycles.find(cycle => cycle.due.getUTCFullYear() === target.getUTCFullYear() && cycle.due.getUTCMonth() === target.getUTCMonth());
    setSelected(first ? dayKey(first.due) : dayKey(target));
  }

  return <>
    <div className="schedule-columns">
      <section className="schedule-card schedule-calendar" aria-label="Contribution calendar">
        <div className="schedule-month">
          <h2 aria-live="polite">{monthYear(month)}</h2>
          <div className="schedule-actions">
            <button className="schedule-button outline" aria-label="Previous month" onClick={() => changeMonth(monthStart(month, -1))}>‹</button>
            <button className="schedule-button outline" onClick={() => { setMonth(monthStart(today)); setSelected(todayKey); }}>Today</button>
            <button className="schedule-button outline" aria-label="Next month" onClick={() => changeMonth(monthStart(month, 1))}>›</button>
          </div>
        </div>
        <div className="schedule-days schedule-weekdays" aria-hidden="true">{weekdays.map(day => <span key={day}>{day}</span>)}</div>
        <div className="schedule-days">
          {days.map(day => {
            const key = dayKey(day);
            const due = cycles.find(cycle => dayKey(cycle.due) === key);
            const deadline = cycles.find(cycle => dayKey(cycle.deadline) === key);
            const isToday = key === todayKey;
            return <button key={key} className="schedule-day" data-outside={day.getUTCMonth() !== month.getUTCMonth()}
              data-today={isToday} data-due={due?.status} aria-pressed={key === selected}
              aria-label={[fullDate(day), due && `${usdc(amount)} due, ${due.status}`, deadline && "Payment deadline", isToday && "Today"].filter(Boolean).join(", ")}
              onClick={() => setSelected(key)}>
              <span>{day.getUTCDate()}</span>
              {due && <small>{amount / 100} USDC</small>}
              {deadline && <small className="schedule-red">Deadline</small>}
              {isToday && <small>Today</small>}
            </button>;
          })}
        </div>
        <div className="schedule-legend"><span>● Due date</span><span>● Payment deadline</span><span>● Today</span></div>
      </section>
      <aside className="schedule-card schedule-stack" aria-live="polite">
        {current ? <>
          <StatusBadge status={current.status} />
          <h2>{dateLabel(current.due, { weekday: "long", month: "long", day: "numeric" })}</h2>
          <h3>{circle.name}</h3>
          <p>Cycle {current.number} of {cycles.length} · {circle.frequency}</p>
          <strong className="schedule-amount">{usdc(amount)}</strong>
          <Facts rows={[["Deadline", `${dateLabel(current.deadline)}, 23:59`], ["Paid", usdc(current.paid)], ["Outstanding", usdc(amount - current.paid)]]} />
          <Action tone="primary" href={scheduleHref(circle.id, canPay(current) ? "pay" : current.status === "Paid" ? "receipt" : current.status === "Pending" ? "pay" : "detail", current.number, "calendar")}>
            {canPay(current) ? "Pay contribution →" : current.status === "Paid" ? "View receipt →" : current.status === "Pending" ? "Check payment →" : "View details →"}
          </Action>
          {current.status === "Overdue" && <p className="schedule-red">The {circle.grace}-day payment window has ended. Your contribution is still outstanding.</p>}
        </> : <><h2>{fullDate(new Date(`${selected}T00:00:00Z`))}</h2><p>No contributions or deadlines on this date.</p></>}
      </aside>
    </div>
    {upcoming.length > 0 && <section className="schedule-card schedule-upcoming"><h2>Coming up next</h2>
      <ul>{upcoming.map(cycle => <li key={cycle.number}>
        <strong>{fullDate(cycle.due)}</strong>
        <p>Cycle {cycle.number}{circle.id === "surulere" && cycle.number === 4 ? " · Your payout month" : cycle.number === cycles.length ? " · Final contribution" : ""}</p>
        <strong>{usdc(amount)}</strong><Badge tone="neutral">Upcoming</Badge>
      </li>)}</ul>
    </section>}
    <p>A reminder is not a payment. Every contribution needs your wallet approval.</p>
  </>;
}
