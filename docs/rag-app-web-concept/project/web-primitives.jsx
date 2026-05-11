// Web admin primitives — Linear/Notion-style dense UI

const WI = {
  search: <path d="M14 14l-3-3m1-4a5 5 0 11-10 0 5 5 0 0110 0z" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round"/>,
  plus: <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>,
  upload: <path d="M8 11V3M5 6l3-3 3 3M3 11v1a1 1 0 001 1h8a1 1 0 001-1v-1" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round"/>,
  download: <path d="M8 3v8m-3-3l3 3 3-3M3 13h10" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round"/>,
  filter: <path d="M2 4h12M4 8h8M6 12h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>,
  sort: <path d="M4 3v10m0 0l-2-2m2 2l2-2M12 13V3m0 0l-2 2m2-2l2 2" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round"/>,
  more: <g fill="currentColor"><circle cx="3" cy="8" r="1.3"/><circle cx="8" cy="8" r="1.3"/><circle cx="13" cy="8" r="1.3"/></g>,
  chevron: <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round"/>,
  chevronDown: <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round"/>,
  refresh: <path d="M13 8a5 5 0 11-1.5-3.5L13 6V3M3 8a5 5 0 011.5-3.5" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round"/>,
  trash: <path d="M3 5h10M6 5V3h4v2M5 5l1 8h4l1-8" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round"/>,
  lock: <g fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="3.5" y="7" width="9" height="6" rx="1"/><path d="M5.5 7V5a2.5 2.5 0 015 0v2"/></g>,
  globe: <g fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="8" cy="8" r="5.5"/><path d="M2.5 8h11M8 2.5c2 2 2 9 0 11M8 2.5c-2 2-2 9 0 11"/></g>,
  spark: <path d="M8 2v3M8 11v3M2 8h3M11 8h3M4 4l2 2M10 10l2 2M4 12l2-2M10 6l2-2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>,
  copy: <g fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="3" y="5" width="8" height="9" rx="1"/><path d="M5 5V3a1 1 0 011-1h7a1 1 0 011 1v8a1 1 0 01-1 1h-2"/></g>,
  user: <g fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="8" cy="6" r="2.5"/><path d="M3 13c0-2.5 2.2-4.5 5-4.5s5 2 5 4.5"/></g>,
  check: <path d="M3 8l3 3 7-7" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>,
};

function WIcon({ name, size = 14, color }) {
  return <svg width={size} height={size} viewBox="0 0 16 16" style={{ color: color || 'currentColor', display: 'block', flexShrink: 0 }}>{WI[name]}</svg>;
}

function WBtn({ children, variant = 'secondary', size = 'sm', icon, onClick }) {
  const h = size === 'md' ? 30 : 26;
  const fs = size === 'md' ? 12.5 : 12;
  const styles = {
    primary: { background: 'var(--accent)', color: '#fff', border: 0 },
    secondary: { background: 'var(--bg)', color: 'var(--fg)', border: '1px solid var(--border-strong)' },
    ghost: { background: 'transparent', color: 'var(--fg-2)', border: '1px solid transparent' },
    danger: { background: 'transparent', color: '#DC2626', border: '1px solid var(--border-strong)' },
  }[variant];
  return (
    <button onClick={onClick} style={{
      ...styles, height: h, padding: icon && !children ? 0 : '0 10px',
      width: icon && !children ? h : 'auto',
      borderRadius: 6, fontSize: fs, fontWeight: 500, fontFamily: 'inherit',
      display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer',
      whiteSpace: 'nowrap',
    }}>
      {icon && <WIcon name={icon} size={13}/>}
      {children}
    </button>
  );
}

function WSearch({ placeholder, width = 260 }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6, height: 26, width,
      padding: '0 8px', borderRadius: 6, border: '1px solid var(--border)',
      background: 'var(--bg)', color: 'var(--muted)',
    }}>
      <WIcon name="search" size={12}/>
      <span style={{ fontSize: 12 }}>{placeholder}</span>
      <span style={{ flex: 1 }}/>
      <kbd style={{ fontSize: 10, fontFamily: 'var(--mono)', padding: '1px 5px',
        border: '1px solid var(--border)', borderRadius: 3, color: 'var(--muted)' }}>⌘K</kbd>
    </div>
  );
}

function WChip({ children, tone = 'neutral' }) {
  const tones = {
    neutral: { bg: 'var(--surface-2)', fg: 'var(--fg-2)' },
    accent: { bg: 'var(--accent-soft)', fg: 'var(--accent)' },
    success: { bg: 'rgba(22,163,74,0.10)', fg: '#15803D' },
    warn: { bg: 'rgba(245,158,11,0.12)', fg: '#B45309' },
    danger: { bg: 'rgba(220,38,38,0.10)', fg: '#B91C1C' },
    muted: { bg: 'var(--surface-2)', fg: 'var(--muted)' },
  }[tone];
  return <span style={{
    display: 'inline-flex', alignItems: 'center', gap: 4,
    height: 18, padding: '0 6px', borderRadius: 4,
    background: tones.bg, color: tones.fg,
    fontSize: 11, fontWeight: 500, fontFamily: 'inherit',
    whiteSpace: 'nowrap',
  }}>{children}</span>;
}

function WAvatar({ user, size = 22 }) {
  return <div style={{
    width: size, height: size, borderRadius: '50%',
    background: user.avatar, color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: size * 0.42, fontWeight: 600, flexShrink: 0,
  }}>{user.initials}</div>;
}

