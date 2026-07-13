export function AppScreen({ children, className = "" }) {
  return <main className={`app-screen ${className}`.trim()}>{children}</main>;
}

export function AppHeader({ eyebrow, title, subtitle, action }) {
  return (
    <header className="app-header">
      <div className="app-header__copy">
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action && <div className="app-header__action">{action}</div>}
    </header>
  );
}

export function Card({ children, className = "", as: Tag = "section", ...props }) {
  return <Tag className={`card ${className}`.trim()} {...props}>{children}</Tag>;
}

export function SectionCard({ title, description, children, className = "" }) {
  return (
    <Card className={`section-card ${className}`.trim()}>
      {(title || description) && (
        <div className="section-heading">
          {title && <h2>{title}</h2>}
          {description && <p>{description}</p>}
        </div>
      )}
      {children}
    </Card>
  );
}

function Button({ variant, icon, children, className = "", type = "button", ...props }) {
  return (
    <button type={type} className={`button button--${variant} ${className}`.trim()} {...props}>
      {icon && <span className="button__icon" aria-hidden="true">{icon}</span>}
      <span>{children}</span>
    </button>
  );
}

export function PrimaryButton(props) { return <Button variant="primary" {...props} />; }
export function SecondaryButton(props) { return <Button variant="secondary" {...props} />; }
export function DangerButton(props) { return <Button variant="danger" {...props} />; }

export function IconButton({ label, icon, active = false, ...props }) {
  return (
    <button type="button" className={`icon-button${active ? " is-active" : ""}`} aria-label={label} aria-current={active ? "page" : undefined} {...props}>
      <span className="icon-button__icon" aria-hidden="true">{icon}</span>
      <span className="icon-button__label">{label}</span>
    </button>
  );
}

export function StatusBadge({ children, tone = "success" }) {
  return <span className={`status-badge status-badge--${tone}`}>{children}</span>;
}

export function EmptyState({ icon = "—", title, description }) {
  return (
    <Card className="empty-state">
      <span className="empty-state__icon" aria-hidden="true">{icon}</span>
      <h2>{title}</h2>
      {description && <p>{description}</p>}
    </Card>
  );
}
