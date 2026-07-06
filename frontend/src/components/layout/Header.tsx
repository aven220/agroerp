interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function Header({ title, subtitle, actions }: HeaderProps) {
  return (
    <header className="topbar page-topbar">
      <div>
        <h1>{title}</h1>
        {subtitle ? <p className="topbar-sub">{subtitle}</p> : null}
      </div>
      {actions ? <div className="topbar-right">{actions}</div> : null}
    </header>
  );
}
