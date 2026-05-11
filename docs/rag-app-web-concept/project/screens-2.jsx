// More screens: Users, Codes, Logs, Settings, plus user detail and code modal
// Depends on: data.js, primitives.jsx

// ═══ USERS LIST ═════════════════════════════════════════════════════════
function ScreenUsers({ t, lang, navigate, view }) {
  const [q, setQ] = React.useState('');
  const [filter, setFilter] = React.useState('all');
  let list = USERS;
  if (filter !== 'all') list = list.filter(u => u.role === filter);
  if (q) list = list.filter(u => u.name.toLowerCase().includes(q.toLowerCase()) || u.handle.includes(q.toLowerCase()));
  const isCards = view === 'cards';

  return (
    <div style={{ paddingBottom: 16 }}>
      <div style={{ padding: '12px 16px 8px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <SearchField placeholder={t.search} value={q} onChange={setQ} />
        <Segmented
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: t.all },
            { value: 'admin', label: t.roleAdmin },
            { value: 'member', label: t.roleMember },
            { value: 'guest', label: t.roleGuest },
          ]}
        />
        <Btn variant="primary" full icon={Icon.plus}>{t.inviteUser}</Btn>
      </div>

      {isCards ? (
        <div style={{ padding: '8px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {list.map(u => (
            <button key={u.id} onClick={() => navigate('user-detail', { id: u.id })} style={{
              border: '1px solid var(--border)', background: 'var(--surface)',
              borderRadius: 14, padding: 14, cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center',
            }}>
              <Avatar user={u} size={48} />
              <div style={{ minWidth: 0, width: '100%' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</div>
                <div style={{ fontSize: 10.5, color: 'var(--muted)', fontFamily: 'var(--mono)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.handle}</div>
              </div>
              <Chip tone={u.role === 'admin' ? 'accent' : u.role === 'guest' ? 'muted' : 'neutral'}>
                {u.role === 'admin' ? t.roleAdmin : u.role === 'guest' ? t.roleGuest : t.roleMember}
              </Chip>
              <div style={{ fontSize: 10.5, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
                {u.kbCount} {lang === 'ru' ? 'баз' : 'bases'}
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div style={{
          margin: '0 16px', background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 14, overflow: 'hidden',
        }}>
          {list.map((u, i) => (
            <button key={u.id} onClick={() => navigate('user-detail', { id: u.id })} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 14px', background: 'transparent', border: 0,
              borderBottom: i < list.length - 1 ? '1px solid var(--border)' : 'none',
              cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
            }}>
              <Avatar user={u} size={40} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</div>
                <div style={{ fontSize: 11.5, color: 'var(--muted)', fontFamily: 'var(--mono)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {u.handle} · {u.online ? t.online : u.lastActive}
                </div>
              </div>
              <Chip tone={u.role === 'admin' ? 'accent' : u.role === 'guest' ? 'muted' : 'neutral'}>
                {u.role === 'admin' ? t.roleAdmin : u.role === 'guest' ? t.roleGuest : t.roleMember}
              </Chip>
              <IconBox size={16} color="var(--muted)">{Icon.chevron}</IconBox>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══ USER DETAIL ════════════════════════════════════════════════════════
function ScreenUserDetail({ t, lang, navigate, params }) {
  const u = USERS.find(x => x.id === params.id) || USERS[0];
  const [role, setRole] = React.useState(u.role);
  const userKbs = KBS.slice(0, u.kbCount || 3);

  return (
    <div style={{ paddingBottom: 24 }}>
      {/* Hero */}
      <div style={{ padding: '20px 16px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center' }}>
        <Avatar user={u} size={84} />
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--fg)', letterSpacing: -0.3 }}>{u.name}</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', fontFamily: 'var(--mono)', marginTop: 2 }}>{u.handle}</div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <Chip tone="success">● {u.online ? t.online : u.lastActive}</Chip>
        </div>
      </div>

      <Section title={t.role}>
        <Segmented
          value={role}
          onChange={setRole}
          options={[
            { value: 'admin', label: t.roleAdmin },
            { value: 'member', label: t.roleMember },
            { value: 'guest', label: t.roleGuest },
          ]}
        />
        <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 8, lineHeight: 1.4 }}>
          {role === 'admin' && (lang === 'ru' ? 'Полный доступ к Mini App, может управлять базами и пользователями.' : 'Full Mini App access, manages bases and users.')}
          {role === 'member' && (lang === 'ru' ? 'Доступ к выбранным базам через TG-чат с ассистентом.' : 'Access to selected bases via TG chat with assistant.')}
          {role === 'guest' && (lang === 'ru' ? 'Без доступа к чату — только просмотр приглашений.' : 'No chat access — invitation view only.')}
        </div>
      </Section>

      <Section title={`${t.accessTo} · ${userKbs.length} ${t.bases}`}>
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 14, overflow: 'hidden',
        }}>
          {KBS.map((kb, i) => {
            const has = userKbs.some(k => k.id === kb.id);
            return (
              <div key={kb.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px',
                borderBottom: i < KBS.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <KbTile kb={kb} size={32} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--fg)' }}>{kb.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
                    {kb.docs} {t.docs}
                  </div>
                </div>
                <button style={{
                  width: 44, height: 26, borderRadius: 999, border: 0,
                  background: has ? 'var(--accent)' : 'var(--surface-2)',
                  position: 'relative', cursor: 'pointer', flexShrink: 0,
                  transition: 'background .15s',
                }}>
                  <div style={{
                    position: 'absolute', top: 2, left: has ? 20 : 2,
                    width: 22, height: 22, borderRadius: '50%', background: '#fff',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                    transition: 'left .15s',
                  }}/>
                </button>
              </div>
            );
          })}
        </div>
      </Section>

      <div style={{ padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Btn variant="outline" full>{lang === 'ru' ? 'Открыть профиль в Telegram' : 'Open Telegram profile'}</Btn>
        <Btn variant="danger" full icon={Icon.trash}>{lang === 'ru' ? 'Отозвать доступ' : 'Revoke access'}</Btn>
      </div>
    </div>
  );
}

// ═══ ACCESS CODES ═══════════════════════════════════════════════════════
function ScreenCodes({ t, lang, navigate, openModal, view }) {
  const [filter, setFilter] = React.useState('all');
  let list = CODES;
  if (filter !== 'all') list = list.filter(c => c.status === filter);
  const isCards = view === 'cards';

  return (
    <div style={{ paddingBottom: 16 }}>
      <div style={{ padding: '12px 16px 8px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Btn variant="primary" full icon={Icon.plus} onClick={() => openModal('newCode')}>
          {t.generateCode}
        </Btn>
        <Segmented
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: t.all },
            { value: 'active', label: t.active },
            { value: 'used', label: t.used },
            { value: 'expired', label: t.expired },
          ]}
        />
      </div>

      {isCards ? (
        <div style={{ padding: '8px 16px', display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
          {list.map(c => <CodeCard key={c.id} c={c} t={t} lang={lang} openModal={openModal} />)}
        </div>
      ) : (
        <div style={{
          margin: '0 16px', background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 14, overflow: 'hidden',
        }}>
          {list.map((c, i) => (
            <button key={c.id} onClick={() => openModal('codeDetail', c)} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 10,
              padding: '12px 14px', background: 'transparent', border: 0,
              borderBottom: i < list.length - 1 ? '1px solid var(--border)' : 'none',
              cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontFamily: 'var(--mono)', fontWeight: 600, color: 'var(--fg)', letterSpacing: 0.5 }}>
                  {c.code}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 3 }}>
                  {c.uses}/{c.max === 999 ? '∞' : c.max} {t.codeUses} · {c.kbs.length} {t.bases}
                </div>
              </div>
              <Chip tone={c.status === 'active' ? 'success' : c.status === 'used' ? 'muted' : 'danger'}>
                {c.status === 'active' ? t.active : c.status === 'used' ? t.used : t.expired}
              </Chip>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CodeCard({ c, t, lang, openModal }) {
  const tone = c.status === 'active' ? 'success' : c.status === 'used' ? 'muted' : 'danger';
  return (
    <div style={{
      border: '1px solid var(--border)', background: 'var(--surface)',
      borderRadius: 14, overflow: 'hidden',
    }}>
      <div style={{
        padding: '14px 16px',
        background: c.status === 'active' ? 'var(--accent-soft)' : 'var(--surface-2)',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{ flex: 1, fontFamily: 'var(--mono)', fontSize: 17, fontWeight: 700,
          color: c.status === 'active' ? 'var(--accent)' : 'var(--fg-2)', letterSpacing: 1 }}>
          {c.code}
        </div>
        <button onClick={() => openModal('codeDetail', c)} style={{
          width: 32, height: 32, borderRadius: 8, border: 0,
          background: 'rgba(255,255,255,0.6)', color: 'var(--fg-2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        }}>
          <IconBox size={16}>{Icon.copy}</IconBox>
        </button>
      </div>
      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>{t.codeUses}</span>
          <span style={{ fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--fg)' }}>
            {c.uses} {t.codeOf} {c.max === 999 ? '∞' : c.max}
          </span>
        </div>
        <div style={{ height: 4, background: 'var(--surface-2)', borderRadius: 999, overflow: 'hidden' }}>
          <div style={{
            width: `${Math.min(100, (c.uses / c.max) * 100)}%`, height: '100%',
            background: c.status === 'active' ? 'var(--accent)' : 'var(--muted)',
          }}/>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <Chip tone={c.role === 'admin' ? 'accent' : 'neutral'}>
              {c.role === 'admin' ? t.roleAdmin : c.role === 'guest' ? t.roleGuest : t.roleMember}
            </Chip>
            <Chip tone="muted">{c.kbs.length} {t.bases}</Chip>
          </div>
          <Chip tone={tone}>
            {c.status === 'active' ? t.active : c.status === 'used' ? t.used : t.expired}
          </Chip>
        </div>
      </div>
    </div>
  );
}

// ═══ ACTIVITY LOG ═══════════════════════════════════════════════════════
function ScreenLogs({ t, lang }) {
  const groups = [
    { label: t.today, items: ACTIVITY.slice(0, 5) },
    { label: t.yesterday, items: ACTIVITY.slice(5) },
  ];
  const verbs = lang === 'ru' ? {
    doc_added: 'добавил(а) документ',
    user_joined: 'присоединился(ась)',
    code_used: 'использовал код',
    access_granted: 'получил доступ к',
    doc_indexed: 'Проиндексирован',
    role_changed: 'роль изменена на',
    kb_created: 'создал базу',
    doc_failed: 'Ошибка индексации',
  } : {
    doc_added: 'added document',
    user_joined: 'joined',
    code_used: 'used code',
    access_granted: 'got access to',
    doc_indexed: 'Indexed',
    role_changed: 'role changed to',
    kb_created: 'created base',
    doc_failed: 'Indexing failed',
  };

  return (
    <div style={{ paddingBottom: 16 }}>
      {groups.map(g => (
        <Section key={g.label} title={g.label}>
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 14, overflow: 'hidden',
          }}>
            {g.items.map((a, i) => {
              const u = a.user ? USERS.find(x => x.id === a.user) : null;
              const kb = a.kb ? KBS.find(x => x.id === a.kb) : null;
              return (
                <div key={a.id} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  padding: '10px 14px',
                  borderBottom: i < g.items.length - 1 ? '1px solid var(--border)' : 'none',
                }}>
                  {u ? <Avatar user={u} size={32} /> : (
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: a.type === 'doc_failed' ? 'rgba(239,68,68,0.12)' : 'var(--surface-2)',
                      color: a.type === 'doc_failed' ? '#DC2626' : 'var(--muted)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <IconBox size={16}>{a.type === 'doc_failed' ? Icon.doc : Icon.spark}</IconBox>
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: 'var(--fg)', lineHeight: 1.35 }}>
                      {u && <span style={{ fontWeight: 600 }}>{u.name}</span>}
                      {u && ' '}
                      <span style={{ color: 'var(--fg-2)' }}>{verbs[a.type]}</span>
                      {a.target && ' '}
                      {a.target && <span style={{ fontWeight: 500 }}>{a.target}</span>}
                    </div>
                    {kb && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                      {lang === 'ru' ? 'в' : 'in'} {kb.name}
                    </div>}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)', flexShrink: 0 }}>
                    {lang === 'ru' ? a.time : a.timeEn}
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      ))}
    </div>
  );
}

// ═══ MORE / SETTINGS ════════════════════════════════════════════════════
function ScreenMore({ t, lang, navigate, setLang }) {
  const items1 = [
    { label: t.activityLog, icon: Icon.spark, screen: 'logs' },
    { label: lang === 'ru' ? 'Аналитика' : 'Analytics', icon: Icon.bell, screen: 'logs' },
  ];

  return (
    <div style={{ paddingBottom: 16 }}>
      <Section title={lang === 'ru' ? 'Администрирование' : 'Admin'}>
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 14, overflow: 'hidden',
        }}>
          {items1.map((it, i) => (
            <button key={it.label} onClick={() => navigate(it.screen)} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 14px', background: 'transparent', border: 0,
              borderBottom: i < items1.length - 1 ? '1px solid var(--border)' : 'none',
              cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: 9, background: 'var(--accent-soft)',
                color: 'var(--accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <IconBox size={18}>{it.icon}</IconBox>
              </div>
              <span style={{ flex: 1, fontSize: 14, color: 'var(--fg)' }}>{it.label}</span>
              <IconBox size={16} color="var(--muted)">{Icon.chevron}</IconBox>
            </button>
          ))}
        </div>
      </Section>

      <Section title={t.appearance}>
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 14, overflow: 'hidden', padding: '12px 14px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 14, color: 'var(--fg)' }}>{t.language}</span>
            <Segmented
              value={lang}
              onChange={setLang}
              options={[{ value: 'ru', label: 'RU' }, { value: 'en', label: 'EN' }]}
            />
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 10, lineHeight: 1.5 }}>
            {lang === 'ru'
              ? 'Тема, плотность и представление списков настраиваются через панель Tweaks (значок справа сверху).'
              : 'Theme, density and list view are configured via the Tweaks panel (icon top-right).'}
          </div>
        </div>
      </Section>

      <Section title={t.about}>
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 14, padding: 14, textAlign: 'center',
        }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}>RAG Assistant</div>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', fontFamily: 'var(--mono)', marginTop: 4 }}>
            v1.4.2 · admin panel
          </div>
        </div>
      </Section>
    </div>
  );
}

// ═══ NEW CODE MODAL ═════════════════════════════════════════════════════
function NewCodeSheet({ t, lang, onClose }) {
  const [role, setRole] = React.useState('member');
  const [maxUses, setMaxUses] = React.useState(10);
  const [unlimited, setUnlimited] = React.useState(false);
  const [expiry, setExpiry] = React.useState('14d');
  const [selectedKbs, setSelectedKbs] = React.useState(['kb1']);
  const [generated, setGenerated] = React.useState(null);
  const [copied, setCopied] = React.useState(false);

  const generate = () => {
    const segs = [
      ['ENG','HR','SAL','PRD','SUP','LEG'][Math.floor(Math.random() * 6)],
      Math.random().toString(36).slice(2, 6).toUpperCase(),
      Math.random().toString(36).slice(2, 6).toUpperCase(),
    ];
    setGenerated(segs.join('-'));
  };
  const copy = () => {
    navigator.clipboard?.writeText(generated);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-end',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', background: 'var(--bg)', borderRadius: '20px 20px 0 0',
        maxHeight: '88%', display: 'flex', flexDirection: 'column',
        boxShadow: '0 -10px 40px rgba(0,0,0,0.2)',
      }}>
        <div style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid var(--border)' }}>
          <div style={{ width: 36, height: 4, background: 'var(--surface-2)', borderRadius: 999,
            position: 'absolute', top: 6, left: '50%', transform: 'translateX(-50%)' }}/>
          <button onClick={onClose} style={{ border: 0, background: 'transparent', color: 'var(--accent)',
            fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>{t.cancel}</button>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)' }}>{t.generateCode}</div>
          <button onClick={generate} disabled={generated} style={{ border: 0, background: 'transparent',
            color: generated ? 'var(--muted)' : 'var(--accent)',
            fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>{t.create}</button>
        </div>

        <div style={{ flex: 1, overflow: 'auto', paddingBottom: 24 }}>
          {generated && (
            <div style={{ padding: 16 }}>
              <div style={{
                padding: '20px 16px', background: 'var(--accent-soft)', borderRadius: 14,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
              }}>
                <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600, letterSpacing: 0.6, textTransform: 'uppercase' }}>
                  {lang === 'ru' ? 'Код доступа создан' : 'Code created'}
                </div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 700,
                  color: 'var(--accent)', letterSpacing: 2 }}>
                  {generated}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Btn variant="primary" icon={copied ? Icon.check : Icon.copy} onClick={copy}>
                    {copied ? t.copied : t.copy}
                  </Btn>
                  <Btn variant="secondary" icon={Icon.refresh} onClick={generate}>
                    {lang === 'ru' ? 'Ещё' : 'New'}
                  </Btn>
                </div>
              </div>
            </div>
          )}

          <Section title={t.codeRole} dense>
            <Segmented
              value={role}
              onChange={setRole}
              options={[
                { value: 'member', label: t.roleMember },
                { value: 'guest', label: t.roleGuest },
                { value: 'admin', label: t.roleAdmin },
              ]}
            />
          </Section>

          <Section title={t.codeUses} dense>
            <div style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column', gap: 12,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: 'var(--fg)' }}>{lang === 'ru' ? 'Без ограничений' : 'Unlimited'}</span>
                <button onClick={() => setUnlimited(!unlimited)} style={{
                  width: 44, height: 26, borderRadius: 999, border: 0,
                  background: unlimited ? 'var(--accent)' : 'var(--surface-2)',
                  position: 'relative', cursor: 'pointer',
                }}>
                  <div style={{
                    position: 'absolute', top: 2, left: unlimited ? 20 : 2,
                    width: 22, height: 22, borderRadius: '50%', background: '#fff',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left .15s',
                  }}/>
                </button>
              </div>
              {!unlimited && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, color: 'var(--fg-2)' }}>{lang === 'ru' ? 'Лимит' : 'Limit'}</span>
                    <span style={{ fontSize: 14, fontFamily: 'var(--mono)', fontWeight: 600, color: 'var(--accent)' }}>{maxUses}</span>
                  </div>
                  <input type="range" min={1} max={100} value={maxUses}
                    onChange={e => setMaxUses(+e.target.value)}
                    style={{ width: '100%', accentColor: 'var(--accent)' }} />
                </>
              )}
            </div>
          </Section>

          <Section title={t.codeExpires} dense>
            <Segmented
              value={expiry}
              onChange={setExpiry}
              options={[
                { value: '24h', label: '24ч' },
                { value: '7d', label: '7д' },
                { value: '14d', label: '14д' },
                { value: '30d', label: '30д' },
                { value: 'never', label: '∞' },
              ]}
            />
          </Section>

          <Section title={`${t.codeBases} · ${selectedKbs.length}`} dense>
            <div style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 14, overflow: 'hidden',
            }}>
              {KBS.map((kb, i) => {
                const sel = selectedKbs.includes(kb.id);
                return (
                  <button key={kb.id} onClick={() => setSelectedKbs(sel ?
                    selectedKbs.filter(x => x !== kb.id) : [...selectedKbs, kb.id])} style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 14px', background: 'transparent', border: 0,
                    borderBottom: i < KBS.length - 1 ? '1px solid var(--border)' : 'none',
                    cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                  }}>
                    <KbTile kb={kb} size={32}/>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--fg)' }}>{kb.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>{kb.docs} {t.docs}</div>
                    </div>
                    <div style={{
                      width: 22, height: 22, borderRadius: 6,
                      border: `1.5px solid ${sel ? 'var(--accent)' : 'var(--border-strong)'}`,
                      background: sel ? 'var(--accent)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff',
                    }}>
                      {sel && <IconBox size={14}>{Icon.check}</IconBox>}
                    </div>
                  </button>
                );
              })}
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  ScreenUsers, ScreenUserDetail, ScreenCodes, CodeCard, ScreenLogs, ScreenMore,
  NewCodeSheet,
});
