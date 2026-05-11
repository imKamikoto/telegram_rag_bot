// Screens for the RAG admin Mini App. Loaded as Babel JSX.
// Depends on: data.js, primitives.jsx

// ═══ DASHBOARD ═══════════════════════════════════════════════════════════
function ScreenHome({ t, lang, navigate, density }) {
  const stats = [
    { label: t.kpiKb, value: KBS.length, delta: '+2', icon: Icon.kb, tone: 'accent' },
    { label: t.kpiDocs, value: DOCS.length * 87, delta: '+34', icon: Icon.doc, tone: 'neutral' },
    { label: t.kpiUsers, value: USERS.length * 28, delta: '+12', icon: Icon.users, tone: 'neutral' },
    { label: t.kpiQueries, value: '1.2k', delta: '+8%', icon: Icon.spark, tone: 'neutral' },
  ];

  const quickActions = [
    { id: 'newKb', label: t.qaNewKb, icon: Icon.plus, tone: 'accent' },
    { id: 'upload', label: t.qaUpload, icon: Icon.upload },
    { id: 'invite', label: t.qaInvite, icon: Icon.users },
    { id: 'code', label: t.qaCode, icon: Icon.code },
  ];

  return (
    <div style={{ paddingBottom: 16 }}>
      {/* Greeting strip */}
      <div style={{ padding: '18px 16px 10px' }}>
        <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500 }}>
          {t.greeting}, Анна
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--fg)', letterSpacing: -0.4, marginTop: 2 }}>
          {t.overview}
        </div>
      </div>

      {/* KPI grid */}
      <div style={{
        padding: '0 16px',
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
      }}>
        {stats.map((s, i) => (
          <div key={i} style={{
            padding: '12px 14px',
            background: s.tone === 'accent' ? 'var(--accent-soft)' : 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 14,
            display: 'flex', flexDirection: 'column', gap: 6,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <IconBox size={16} color={s.tone === 'accent' ? 'var(--accent)' : 'var(--muted)'}>{s.icon}</IconBox>
              <span style={{ fontSize: 11, color: '#15803D', fontWeight: 600, fontFamily: 'var(--mono)' }}>{s.delta}</span>
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--fg)', letterSpacing: -0.4, lineHeight: 1.1 }}>
                {s.value}
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <Section title={t.quickActions}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {quickActions.map(a => (
            <button key={a.id} onClick={() => {
              if (a.id === 'newKb') navigate('kb');
              else if (a.id === 'upload') navigate('kb-detail', { id: 'kb1', tab: 'docs' });
              else if (a.id === 'invite') navigate('users');
              else if (a.id === 'code') navigate('codes');
            }} style={{
              border: '1px solid var(--border)', background: 'var(--surface)',
              borderRadius: 12, padding: '12px 4px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: 9,
                background: a.tone === 'accent' ? 'var(--accent)' : 'var(--surface-2)',
                color: a.tone === 'accent' ? '#fff' : 'var(--fg)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <IconBox size={18}>{a.icon}</IconBox>
              </div>
              <span style={{ fontSize: 11, color: 'var(--fg)', fontWeight: 500, textAlign: 'center', lineHeight: 1.2 }}>
                {a.label}
              </span>
            </button>
          ))}
        </div>
      </Section>

      {/* Recent activity */}
      <Section
        title={t.recentActivity}
        action={<button onClick={() => navigate('logs')} style={{
          border: 0, background: 'transparent', color: 'var(--accent)',
          fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
        }}>{t.seeAll}</button>}
      >
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 14, overflow: 'hidden',
        }}>
          {ACTIVITY.slice(0, 5).map((a, i) => {
            const u = a.user ? USERS.find(x => x.id === a.user) : null;
            const kb = a.kb ? KBS.find(x => x.id === a.kb) : null;
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
              <div key={a.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px',
                borderBottom: i < 4 ? '1px solid var(--border)' : 'none',
              }}>
                {u ? <Avatar user={u} size={32} /> : (
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: 'var(--surface-2)', color: 'var(--muted)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <IconBox size={16}>{a.type === 'doc_failed' ? Icon.doc : Icon.spark}</IconBox>
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: 'var(--fg)', lineHeight: 1.35 }}>
                    {u && <span style={{ fontWeight: 600 }}>{u.name.split(' ')[0]}</span>}
                    {u && ' '}
                    <span style={{ color: 'var(--fg-2)' }}>{verbs[a.type]}</span>
                    {a.target && ' '}
                    {a.target && <span style={{ fontWeight: 500 }}>{a.target}</span>}
                  </div>
                  {kb && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>в {kb.name}</div>}
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)', flexShrink: 0 }}>
                  {lang === 'ru' ? a.time : a.timeEn}
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      {/* System status */}
      <Section title={lang === 'ru' ? 'Состояние индексации' : 'Index status'}>
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 14, padding: 14,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: 'var(--fg)', fontWeight: 500 }}>
              {lang === 'ru' ? 'Векторная БД' : 'Vector DB'}
            </span>
            <Chip tone="success">● online</Chip>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <div style={{ flex: 1, height: 6, background: 'var(--surface-2)', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ width: '94%', height: '100%', background: 'var(--accent)', borderRadius: 999 }}/>
            </div>
            <span style={{ fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--fg-2)' }}>94%</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>
            {lang === 'ru' ? '12 348 чанков · последнее обновление 12 мин назад' : '12,348 chunks · updated 12m ago'}
          </div>
        </div>
      </Section>
    </div>
  );
}

// ═══ KB LIST ═════════════════════════════════════════════════════════════
function ScreenKbList({ t, lang, navigate, view }) {
  const [q, setQ] = React.useState('');
  const filtered = KBS.filter(k => !q || k.name.toLowerCase().includes(q.toLowerCase()));
  const isCards = view === 'cards';

  return (
    <div style={{ paddingBottom: 16 }}>
      <div style={{ padding: '12px 16px 8px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <SearchField placeholder={t.search} value={q} onChange={setQ} />
        <Btn variant="primary" full icon={Icon.plus} size="md">{t.newKb}</Btn>
      </div>

      {isCards ? (
        <div style={{ padding: '8px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {filtered.map(kb => (
            <button key={kb.id} onClick={() => navigate('kb-detail', { id: kb.id })} style={{
              padding: 14, border: '1px solid var(--border)', background: 'var(--surface)',
              borderRadius: 14, textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', flexDirection: 'column', gap: 10, minHeight: 130,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <KbTile kb={kb} size={36} />
                {kb.visibility === 'private' ? (
                  <IconBox size={14} color="var(--muted)">{Icon.lock}</IconBox>
                ) : (
                  <IconBox size={14} color="var(--muted)">{Icon.globe}</IconBox>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)', lineHeight: 1.25, letterSpacing: -0.2 }}>
                  {kb.name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, lineHeight: 1.3,
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                }}>
                  {kb.desc}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
                <span>{kb.docs} doc</span>
                <span>·</span>
                <span>{kb.members} ppl</span>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div style={{
          margin: '8px 16px', background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 14, overflow: 'hidden',
        }}>
          {filtered.map((kb, i) => (
            <button key={kb.id} onClick={() => navigate('kb-detail', { id: kb.id })} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 14px', background: 'transparent', border: 0,
              borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none',
              cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
            }}>
              <KbTile kb={kb} size={42} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--fg)', letterSpacing: -0.2 }}>
                    {kb.name}
                  </span>
                  {kb.visibility === 'private' && <IconBox size={12} color="var(--muted)">{Icon.lock}</IconBox>}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {kb.docs} {t.docs} · {kb.members} {t.members} · {lang === 'ru' ? kb.updated : kb.updatedEn}
                </div>
              </div>
              <IconBox size={16} color="var(--muted)">{Icon.chevron}</IconBox>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══ KB DETAIL ═══════════════════════════════════════════════════════════
function ScreenKbDetail({ t, lang, navigate, params, view }) {
  const kb = KBS.find(k => k.id === params.id) || KBS[0];
  const [tab, setTab] = React.useState(params.tab || 'docs');
  const [memberSearch, setMemberSearch] = React.useState('');

  const members = USERS.slice(0, 6);
  const allUsers = USERS.filter(u => !memberSearch || u.name.toLowerCase().includes(memberSearch.toLowerCase()));

  return (
    <div style={{ paddingBottom: 24 }}>
      {/* KB hero */}
      <div style={{ padding: '8px 16px 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <KbTile kb={kb} size={56} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--fg)', letterSpacing: -0.3, lineHeight: 1.2 }}>
            {kb.name}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>
            {kb.desc}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <Chip tone={kb.visibility === 'private' ? 'muted' : 'accent'}>
              {kb.visibility === 'private' ? t.private : t.public}
            </Chip>
            <Chip tone="muted">{kb.docs} {t.docs}</Chip>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ padding: '0 16px 12px' }}>
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: 'docs', label: t.documents },
            { value: 'access', label: t.access },
            { value: 'settings', label: t.settings },
          ]}
        />
      </div>

      {tab === 'docs' && <KbDocsTab t={t} lang={lang} kb={kb} view={view} />}
      {tab === 'access' && <KbAccessTab t={t} lang={lang} kb={kb} memberSearch={memberSearch} setMemberSearch={setMemberSearch} allUsers={allUsers} members={members} view={view} />}
      {tab === 'settings' && <KbSettingsTab t={t} lang={lang} kb={kb} />}
    </div>
  );
}

function KbDocsTab({ t, lang, kb, view }) {
  return (
    <>
      <div style={{ padding: '0 16px 10px' }}>
        <Btn variant="primary" full icon={Icon.upload} size="md">{t.addDocument}</Btn>
      </div>
      <div style={{
        margin: '0 16px', background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 14, overflow: 'hidden',
      }}>
        {DOCS.map((d, i) => (
          <div key={d.id} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 14px',
            borderBottom: i < DOCS.length - 1 ? '1px solid var(--border)' : 'none',
          }}>
            <DocTypeBadge type={d.type} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 13.5, color: 'var(--fg)', fontWeight: 500,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{d.name}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3, fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
                <span>{d.size}</span>
                <span>·</span>
                <span>{d.pages}p</span>
                <span>·</span>
                <span>{d.updated}</span>
              </div>
              {d.status === 'indexing' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                  <div style={{ flex: 1, height: 3, background: 'var(--surface-2)', borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{ width: `${d.progress * 100}%`, height: '100%', background: 'var(--accent)' }} />
                  </div>
                  <span style={{ fontSize: 10, color: 'var(--accent)', fontFamily: 'var(--mono)' }}>{Math.round(d.progress * 100)}%</span>
                </div>
              )}
            </div>
            {d.status === 'indexed' && <Chip tone="success" size="sm">●</Chip>}
            {d.status === 'indexing' && <Chip tone="warn" size="sm">↻</Chip>}
            {d.status === 'failed' && <Chip tone="danger" size="sm">!</Chip>}
          </div>
        ))}
      </div>
    </>
  );
}

function KbAccessTab({ t, lang, kb, memberSearch, setMemberSearch, allUsers, members, view }) {
  return (
    <>
      <div style={{ padding: '0 16px 10px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <SearchField placeholder={lang === 'ru' ? 'Поиск пользователя' : 'Find user'} value={memberSearch} onChange={setMemberSearch}/>
      </div>

      <Section title={lang === 'ru' ? `Имеют доступ · ${members.length}` : `Have access · ${members.length}`} dense>
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 14, overflow: 'hidden',
        }}>
          {allUsers.map((u, i) => {
            const has = members.some(m => m.id === u.id);
            return (
              <div key={u.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px',
                borderBottom: i < allUsers.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <Avatar user={u} size={36} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--fg)' }}>{u.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>{u.handle}</div>
                </div>
                <Chip tone={u.role === 'admin' ? 'accent' : u.role === 'guest' ? 'muted' : 'neutral'}>
                  {u.role === 'admin' ? t.roleAdmin : u.role === 'guest' ? t.roleGuest : t.roleMember}
                </Chip>
                <button style={{
                  width: 28, height: 28, borderRadius: 8, border: 0,
                  background: has ? 'var(--accent)' : 'var(--surface-2)',
                  color: has ? '#fff' : 'var(--muted)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', flexShrink: 0,
                }}>
                  <IconBox size={14}>{has ? Icon.check : Icon.plus}</IconBox>
                </button>
              </div>
            );
          })}
        </div>
      </Section>
    </>
  );
}

function KbSettingsTab({ t, lang, kb }) {
  return (
    <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 14, overflow: 'hidden',
      }}>
        {[
          { label: lang === 'ru' ? 'Название' : 'Name', value: kb.name },
          { label: lang === 'ru' ? 'Описание' : 'Description', value: kb.desc },
          { label: lang === 'ru' ? 'Видимость' : 'Visibility', value: kb.visibility === 'private' ? t.private : t.public },
          { label: lang === 'ru' ? 'Модель эмбеддингов' : 'Embedding model', value: 'text-embedding-3-large' },
          { label: lang === 'ru' ? 'Размер чанка' : 'Chunk size', value: '512' },
        ].map((row, i, arr) => (
          <div key={row.label} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 14px', gap: 10,
            borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
          }}>
            <span style={{ fontSize: 13, color: 'var(--fg-2)' }}>{row.label}</span>
            <span style={{ fontSize: 13, color: 'var(--fg)', fontFamily: row.value.match(/^[a-z0-9-]+$/i) ? 'var(--mono)' : 'inherit',
              maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'right',
            }}>{row.value}</span>
          </div>
        ))}
      </div>

      <Btn variant="outline" full icon={Icon.refresh}>
        {lang === 'ru' ? 'Переиндексировать всё' : 'Reindex everything'}
      </Btn>
      <Btn variant="danger" full icon={Icon.trash}>
        {lang === 'ru' ? 'Удалить базу знаний' : 'Delete knowledge base'}
      </Btn>
    </div>
  );
}

Object.assign(window, {
  ScreenHome, ScreenKbList, ScreenKbDetail,
});
