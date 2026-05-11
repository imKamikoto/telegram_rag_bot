// Shared primitives, icons, and screen components for the RAG admin Mini App
// Loaded as Babel JSX. Exports everything to window.

// ─── Icon set (24px line icons, currentColor) ────────────────────────────
const Icon = {
  home: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11.5L12 4l9 7.5V20a1 1 0 01-1 1h-5v-7h-6v7H4a1 1 0 01-1-1v-8.5z"/></svg>,
  kb: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 4h11a3 3 0 013 3v13H8a3 3 0 01-3-3V4z"/><path d="M5 17a3 3 0 013-3h11"/><path d="M9 8h7M9 12h5"/></svg>,
  users: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.4 3.3-5.5 6.5-5.5s5.9 2.1 6.5 5.5"/><circle cx="17" cy="7" r="2.5"/><path d="M16 14.5c2.5 0 4.6 1.4 5.5 3.5"/></svg>,
  code: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 10v4M11 10v4M15 10v4M19 10v4"/></svg>,
  more: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="18" cy="12" r="1.4"/></svg>,
  search: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>,
  plus: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>,
  back: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5l-7 7 7 7"/></svg>,
  chevron: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5l7 7-7 7"/></svg>,
  upload: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V4M7 9l5-5 5 5"/><path d="M5 16v3a2 2 0 002 2h10a2 2 0 002-2v-3"/></svg>,
  copy: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 00-1-1H5a1 1 0 00-1 1v10a1 1 0 001 1h3"/></svg>,
  refresh: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0115.5-6.3L21 8M21 4v4h-4M21 12a9 9 0 01-15.5 6.3L3 16M3 20v-4h4"/></svg>,
  check: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>,
  trash: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M9 7V4h6v3M6 7l1 13a2 2 0 002 2h6a2 2 0 002-2l1-13"/></svg>,
  bell: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 16V11a6 6 0 0112 0v5l1.5 2h-15L6 16z"/><path d="M10 20a2 2 0 004 0"/></svg>,
  filter: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 5h16l-6 8v6l-4-2v-4L4 5z"/></svg>,
  spark: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z"/></svg>,
  globe: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18"/></svg>,
  lock: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/></svg>,
  shield: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"/></svg>,
  doc: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M7 3h8l4 4v14a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1z"/><path d="M14 3v5h5"/></svg>,
  arrowRight: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>,
};

function IconBox({ children, size = 18, color }) {
  return (
    <span style={{ display: 'inline-flex', width: size, height: size, color: color || 'currentColor', flexShrink: 0 }}>
      {React.cloneElement(children, { width: size, height: size })}
    </span>
  );
}

// ─── Type icons for documents ────────────────────────────────────────────
function DocTypeBadge({ type }) {
  const map = {
    pdf: { label: 'PDF', bg: 'var(--accent-soft)', fg: 'var(--accent)' },
    docx: { label: 'DOC', bg: 'rgba(14,165,233,0.12)', fg: '#0284C7' },
    md: { label: 'MD', bg: 'rgba(99,102,241,0.12)', fg: '#4F46E5' },
    txt: { label: 'TXT', bg: 'rgba(100,116,139,0.12)', fg: '#475569' },
  };
  const m = map[type] || map.txt;
  return (
    <div style={{
      width: 36, height: 44, borderRadius: 6,
      background: m.bg, color: m.fg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 9.5, fontWeight: 700, letterSpacing: 0.4, flexShrink: 0,
      fontFamily: 'var(--mono)',
    }}>{m.label}</div>
  );
}

// ─── Avatar ──────────────────────────────────────────────────────────────
function Avatar({ user, size = 36 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: user.avatar, color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.36, fontWeight: 600, letterSpacing: 0.3,
      flexShrink: 0, position: 'relative',
      fontFamily: 'var(--sans)',
    }}>
      {user.initials}
      {user.online && <div style={{
        position: 'absolute', right: -1, bottom: -1, width: size * 0.28, height: size * 0.28,
        borderRadius: '50%', background: '#16A34A', border: '2px solid var(--bg)',
      }}/>}
    </div>
  );
}

// ─── KB tile (square emoji block) ────────────────────────────────────────
function KbTile({ kb, size = 40 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.28,
      background: kb.color, color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.5, lineHeight: 1, flexShrink: 0,
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), 0 1px 2px rgba(0,0,0,0.06)',
    }}>{kb.emoji}</div>
  );
}

