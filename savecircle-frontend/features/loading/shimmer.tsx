import type { ReactNode } from "react";
import "./shimmer.css";

export function Shimmer({ title, description, footer, cards = 0, rows = 5, columns = 4, children }: {
  title: string; description?: string; footer?: string; cards?: number; rows?: number; columns?: number; children?: ReactNode;
}) {
  return <section className="shimmer" aria-busy="true">
    {cards > 0 && <div className="shimmer-cards" aria-hidden="true" data-count={cards}>
      {Array.from({ length: cards }, (_, index) => <div className="shimmer-card" key={index}><span className="shimmer-bar" /><span className="shimmer-bar" /><span className="shimmer-bar" /></div>)}
    </div>}
    <div className="shimmer-panel">
      <div role="status"><h2>{title}</h2>{description && <p>{description}</p>}</div>
      <div className="shimmer-rows" aria-hidden="true">
        {Array.from({ length: rows }, (_, row) => <div key={row} data-columns={columns}>
          {Array.from({ length: columns }, (_, column) => <span className="shimmer-bar" key={column} />)}
        </div>)}
      </div>
      {footer && <p>{footer}</p>}
      {children}
    </div>
  </section>;
}
