interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  breadcrumb?: React.ReactNode;
}

export function Header({ title, subtitle, actions, breadcrumb }: HeaderProps) {
  return (
    <header className="topbar page-topbar">
      <div className="page-topbar-main">
        {breadcrumb ? <div className="breadcrumbs page-topbar-crumb">{breadcrumb}</div> : null}
        <h1>{title}</h1>
        {subtitle ? <p className="topbar-sub">{subtitle}</p> : null}
      </div>
      {actions ? <div className="topbar-right">{actions}</div> : null}
    </header>
  );
}