// ─── Page header (TG mini app style) ─────────────────────────────────────
function Header({ title, subtitle, onBack, action, large = false }) {
  return (
    <div style={{
      padding: onBack ? '8px 8px 12px' : '14px 16px 12px',
      display: 'flex', alignItems: 'center', gap: 6, minHeight: 52,
      borderBottom: '1px solid var(--border)',
      background: 'var(--bg)', position: 'sticky', top: 0, zIndex: 10,
    }}>
      {onBack && (
        <button onClick={onBack} style={{
          width: 36, height: 36, borderRadius: 10, border: 0, background: 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--accent)', cursor: 'pointer', flexShrink: 0,
        }}>
          <IconBox size={22}>{Icon.back}</IconBox>
        </button>
      )}
      <div style={{ flex: 1, minWidth: 0, paddingLeft: onBack ? 0 : 0 }}>
        <div style={{
          fontSize: large ? 22 : 17, fontWeight: 600, color: 'var(--fg)',
          lineHeight: 1.2, letterSpacing: -0.3,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{title}</div>
        {subtitle && <div style={{
          fontSize: 12, color: 'var(--muted)', marginTop: 2,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{subtitle}</div>}
      </div>
      {action}
    </div>
  );
}

// ─── Bottom tab bar ──────────────────────────────────────────────────────
function TabBar({ active, onChange, t }) {
  const tabs = [
    { id: 'home', icon: Icon.home, label: t.nav.home },
    { id: 'kb', icon: Icon.kb, label: t.nav.kb },
    { id: 'users', icon: Icon.users, label: t.nav.users },
    { id: 'codes', icon: Icon.code, label: t.nav.codes },
    { id: 'more', icon: Icon.more, label: t.nav.more },
  ];
  return (
    <div style={{
      display: 'flex', borderTop: '1px solid var(--border)',
      background: 'var(--bg)', paddingBottom: 18, paddingTop: 6,
    }}>
      {tabs.map(tab => (
        <button key={tab.id} onClick={() => onChange(tab.id)} style={{
          flex: 1, border: 0, background: 'transparent',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
          padding: '6px 4px', cursor: 'pointer',
          color: active === tab.id ? 'var(--accent)' : 'var(--muted)',
        }}>
          <IconBox size={24}>{tab.icon}</IconBox>
          <span style={{ fontSize: 10.5, fontWeight: 500, letterSpacing: 0.1 }}>{tab.label}</span>
        </button>
      ))}
    </div>
  );
}

// ─── Search field ────────────────────────────────────────────────────────
function SearchField({ placeholder, value, onChange }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '0 12px', height: 36,
      background: 'var(--surface-2)', borderRadius: 10,
      color: 'var(--muted)',
    }}>
      <IconBox size={16}>{Icon.search}</IconBox>
      <input
        value={value || ''}
        onChange={e => onChange?.(e.target.value)}
        placeholder={placeholder}
        style={{
          flex: 1, border: 0, background: 'transparent', outline: 'none',
          fontSize: 14, color: 'var(--fg)', fontFamily: 'inherit',
        }}
      />
    </div>
  );
}

// ─── Segmented control ───────────────────────────────────────────────────
function Segmented({ options, value, onChange }) {
  return (
    <div style={{
      display: 'flex', padding: 2, background: 'var(--surface-2)',
      borderRadius: 9, position: 'relative',
    }}>
      {options.map(o => (
        <button key={o.value} onClick={() => onChange(o.value)} style={{
          flex: 1, border: 0, background: value === o.value ? 'var(--bg)' : 'transparent',
          color: value === o.value ? 'var(--fg)' : 'var(--muted)',
          height: 28, borderRadius: 7, cursor: 'pointer',
          fontSize: 13, fontWeight: value === o.value ? 600 : 500,
          boxShadow: value === o.value ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
          transition: 'all .15s', fontFamily: 'inherit',
        }}>{o.label}</button>
      ))}
    </div>
  );
}

// ─── Pill / Chip ─────────────────────────────────────────────────────────
function Chip({ children, tone = 'neutral', size = 'sm' }) {
  const tones = {
    neutral: { bg: 'var(--surface-2)', fg: 'var(--fg-2)' },
    accent: { bg: 'var(--accent-soft)', fg: 'var(--accent)' },
    success: { bg: 'rgba(22,163,74,0.12)', fg: '#15803D' },
    warn: { bg: 'rgba(245,158,11,0.14)', fg: '#B45309' },
    danger: { bg: 'rgba(239,68,68,0.12)', fg: '#B91C1C' },
    muted: { bg: 'var(--surface-2)', fg: 'var(--muted)' },
  };
  const t = tones[tone];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: size === 'sm' ? '2px 8px' : '4px 10px',
      borderRadius: 999, background: t.bg, color: t.fg,
      fontSize: size === 'sm' ? 11 : 12, fontWeight: 500, letterSpacing: 0.1,
      whiteSpace: 'nowrap',
    }}>{children}</span>
  );
}

// ─── Action button (primary CTA) ─────────────────────────────────────────
function Btn({ children, onClick, variant = 'primary', size = 'md', icon, full }) {
  const variants = {
    primary: { bg: 'var(--accent)', fg: '#fff', border: 'transparent' },
    secondary: { bg: 'var(--surface-2)', fg: 'var(--fg)', border: 'transparent' },
    outline: { bg: 'transparent', fg: 'var(--fg)', border: 'var(--border-strong)' },
    ghost: { bg: 'transparent', fg: 'var(--accent)', border: 'transparent' },
    danger: { bg: 'transparent', fg: '#DC2626', border: 'transparent' },
  };
  const v = variants[variant];
  const sizes = {
    sm: { h: 30, px: 12, fs: 13 },
    md: { h: 40, px: 16, fs: 14 },
    lg: { h: 48, px: 20, fs: 15 },
  };
  const s = sizes[size];
  return (
    <button onClick={onClick} style={{
      height: s.h, padding: `0 ${s.px}px`, borderRadius: 10,
      border: `1px solid ${v.border}`, background: v.bg, color: v.fg,
      fontSize: s.fs, fontWeight: 600, fontFamily: 'inherit',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      cursor: 'pointer', width: full ? '100%' : 'auto', whiteSpace: 'nowrap',
    }}>
      {icon && <IconBox size={s.fs + 4}>{icon}</IconBox>}
      {children}
    </button>
  );
}

// ─── Card / Section block ────────────────────────────────────────────────
function Section({ title, action, children, dense }) {
  return (
    <div style={{ padding: dense ? '12px 16px 4px' : '16px 16px 8px' }}>
      {title && (
        <div style={{
          display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
          marginBottom: 10,
        }}>
          <h3 style={{
            fontSize: 13, fontWeight: 600, color: 'var(--muted)',
            margin: 0, textTransform: 'uppercase', letterSpacing: 0.6,
          }}>{title}</h3>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

Object.assign(window, {
  Icon, IconBox, DocTypeBadge, Avatar, KbTile,
  Header, TabBar, SearchField, Segmented, Chip, Btn, Section,
});