function WKbTile({ kb, size = 22 }) {
  return <div style={{
    width: size, height: size, borderRadius: 5,
    background: kb.color, color: '#fff', flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: size * 0.55, fontWeight: 700,
  }}>{kb.emoji}</div>;
}

function WDocBadge({ type }) {
  const colors = { pdf: '#DC2626', md: '#0EA5E9', docx: '#2563EB', txt: '#71717A' };
  return <span style={{
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 28, height: 18, borderRadius: 3, fontSize: 9, fontWeight: 700,
    background: colors[type] || '#71717A', color: '#fff', fontFamily: 'var(--mono)',
    letterSpacing: 0.5,
  }}>{type.toUpperCase()}</span>;
}

// ─── Top nav (matches mobile tabs) ─────────────────────────────────────
function WTopNav({ active, onChange, t, lang, setLang, theme }) {
  const items = [
    { id: 'home', label: t.nav.home },
    { id: 'kb', label: t.nav.kb },
    { id: 'users', label: t.nav.users },
    { id: 'codes', label: t.nav.codes },
    { id: 'logs', label: lang === 'ru' ? 'Журнал' : 'Logs' },
    { id: 'playground', label: 'Playground' },
    { id: 'settings', label: t.settings },
  ];
  return (
    <div style={{
      height: 44, display: 'flex', alignItems: 'center',
      padding: '0 20px', gap: 0,
      borderBottom: '1px solid var(--border)',
      background: 'var(--bg)', flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 24 }}>
        <div style={{
          width: 22, height: 22, borderRadius: 5,
          background: 'var(--accent)', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 700,
        }}>R</div>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>RAG Admin</span>
        <span style={{ fontSize: 10.5, fontFamily: 'var(--mono)', color: 'var(--muted)',
          padding: '1px 5px', border: '1px solid var(--border)', borderRadius: 3 }}>v2.4</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {items.map(it => (
          <button key={it.id} onClick={() => onChange?.(it.id)} style={{
            height: 26, padding: '0 10px', border: 0, borderRadius: 5,
            background: active === it.id ? 'var(--surface-2)' : 'transparent',
            color: active === it.id ? 'var(--fg)' : 'var(--fg-2)',
            fontSize: 12.5, fontWeight: active === it.id ? 600 : 500,
            fontFamily: 'inherit', cursor: 'pointer',
          }}>{it.label}</button>
        ))}
      </div>
      <div style={{ flex: 1 }}/>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <WSearch placeholder={lang === 'ru' ? 'Поиск везде…' : 'Search everywhere…'} width={220}/>
        <button style={{
          width: 26, height: 26, borderRadius: 5, border: 0,
          background: 'transparent', color: 'var(--fg-2)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} title="Notifications">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M3.5 12V7a4.5 4.5 0 019 0v5l1 1h-11l1-1zM6.5 13.5a1.5 1.5 0 003 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div style={{ width: 1, height: 16, background: 'var(--border)' }}/>
        <WAvatar user={USERS[0]} size={22}/>
      </div>
    </div>
  );
}

function PageHeader({ title, subtitle, action, breadcrumb }) {
  return (
    <div style={{ padding: '20px 28px 16px', borderBottom: '1px solid var(--border)' }}>
      {breadcrumb && (
        <div style={{ fontSize: 11.5, color: 'var(--muted)', marginBottom: 6,
          display: 'flex', alignItems: 'center', gap: 6 }}>
          {breadcrumb.map((b, i) => (
            <React.Fragment key={i}>
              {i > 0 && <WIcon name="chevron" size={10} color="var(--muted)"/>}
              <span style={{ color: i === breadcrumb.length - 1 ? 'var(--fg-2)' : 'var(--muted)' }}>{b}</span>
            </React.Fragment>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ margin: 0, fontSize: 19, fontWeight: 600,
            color: 'var(--fg)', letterSpacing: -0.3 }}>{title}</h1>
          {subtitle && <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 4 }}>{subtitle}</div>}
        </div>
        {action && <div style={{ display: 'flex', gap: 6 }}>{action}</div>}
      </div>
    </div>
  );
}

function Toolbar({ children }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '10px 28px', borderBottom: '1px solid var(--border)',
      background: 'var(--bg)',
    }}>{children}</div>
  );
}

function WTable({ columns, rows, onRow }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
      <thead>
        <tr style={{ borderBottom: '1px solid var(--border)' }}>
          {columns.map((c, i) => (
            <th key={i} style={{
              textAlign: 'left', padding: '8px 12px',
              fontSize: 10.5, fontWeight: 500, color: 'var(--muted)',
              textTransform: 'uppercase', letterSpacing: 0.5,
              width: c.w,
            }}>{c.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} onClick={() => onRow?.(r)} style={{
            borderBottom: '1px solid var(--border)',
            cursor: onRow ? 'pointer' : 'default',
          }}>
            {columns.map((c, j) => (
              <td key={j} style={{ padding: '7px 12px', color: 'var(--fg)', verticalAlign: 'middle' }}>
                {c.cell(r)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

Object.assign(window, {
  WIcon, WBtn, WSearch, WChip, WAvatar, WKbTile, WDocBadge,
  WTopNav, PageHeader, Toolbar, WTable,
});
