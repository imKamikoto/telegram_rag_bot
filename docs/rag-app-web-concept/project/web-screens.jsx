// Web admin screens: Dashboard, KB list, KB detail, Users, Codes, Logs, Settings, Playground

// ─── DASHBOARD ───────────────────────────────────────────────────────────
function WDashboard({ t, lang }) {
  const stats = [
    { label: t.kpiKb, value: KBS.length, delta: '+2', deltaLabel: lang === 'ru' ? 'за неделю' : 'this week' },
    { label: t.kpiDocs, value: '12 348', delta: '+34', deltaLabel: lang === 'ru' ? 'сегодня' : 'today' },
    { label: t.kpiUsers, value: '286', delta: '+12', deltaLabel: lang === 'ru' ? 'за неделю' : 'this week' },
    { label: t.kpiQueries, value: '1 247', delta: '+8%', deltaLabel: lang === 'ru' ? 'к вчера' : 'vs yesterday' },
  ];
  const series = [22,28,34,29,42,38,55,49,62,58,71,68,74,81,77,89,92,86,94,102,98,110,107,115,121,118,128,134,131,142];
  const max = Math.max(...series);
  const points = series.map((v, i) => `${(i / (series.length - 1)) * 100},${100 - (v / max) * 95}`).join(' ');

  return (
    <>
      <PageHeader
        title={t.overview}
        subtitle={lang === 'ru' ? 'Сводка по всем базам, документам и пользователям' : 'System overview across bases, documents, users'}
        action={<><WBtn variant="secondary" icon="download" size="md">{lang === 'ru' ? 'Экспорт' : 'Export'}</WBtn>
          <WBtn variant="primary" icon="plus" size="md">{t.qaNewKb}</WBtn></>}
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1,
        background: 'var(--border)', borderBottom: '1px solid var(--border)' }}>
        {stats.map((s, i) => (
          <div key={i} style={{ background: 'var(--bg)', padding: '16px 20px' }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase',
              letterSpacing: 0.6, fontWeight: 500 }}>{s.label}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--fg)',
              letterSpacing: -0.6, marginTop: 6 }}>{s.value}</div>
            <div style={{ fontSize: 11.5, marginTop: 3, display: 'flex', gap: 5 }}>
              <span style={{ color: '#15803D', fontWeight: 600 }}>{s.delta}</span>
              <span style={{ color: 'var(--muted)' }}>{s.deltaLabel}</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 1, background: 'var(--border)' }}>
        <div style={{ background: 'var(--bg)', padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>
              {lang === 'ru' ? 'Запросы · 30 дней' : 'Queries · 30 days'}
            </h3>
            <div style={{ display: 'flex', gap: 2 }}>
              {['24h','7d','30d','90d'].map(p => (
                <button key={p} style={{
                  height: 22, padding: '0 8px', borderRadius: 4, border: 0,
                  background: p === '30d' ? 'var(--surface-2)' : 'transparent',
                  color: p === '30d' ? 'var(--fg)' : 'var(--muted)',
                  fontSize: 11, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--mono)',
                }}>{p}</button>
              ))}
            </div>
          </div>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: 170 }}>
            <defs>
              <linearGradient id="grad1" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.22"/>
                <stop offset="100%" stopColor="var(--accent)" stopOpacity="0"/>
              </linearGradient>
            </defs>
            {[25, 50, 75].map(y => (
              <line key={y} x1="0" x2="100" y1={y} y2={y} stroke="var(--border)" strokeWidth="0.2" vectorEffect="non-scaling-stroke"/>
            ))}
            <polygon points={`0,100 ${points} 100,100`} fill="url(#grad1)"/>
            <polyline points={points} fill="none" stroke="var(--accent)" strokeWidth="1.4" vectorEffect="non-scaling-stroke" strokeLinejoin="round"/>
          </svg>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6,
            fontSize: 10.5, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
            <span>1 апр</span><span>10 апр</span><span>20 апр</span><span>30 апр</span>
          </div>
        </div>

        <div style={{ background: 'var(--bg)', padding: '20px 24px' }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>
            {lang === 'ru' ? 'Топ баз по запросам' : 'Top bases'}
          </h3>
          {KBS.slice(0, 5).map((kb, i) => {
            const v = [380, 290, 210, 140, 95][i];
            return (
              <div key={kb.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
                <WKbTile kb={kb} size={20}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, color: 'var(--fg)', fontWeight: 500,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{kb.name}</div>
                  <div style={{ height: 3, background: 'var(--surface-2)', borderRadius: 999, marginTop: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${(v / 380) * 100}%`, height: '100%', background: kb.color }}/>
                  </div>
                </div>
                <span style={{ fontSize: 11.5, fontFamily: 'var(--mono)', color: 'var(--muted)' }}>{v}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 1, background: 'var(--border)' }}>
        <div style={{ background: 'var(--bg)', padding: '20px 24px' }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>
            {t.recentActivity}
          </h3>
          {ACTIVITY.slice(0, 6).map(a => {
            const u = a.user ? USERS.find(x => x.id === a.user) : null;
            const kb = a.kb ? KBS.find(x => x.id === a.kb) : null;
            const verbs = lang === 'ru' ? {
              doc_added: 'добавил(а) документ', user_joined: 'присоединился(ась)',
              code_used: 'использовал код', access_granted: 'получил доступ к',
              doc_indexed: 'Проиндексирован', role_changed: 'роль изменена на',
              kb_created: 'создал базу', doc_failed: 'Ошибка индексации',
            } : {
              doc_added: 'added document', user_joined: 'joined', code_used: 'used code',
              access_granted: 'got access to', doc_indexed: 'Indexed', role_changed: 'role changed to',
              kb_created: 'created base', doc_failed: 'Indexing failed',
            };
            return (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', fontSize: 12.5 }}>
                {u ? <WAvatar user={u} size={22}/> : <div style={{ width: 22, height: 22, borderRadius: '50%',
                  background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--muted)' }}><WIcon name="spark" size={10}/></div>}
                <div style={{ flex: 1, minWidth: 0, color: 'var(--fg-2)' }}>
                  {u && <span style={{ fontWeight: 600, color: 'var(--fg)' }}>{u.name}</span>}{u && ' '}
                  <span>{verbs[a.type]}</span>{a.target && ' '}
                  {a.target && <span style={{ color: 'var(--fg)', fontWeight: 500 }}>{a.target}</span>}
                  {kb && <span style={{ color: 'var(--muted)' }}> · {kb.name}</span>}
                </div>
                <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
                  {lang === 'ru' ? a.time : a.timeEn}
                </span>
              </div>
            );
          })}
        </div>

        <div style={{ background: 'var(--bg)', padding: '20px 24px' }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>
            {lang === 'ru' ? 'Состояние системы' : 'System health'}
          </h3>
          {[
            { label: 'Vector DB', status: 'ok', value: '94%' },
            { label: 'Embedding API', status: 'ok', value: '128ms' },
            { label: 'Indexer queue', status: 'ok', value: '3 jobs' },
            { label: 'Storage', status: 'warn', value: '78% used' },
            { label: 'Webhooks', status: 'ok', value: 'OK' },
          ].map(r => (
            <div key={r.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%',
                  background: r.status === 'ok' ? '#16A34A' : '#F59E0B' }}/>
                <span style={{ fontSize: 12.5, color: 'var(--fg)' }}>{r.label}</span>
              </div>
              <span style={{ fontSize: 11.5, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>{r.value}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ─── KB LIST ─────────────────────────────────────────────────────────────
function WKbList({ t, lang }) {
  return (
    <>
      <PageHeader title={t.knowledgeBases}
        subtitle={lang === 'ru'
          ? `${KBS.length} баз · ${KBS.reduce((s,k)=>s+k.docs,0)} документов · ${KBS.reduce((s,k)=>s+k.members,0)} участников`
          : `${KBS.length} bases · ${KBS.reduce((s,k)=>s+k.docs,0)} documents · ${KBS.reduce((s,k)=>s+k.members,0)} members`}
        action={<><WBtn variant="secondary" icon="upload">{lang === 'ru' ? 'Импорт' : 'Import'}</WBtn>
          <WBtn variant="primary" icon="plus">{t.newKb}</WBtn></>}/>
      <Toolbar>
        <WSearch placeholder={t.search}/>
        <WBtn variant="ghost" icon="filter">{lang === 'ru' ? 'Фильтр' : 'Filter'}</WBtn>
        <WBtn variant="ghost" icon="sort">{lang === 'ru' ? 'Сортировка' : 'Sort'}</WBtn>
        <div style={{ flex: 1 }}/>
        <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>
          {KBS.length} {lang === 'ru' ? 'результатов' : 'results'}
        </span>
      </Toolbar>
      <WTable
        columns={[
          { label: lang === 'ru' ? 'Название' : 'Name', cell: kb => (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <WKbTile kb={kb} size={22}/>
              <span style={{ fontWeight: 500, color: 'var(--fg)' }}>{kb.name}</span>
              {kb.visibility === 'private' && <WIcon name="lock" size={11} color="var(--muted)"/>}
            </div>
          )},
          { label: lang === 'ru' ? 'Описание' : 'Description',
            cell: kb => <span style={{ color: 'var(--muted)' }}>{kb.desc}</span> },
          { label: t.documents, w: 90, cell: kb =>
            <span style={{ fontFamily: 'var(--mono)', color: 'var(--fg-2)' }}>{kb.docs}</span> },
          { label: t.members, w: 90, cell: kb =>
            <span style={{ fontFamily: 'var(--mono)', color: 'var(--fg-2)' }}>{kb.members}</span> },
          { label: t.indexed, w: 110, cell: kb => (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 50, height: 4, background: 'var(--surface-2)', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{ width: `${kb.indexed * 100}%`, height: '100%',
                  background: kb.indexed === 1 ? '#16A34A' : 'var(--accent)' }}/>
              </div>
              <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--muted)' }}>
                {Math.round(kb.indexed * 100)}%
              </span>
            </div>
          )},
          { label: t.lastUpdated, w: 110, cell: kb =>
            <span style={{ color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: 11.5 }}>
              {lang === 'ru' ? kb.updated : kb.updatedEn}
            </span> },
          { label: '', w: 36, cell: () => <WIcon name="more" size={14} color="var(--muted)"/> },
        ]}
        rows={KBS}
      />
    </>
  );
}

// ─── KB DETAIL (docs + access tabs visible together) ─────────────────────
function WKbDetail({ t, lang }) {
  const kb = KBS[0];
  return (
    <>
      <PageHeader
        breadcrumb={[t.knowledgeBases, kb.name]}
        title={
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
            <WKbTile kb={kb} size={28}/>{kb.name}
            <WChip tone="muted">
              <WIcon name="lock" size={10}/>
              <span style={{ marginLeft: 3 }}>{t.private}</span>
            </WChip>
          </span>
        }
        subtitle={kb.desc}
        action={<><WBtn variant="secondary" icon="refresh">{lang === 'ru' ? 'Переиндексировать' : 'Reindex'}</WBtn>
          <WBtn variant="primary" icon="upload">{t.addDocument}</WBtn></>}
      />
      <div style={{ display: 'flex', gap: 0, padding: '0 28px', borderBottom: '1px solid var(--border)' }}>
        {[
          { v: 'docs', l: t.documents, n: kb.docs, active: true },
          { v: 'access', l: t.access, n: kb.members },
          { v: 'queries', l: lang === 'ru' ? 'Запросы' : 'Queries', n: 412 },
          { v: 'settings', l: t.settings },
        ].map(x => (
          <div key={x.v} style={{
            padding: '10px 14px',
            color: x.active ? 'var(--fg)' : 'var(--muted)',
            fontSize: 12.5, fontWeight: x.active ? 600 : 500,
            borderBottom: x.active ? '2px solid var(--accent)' : '2px solid transparent',
            marginBottom: -1, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
          }}>
            {x.l}
            {x.n != null && <span style={{ padding: '0 5px', background: 'var(--surface-2)',
              borderRadius: 3, fontSize: 10.5, fontFamily: 'var(--mono)', fontWeight: 500 }}>{x.n}</span>}
          </div>
        ))}
      </div>
      <Toolbar>
        <WSearch placeholder={lang === 'ru' ? 'Поиск документов' : 'Search documents'}/>
        <WBtn variant="ghost" icon="filter">{lang === 'ru' ? 'Тип' : 'Type'}</WBtn>
        <WBtn variant="ghost" icon="filter">{lang === 'ru' ? 'Статус' : 'Status'}</WBtn>
        <div style={{ flex: 1 }}/>
        <WBtn variant="ghost" icon="download">{lang === 'ru' ? 'Экспорт' : 'Export'}</WBtn>
      </Toolbar>
      <WTable
        columns={[
          { label: '', w: 24, cell: () => <input type="checkbox" style={{ accentColor: 'var(--accent)' }}/> },
          { label: lang === 'ru' ? 'Документ' : 'Document', cell: d => (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <WDocBadge type={d.type}/>
              <span style={{ color: 'var(--fg)', fontWeight: 500 }}>{d.name}</span>
            </div>
          )},
          { label: lang === 'ru' ? 'Размер' : 'Size', w: 80, cell: d =>
            <span style={{ fontFamily: 'var(--mono)', color: 'var(--muted)' }}>{d.size}</span> },
          { label: lang === 'ru' ? 'Стр.' : 'Pages', w: 60, cell: d =>
            <span style={{ fontFamily: 'var(--mono)', color: 'var(--muted)' }}>{d.pages}</span> },
          { label: lang === 'ru' ? 'Чанков' : 'Chunks', w: 80, cell: d =>
            <span style={{ fontFamily: 'var(--mono)', color: 'var(--muted)' }}>{d.pages * 12}</span> },
          { label: lang === 'ru' ? 'Статус' : 'Status', w: 140, cell: d => {
            if (d.status === 'indexed') return <WChip tone="success">● {t.indexed}</WChip>;
            if (d.status === 'indexing') return <WChip tone="warn">↻ {t.indexing} {Math.round(d.progress*100)}%</WChip>;
            return <WChip tone="danger">! {lang === 'ru' ? 'Ошибка' : 'Failed'}</WChip>;
          }},
          { label: lang === 'ru' ? 'Обновлён' : 'Updated', w: 100, cell: d =>
            <span style={{ fontFamily: 'var(--mono)', color: 'var(--muted)', fontSize: 11.5 }}>{d.updated}</span> },
          { label: '', w: 36, cell: () => <WIcon name="more" size={14} color="var(--muted)"/> },
        ]}
        rows={DOCS}
      />
    </>
  );
}

// ─── DOC UPLOAD (drag & drop) ────────────────────────────────────────────
function WDocUpload({ t, lang }) {
  const queue = [
    { name: 'Production_Runbook_2024.pdf', size: '3.2 MB', progress: 1.0, status: 'done' },
    { name: 'Onboarding_v2.docx', size: '420 KB', progress: 0.74, status: 'uploading' },
    { name: 'API_Reference.md', size: '180 KB', progress: 0.32, status: 'uploading' },
    { name: 'security_checklist.pdf', size: '1.4 MB', progress: 0, status: 'queued' },
  ];
  return (
    <>
      <PageHeader breadcrumb={[t.knowledgeBases, 'Engineering Wiki', t.addDocument]}
        title={lang === 'ru' ? 'Загрузка документов' : 'Upload documents'}
        subtitle={lang === 'ru' ? 'Поддерживаемые форматы: PDF · DOCX · MD · TXT' : 'Supported: PDF · DOCX · MD · TXT'}/>
      <div style={{ padding: 28 }}>
        <div style={{
          border: '2px dashed var(--border-strong)', borderRadius: 10,
          padding: '48px 24px', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 8,
          background: 'var(--surface)', textAlign: 'center',
        }}>
          <div style={{ width: 44, height: 44, borderRadius: 10,
            background: 'var(--accent-soft)', color: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <WIcon name="upload" size={22}/>
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)', marginTop: 4 }}>
            {lang === 'ru' ? 'Перетащите файлы сюда' : 'Drop files here'}
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>
            {lang === 'ru' ? 'или ' : 'or '}
            <span style={{ color: 'var(--accent)', fontWeight: 600, cursor: 'pointer' }}>
              {lang === 'ru' ? 'выберите файлы на диске' : 'browse from disk'}
            </span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)', marginTop: 4 }}>
            PDF · DOCX · MD · TXT · до 50 MB
          </div>
        </div>

        {/* Settings strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 20 }}>
          {[
            { l: lang === 'ru' ? 'Целевая база' : 'Target base', v: 'Engineering Wiki' },
            { l: lang === 'ru' ? 'Размер чанка' : 'Chunk size', v: '512 tokens', mono: true },
            { l: lang === 'ru' ? 'Перекрытие' : 'Overlap', v: '64 tokens', mono: true },
          ].map(f => (
            <div key={f.l} style={{ border: '1px solid var(--border)', borderRadius: 6, padding: '8px 12px' }}>
              <div style={{ fontSize: 10.5, color: 'var(--muted)', textTransform: 'uppercase',
                letterSpacing: 0.5, fontWeight: 500 }}>{f.l}</div>
              <div style={{ fontSize: 12.5, color: 'var(--fg)', marginTop: 2,
                fontFamily: f.mono ? 'var(--mono)' : 'inherit' }}>{f.v}</div>
            </div>
          ))}
        </div>

        {/* Queue */}
        <div style={{ marginTop: 24 }}>
          <h3 style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 600, color: 'var(--fg-2)',
            textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {lang === 'ru' ? 'Очередь загрузки' : 'Upload queue'} · {queue.length}
          </h3>
          <div style={{ border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
            {queue.map((q, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                borderBottom: i < queue.length - 1 ? '1px solid var(--border)' : 0,
              }}>
                <WDocBadge type={q.name.split('.').pop()}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ fontSize: 12.5, color: 'var(--fg)', fontWeight: 500 }}>{q.name}</span>
                    <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>{q.size}</span>
                  </div>
                  <div style={{ height: 3, background: 'var(--surface-2)', borderRadius: 999, marginTop: 5, overflow: 'hidden' }}>
                    <div style={{ width: `${q.progress * 100}%`, height: '100%',
                      background: q.status === 'done' ? '#16A34A' : 'var(--accent)' }}/>
                  </div>
                </div>
                <div style={{ width: 100, textAlign: 'right' }}>
                  {q.status === 'done' && <WChip tone="success">✓ {lang === 'ru' ? 'Готово' : 'Done'}</WChip>}
                  {q.status === 'uploading' && <span style={{ fontSize: 11.5, color: 'var(--muted)',
                    fontFamily: 'var(--mono)' }}>{Math.round(q.progress*100)}%</span>}
                  {q.status === 'queued' && <WChip tone="muted">{lang === 'ru' ? 'В очереди' : 'Queued'}</WChip>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── USERS ───────────────────────────────────────────────────────────────
function WUsers({ t, lang }) {
  return (
    <>
      <PageHeader title={t.usersTitle}
        subtitle={lang === 'ru' ? `${USERS.length} активных пользователей` : `${USERS.length} active users`}
        action={<><WBtn variant="secondary" icon="download">CSV</WBtn>
          <WBtn variant="primary" icon="plus">{t.inviteUser}</WBtn></>}/>
      <Toolbar>
        <WSearch placeholder={lang === 'ru' ? 'Поиск по имени или @' : 'Search name or @'}/>
        {[t.all, t.roleAdmin, t.roleMember, t.roleGuest].map((r, i) => (
          <button key={r} style={{
            height: 26, padding: '0 10px', borderRadius: 5, border: 0,
            background: i === 0 ? 'var(--surface-2)' : 'transparent',
            color: i === 0 ? 'var(--fg)' : 'var(--muted)',
            fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
          }}>{r}</button>
        ))}
        <div style={{ flex: 1 }}/>
        <WBtn variant="ghost" icon="filter">{lang === 'ru' ? 'Базы' : 'Bases'}</WBtn>
      </Toolbar>
      <WTable
        columns={[
          { label: '', w: 24, cell: () => <input type="checkbox" style={{ accentColor: 'var(--accent)' }}/> },
          { label: lang === 'ru' ? 'Пользователь' : 'User', cell: u => (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ position: 'relative' }}>
                <WAvatar user={u} size={26}/>
                {u.online && <span style={{ position: 'absolute', right: -1, bottom: -1,
                  width: 8, height: 8, borderRadius: '50%', background: '#22C55E',
                  border: '2px solid var(--bg)' }}/>}
              </div>
              <div>
                <div style={{ color: 'var(--fg)', fontWeight: 500 }}>{u.name}</div>
                <div style={{ color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: 11 }}>{u.handle}</div>
              </div>
            </div>
          )},
          { label: t.role, w: 120, cell: u =>
            <WChip tone={u.role === 'admin' ? 'accent' : u.role === 'guest' ? 'muted' : 'neutral'}>
              {u.role === 'admin' ? t.roleAdmin : u.role === 'guest' ? t.roleGuest : t.roleMember}
            </WChip>
          },
          { label: lang === 'ru' ? 'Доступ к БЗ' : 'Bases', w: 140, cell: u => (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {KBS.slice(0, Math.min(u.kbCount, 4)).map(k =>
                <WKbTile key={k.id} kb={k} size={16}/>
              )}
              {u.kbCount > 4 && <span style={{ fontSize: 11, color: 'var(--muted)',
                fontFamily: 'var(--mono)', marginLeft: 2 }}>+{u.kbCount - 4}</span>}
            </div>
          )},
          { label: t.lastActive, w: 110, cell: u => u.online
            ? <WChip tone="success">● {t.online}</WChip>
            : <span style={{ fontFamily: 'var(--mono)', color: 'var(--muted)', fontSize: 11.5 }}>{u.lastActive}</span>
          },
          { label: '', w: 36, cell: () => <WIcon name="more" size={14} color="var(--muted)"/> },
        ]}
        rows={USERS}
      />
    </>
  );
}

// ─── CODES ───────────────────────────────────────────────────────────────
function WCodes({ t, lang }) {
  return (
    <>
      <PageHeader title={t.accessCodes}
        subtitle={lang === 'ru' ? 'Многоразовые коды для приглашения пользователей' : 'Multi-use codes for inviting users'}
        action={<WBtn variant="primary" icon="plus">{t.generateCode}</WBtn>}/>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1,
        background: 'var(--border)', borderBottom: '1px solid var(--border)' }}>
        {[
          { l: t.active, v: '4', sub: lang === 'ru' ? 'действующих кода' : 'active codes' },
          { l: lang === 'ru' ? 'Использовано' : 'Used', v: '75', sub: lang === 'ru' ? 'из 164 возможных' : 'of 164 max' },
          { l: t.expired, v: '1', sub: lang === 'ru' ? 'требует архивации' : 'needs archive' },
        ].map(s => (
          <div key={s.l} style={{ background: 'var(--bg)', padding: '14px 20px' }}>
            <div style={{ fontSize: 10.5, color: 'var(--muted)', textTransform: 'uppercase',
              letterSpacing: 0.5, fontWeight: 500 }}>{s.l}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
              <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--fg)', letterSpacing: -0.4 }}>{s.v}</span>
              <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>{s.sub}</span>
            </div>
          </div>
        ))}
      </div>

      <Toolbar>
        <WSearch placeholder={lang === 'ru' ? 'Поиск кода' : 'Search code'}/>
        {[t.all, t.active, t.used, t.expired].map((r, i) => (
          <button key={r} style={{
            height: 26, padding: '0 10px', borderRadius: 5, border: 0,
            background: i === 0 ? 'var(--surface-2)' : 'transparent',
            color: i === 0 ? 'var(--fg)' : 'var(--muted)',
            fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
          }}>{r}</button>
        ))}
      </Toolbar>
      <WTable
        columns={[
          { label: lang === 'ru' ? 'Код' : 'Code', cell: c =>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 12.5, fontWeight: 600,
              color: 'var(--fg)' }}>{c.code}</span> },
          { label: t.role, w: 120, cell: c =>
            <WChip tone={c.role === 'guest' ? 'muted' : 'neutral'}>
              {c.role === 'guest' ? t.roleGuest : t.roleMember}
            </WChip> },
          { label: lang === 'ru' ? 'Базы' : 'Bases', w: 110, cell: c => (
            <div style={{ display: 'flex', gap: 3 }}>
              {c.kbs.map(id => {
                const k = KBS.find(x => x.id === id);
                return k && <WKbTile key={id} kb={k} size={16}/>;
              })}
            </div>
          )},
          { label: lang === 'ru' ? 'Использования' : 'Uses', w: 160, cell: c => {
            const pct = c.uses / c.max;
            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--fg-2)', minWidth: 44 }}>
                  {c.uses}/{c.max}
                </span>
                <div style={{ flex: 1, height: 4, background: 'var(--surface-2)',
                  borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ width: `${pct * 100}%`, height: '100%',
                    background: pct >= 1 ? 'var(--muted)' : 'var(--accent)' }}/>
                </div>
              </div>
            );
          }},
          { label: t.codeExpires, w: 100, cell: c =>
            <span style={{ fontFamily: 'var(--mono)', color: 'var(--muted)', fontSize: 11.5 }}>{c.expires}</span> },
          { label: t.codeStatus, w: 100, cell: c => (
            c.status === 'active' ? <WChip tone="success">● {t.active}</WChip> :
            c.status === 'used' ? <WChip tone="muted">✓ {t.used}</WChip> :
            <WChip tone="danger">✕ {t.expired}</WChip>
          )},
          { label: '', w: 70, cell: () => (
            <div style={{ display: 'flex', gap: 4 }}>
              <button style={{ width: 22, height: 22, border: 0, background: 'transparent',
                color: 'var(--muted)', cursor: 'pointer', borderRadius: 4 }}><WIcon name="copy" size={12}/></button>
              <button style={{ width: 22, height: 22, border: 0, background: 'transparent',
                color: 'var(--muted)', cursor: 'pointer', borderRadius: 4 }}><WIcon name="more" size={12}/></button>
            </div>
          )},
        ]}
        rows={CODES}
      />
    </>
  );
}

// ─── CODE GENERATOR (modal-as-canvas) ────────────────────────────────────
function WCodeGen({ t, lang }) {
  return (
    <div style={{
      width: '100%', height: '100%',
      background: 'rgba(0,0,0,0.4)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div style={{
        width: 480, background: 'var(--bg)', borderRadius: 10,
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)', overflow: 'hidden',
        border: '1px solid var(--border)',
      }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}>
              {lang === 'ru' ? 'Сгенерировать код доступа' : 'Generate access code'}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>
              {lang === 'ru' ? 'Многоразовый, с лимитом использований' : 'Multi-use with limit'}
            </div>
          </div>
          <button style={{ width: 24, height: 24, border: 0, background: 'transparent',
            color: 'var(--muted)', cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>

        <div style={{ padding: 18 }}>
          {/* generated code preview */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '14px 16px', background: 'var(--surface)',
            border: '1px dashed var(--border-strong)', borderRadius: 8,
          }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 700,
              color: 'var(--accent)', letterSpacing: 1, flex: 1 }}>ENG-K8M2-X4P9</span>
            <WBtn variant="ghost" icon="refresh"/>
            <WBtn variant="primary" icon="copy">{lang === 'ru' ? 'Копировать' : 'Copy'}</WBtn>
          </div>

          {[
            { l: lang === 'ru' ? 'Префикс кода' : 'Code prefix', f: <input defaultValue="ENG"
              style={{ height: 28, padding: '0 8px', borderRadius: 5, border: '1px solid var(--border)',
                background: 'var(--bg)', color: 'var(--fg)', fontFamily: 'var(--mono)', fontSize: 12.5,
                width: 100, outline: 'none' }}/> },
            { l: t.codeRole, f: (
              <div style={{ display: 'flex', gap: 4 }}>
                {[t.roleMember, t.roleGuest].map((r, i) => (
                  <button key={r} style={{
                    height: 28, padding: '0 12px', borderRadius: 5,
                    border: i === 0 ? '1px solid var(--accent)' : '1px solid var(--border)',
                    background: i === 0 ? 'var(--accent-soft)' : 'var(--bg)',
                    color: i === 0 ? 'var(--accent)' : 'var(--fg-2)',
                    fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
                  }}>{r}</button>
                ))}
              </div>
            )},
            { l: lang === 'ru' ? 'Лимит использований' : 'Usage limit', f: (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="number" defaultValue="10" style={{ height: 28, padding: '0 8px',
                  borderRadius: 5, border: '1px solid var(--border)', background: 'var(--bg)',
                  color: 'var(--fg)', fontFamily: 'var(--mono)', fontSize: 12.5, width: 80, outline: 'none' }}/>
                <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                  {lang === 'ru' ? 'или' : 'or'}
                </span>
                <button style={{ height: 28, padding: '0 10px', borderRadius: 5,
                  border: '1px solid var(--border)', background: 'var(--bg)',
                  color: 'var(--fg-2)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {lang === 'ru' ? 'Без ограничений' : 'Unlimited'}
                </button>
              </div>
            )},
            { l: lang === 'ru' ? 'Срок действия' : 'Valid until', f: (
              <input type="text" defaultValue="14.05.2026" style={{ height: 28, padding: '0 8px',
                borderRadius: 5, border: '1px solid var(--border)', background: 'var(--bg)',
                color: 'var(--fg)', fontFamily: 'var(--mono)', fontSize: 12.5, width: 140, outline: 'none' }}/>
            )},
          ].map(r => (
            <div key={r.l} style={{ display: 'grid', gridTemplateColumns: '160px 1fr',
              gap: 16, padding: '12px 0', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
              <label style={{ fontSize: 12.5, color: 'var(--fg-2)', fontWeight: 500 }}>{r.l}</label>
              {r.f}
            </div>
          ))}

          <div style={{ paddingTop: 14 }}>
            <label style={{ fontSize: 12.5, color: 'var(--fg-2)', fontWeight: 500,
              display: 'block', marginBottom: 8 }}>{t.codeBases}</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {KBS.slice(0, 4).map((kb, i) => (
                <label key={kb.id} style={{ display: 'flex', alignItems: 'center', gap: 8,
                  padding: '6px 10px', borderRadius: 5,
                  border: i < 2 ? '1px solid var(--accent)' : '1px solid var(--border)',
                  background: i < 2 ? 'var(--accent-soft)' : 'var(--bg)', cursor: 'pointer' }}>
                  <input type="checkbox" defaultChecked={i < 2}
                    style={{ accentColor: 'var(--accent)' }}/>
                  <WKbTile kb={kb} size={18}/>
                  <span style={{ fontSize: 12, color: 'var(--fg)', fontWeight: 500,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{kb.name}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, padding: '12px 18px',
          borderTop: '1px solid var(--border)', background: 'var(--surface)' }}>
          <div style={{ flex: 1 }}/>
          <WBtn variant="ghost">{t.cancel}</WBtn>
          <WBtn variant="primary">{t.generateCode}</WBtn>
        </div>
      </div>
    </div>
  );
}

// ─── LOGS ────────────────────────────────────────────────────────────────
function WLogs({ t, lang }) {
  const groups = [
    { day: t.today, items: ACTIVITY.slice(0, 5) },
    { day: t.yesterday, items: ACTIVITY.slice(5) },
  ];
  return (
    <>
      <PageHeader title={t.activityLog}
        subtitle={lang === 'ru' ? 'История всех событий в системе' : 'All events across the system'}
        action={<><WBtn variant="ghost" icon="filter">{lang === 'ru' ? 'Тип события' : 'Event type'}</WBtn>
          <WBtn variant="secondary" icon="download">{lang === 'ru' ? 'Экспорт' : 'Export'}</WBtn></>}/>
      <div style={{ padding: '0 28px' }}>
        {groups.map(g => (
          <div key={g.day} style={{ marginTop: 18 }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase',
              letterSpacing: 0.6, fontWeight: 600, marginBottom: 6 }}>{g.day}</div>
            <div style={{ border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
              {g.items.map((a, i) => {
                const u = a.user ? USERS.find(x => x.id === a.user) : null;
                const kb = a.kb ? KBS.find(x => x.id === a.kb) : null;
                return (
                  <div key={a.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '8px 12px', fontSize: 12.5,
                    borderBottom: i < g.items.length - 1 ? '1px solid var(--border)' : 0,
                  }}>
                    <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)', width: 60 }}>
                      {lang === 'ru' ? a.time : a.timeEn}
                    </span>
                    <WChip tone={a.type === 'doc_failed' ? 'danger' :
                      a.type === 'doc_indexed' ? 'success' :
                      a.type === 'access_granted' || a.type === 'role_changed' ? 'accent' : 'neutral'}>
                      {a.type.replace(/_/g, '.')}
                    </WChip>
                    {u && <><WAvatar user={u} size={18}/>
                      <span style={{ color: 'var(--fg)', fontWeight: 500 }}>{u.name}</span></>}
                    {a.target && <span style={{ color: 'var(--fg-2)' }}>· {a.target}</span>}
                    {kb && <span style={{ color: 'var(--muted)' }}>· {kb.name}</span>}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ─── PLAYGROUND ──────────────────────────────────────────────────────────
function WPlayground({ t, lang }) {
  const sources = [
    { kb: KBS[0], doc: 'Architecture_v3.pdf', score: 0.92, page: 14, snippet: 'Микросервисная архитектура с раздельным масштабированием по доменам…' },
    { kb: KBS[0], doc: 'API Reference.md', score: 0.87, page: 3, snippet: 'POST /v1/embed принимает массив текстов и возвращает векторы размерности 1536…' },
    { kb: KBS[1], doc: 'Product_Specs.pdf', score: 0.74, page: 22, snippet: 'Лимиты на запросы к векторной БД установлены на уровне 100 RPS…' },
  ];
  return (
    <>
      <PageHeader title="RAG Playground"
        subtitle={lang === 'ru' ? 'Тестируйте запросы по выбранным базам знаний' : 'Test queries against selected bases'}/>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px',
        height: 'calc(100% - 90px)', minHeight: 0 }}>
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16,
          borderRight: '1px solid var(--border)', overflow: 'auto' }}>
          <div style={{
            border: '1px solid var(--border)', borderRadius: 8, padding: 12,
            background: 'var(--surface)',
          }}>
            <div style={{ fontSize: 10.5, color: 'var(--muted)', textTransform: 'uppercase',
              letterSpacing: 0.5, fontWeight: 500, marginBottom: 4 }}>
              {lang === 'ru' ? 'Запрос' : 'Query'}
            </div>
            <div style={{ fontSize: 14, color: 'var(--fg)', lineHeight: 1.5 }}>
              Как развернуть приложение в Kubernetes с использованием GitOps?
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
              <WChip tone="muted">2 bases · 3 sources</WChip>
              <WChip tone="muted">k=8</WChip>
              <WChip tone="muted">temp 0.2</WChip>
              <div style={{ flex: 1 }}/>
              <WBtn variant="primary" icon="spark">{lang === 'ru' ? 'Запустить' : 'Run'}</WBtn>
            </div>
          </div>

          <div>
            <div style={{ fontSize: 10.5, color: 'var(--muted)', textTransform: 'uppercase',
              letterSpacing: 0.5, fontWeight: 600, marginBottom: 8 }}>
              {lang === 'ru' ? 'Ответ модели' : 'Model answer'} · 1.2s · 412 tok
            </div>
            <div style={{ fontSize: 13.5, color: 'var(--fg)', lineHeight: 1.65 }}>
              <p style={{ margin: '0 0 10px' }}>Для развёртывания приложения в Kubernetes по GitOps-подходу используется ArgoCD<sup style={{ color: 'var(--accent)', fontWeight: 600 }}>[1]</sup>, синхронизирующий состояние кластера с манифестами в репозитории.</p>
              <p style={{ margin: '0 0 10px' }}>Базовый процесс: пуш изменения в Git → ArgoCD обнаруживает дрейф → применяет новые манифесты в кластер<sup style={{ color: 'var(--accent)', fontWeight: 600 }}>[2]</sup>. Для production-окружения требуется явное одобрение sync-операции.</p>
              <p style={{ margin: 0 }}>Лимиты на ресурсы и реплики настраиваются через HelmRelease<sup style={{ color: 'var(--accent)', fontWeight: 600 }}>[3]</sup>, где задаются HPA-параметры.</p>
            </div>
          </div>

          <div>
            <div style={{ fontSize: 10.5, color: 'var(--muted)', textTransform: 'uppercase',
              letterSpacing: 0.5, fontWeight: 600, marginBottom: 8 }}>
              {lang === 'ru' ? 'Источники' : 'Sources'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {sources.map((s, i) => (
                <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 6, padding: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)',
                      fontFamily: 'var(--mono)', minWidth: 20 }}>[{i+1}]</span>
                    <WDocBadge type={s.doc.split('.').pop()}/>
                    <span style={{ fontSize: 12, color: 'var(--fg)', fontWeight: 500 }}>{s.doc}</span>
                    <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>p.{s.page}</span>
                    <div style={{ flex: 1 }}/>
                    <WKbTile kb={s.kb} size={14}/>
                    <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>{s.score}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6,
                    paddingLeft: 28, lineHeight: 1.5 }}>"{s.snippet}"</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right config panel */}
        <div style={{ padding: 20, background: 'var(--surface)', overflow: 'auto' }}>
          <div style={{ fontSize: 10.5, color: 'var(--muted)', textTransform: 'uppercase',
            letterSpacing: 0.5, fontWeight: 600, marginBottom: 10 }}>
            {lang === 'ru' ? 'Параметры' : 'Parameters'}
          </div>
          {[
            { l: 'Model', v: 'gpt-4-turbo', mono: true },
            { l: 'Temperature', v: '0.2', mono: true },
            { l: 'Top-K', v: '8', mono: true },
            { l: 'Max tokens', v: '1024', mono: true },
            { l: 'Reranker', v: 'cohere-v3', mono: true },
          ].map(r => (
            <div key={r.l} style={{ display: 'flex', justifyContent: 'space-between',
              padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 12, color: 'var(--fg-2)' }}>{r.l}</span>
              <span style={{ fontSize: 12, color: 'var(--fg)', fontFamily: r.mono ? 'var(--mono)' : 'inherit' }}>{r.v}</span>
            </div>
          ))}
          <div style={{ fontSize: 10.5, color: 'var(--muted)', textTransform: 'uppercase',
            letterSpacing: 0.5, fontWeight: 600, marginTop: 18, marginBottom: 8 }}>
            {lang === 'ru' ? 'Базы для запроса' : 'Query bases'}
          </div>
          {KBS.slice(0, 4).map((kb, i) => (
            <label key={kb.id} style={{ display: 'flex', alignItems: 'center', gap: 8,
              padding: '5px 0', cursor: 'pointer' }}>
              <input type="checkbox" defaultChecked={i < 2} style={{ accentColor: 'var(--accent)' }}/>
              <WKbTile kb={kb} size={16}/>
              <span style={{ fontSize: 12, color: 'var(--fg)', fontWeight: 500 }}>{kb.name}</span>
              <span style={{ flex: 1 }}/>
              <span style={{ fontSize: 10.5, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>{kb.docs} docs</span>
            </label>
          ))}
        </div>
      </div>
    </>
  );
}

// ─── SETTINGS ────────────────────────────────────────────────────────────
function WSettings({ t, lang }) {
  const sections = [
    { title: lang === 'ru' ? 'Общие' : 'General', fields: [
      { l: lang === 'ru' ? 'Название организации' : 'Organisation', v: 'Acme Inc.' },
      { l: lang === 'ru' ? 'Поддомен' : 'Subdomain', v: 'acme.rag.app', mono: true },
      { l: lang === 'ru' ? 'Часовой пояс' : 'Timezone', v: 'Europe/Moscow (UTC+3)' },
    ]},
    { title: lang === 'ru' ? 'RAG / Модель' : 'RAG / Model', fields: [
      { l: lang === 'ru' ? 'Embedding модель' : 'Embedding model', v: 'text-embedding-3-large', mono: true },
      { l: lang === 'ru' ? 'LLM' : 'LLM', v: 'gpt-4-turbo', mono: true },
      { l: lang === 'ru' ? 'Размер чанка по умолчанию' : 'Default chunk size', v: '512 tokens', mono: true },
      { l: lang === 'ru' ? 'Перекрытие чанков' : 'Chunk overlap', v: '64 tokens', mono: true },
    ]},
    { title: lang === 'ru' ? 'Telegram Bot' : 'Telegram Bot', fields: [
      { l: lang === 'ru' ? 'Имя бота' : 'Bot name', v: '@acme_rag_bot', mono: true },
      { l: 'Token', v: '••••••••••8af3', mono: true },
      { l: 'Webhook', v: 'https://acme.rag.app/webhook/tg', mono: true },
    ]},
  ];
  return (
    <>
      <PageHeader title={t.settings}
        subtitle={lang === 'ru' ? 'Настройки приложения и модели' : 'Application and model settings'}
        action={<WBtn variant="primary">{t.save}</WBtn>}/>
      <div style={{ padding: '0 28px', maxWidth: 880 }}>
        {sections.map((s, i) => (
          <div key={s.title} style={{ marginTop: i === 0 ? 20 : 28 }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 600,
              color: 'var(--fg-2)', textTransform: 'uppercase', letterSpacing: 0.6 }}>{s.title}</h3>
            <div style={{ border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
              {s.fields.map((f, j) => (
                <div key={f.l} style={{
                  display: 'grid', gridTemplateColumns: '240px 1fr',
                  padding: '10px 14px', alignItems: 'center', gap: 16,
                  borderBottom: j < s.fields.length - 1 ? '1px solid var(--border)' : 0,
                }}>
                  <label style={{ fontSize: 12.5, color: 'var(--fg-2)' }}>{f.l}</label>
                  <input defaultValue={f.v} style={{
                    height: 28, padding: '0 10px', borderRadius: 5,
                    border: '1px solid var(--border)', background: 'var(--bg)',
                    color: 'var(--fg)', fontFamily: f.mono ? 'var(--mono)' : 'inherit',
                    fontSize: 12.5, outline: 'none', width: '100%', maxWidth: 360,
                  }}/>
                </div>
              ))}
            </div>
          </div>
        ))}
        <div style={{ height: 24 }}/>
      </div>
    </>
  );
}

Object.assign(window, {
  WDashboard, WKbList, WKbDetail, WDocUpload,
  WUsers, WCodes, WCodeGen, WLogs, WPlayground, WSettings,
});
