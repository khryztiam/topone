import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { useAuth } from '@/context/AuthContext';
import styles from '@/styles/admin/ResultsPage.module.css';

// ── Helpers ───────────────────────────────────────────────────────────────────

function initials(nombre) {
  if (!nombre) return '?';
  const parts = nombre.trim().split(/\s+/);
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : nombre.slice(0, 2).toUpperCase();
}

function rankEmoji(rank) {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return `${rank}.`;
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-MX', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ── Avatar ─────────────────────────────────────────────────────────────────────
function Avatar({ photo_url, nombre, size = 36 }) {
  const [err, setErr] = useState(false);
  const style = { width: size, height: size, fontSize: size * 0.35 };
  if (photo_url && !err) {
    return (
      <img src={photo_url} alt={nombre}
        style={{ ...style, borderRadius: '50%', objectFit: 'cover' }}
        onError={() => setErr(true)} />
    );
  }
  return (
    <div className={styles.initials} style={style}>
      {initials(nombre)}
    </div>
  );
}

// ── Import Modal ───────────────────────────────────────────────────────────────
function ImportModal({ onClose, onImported }) {
  const [file, setFile]             = useState(null);
  const [deactivate, setDeactivate] = useState(false);
  const [uploading, setUploading]   = useState(false);
  const [result, setResult]         = useState(null);
  const [dragOver, setDragOver]     = useState(false);

  function handleFile(f) {
    if (!f) return;
    const ext = f.name.split('.').pop().toLowerCase();
    if (ext !== 'xlsx' && ext !== 'xls') {
      setResult({ type: 'error', message: 'Solo se aceptan archivos .xlsx o .xls' });
      return;
    }
    setFile(f);
    setResult(null);
  }

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('deactivate_missing', String(deactivate));
      const res  = await fetch('/api/admin/import-employees', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) {
        setResult({ type: 'error', message: data.error, warnings: data.warnings });
      } else {
        setResult({
          type: 'success',
          message: `✅ ${data.imported} empleado(s) importados.${data.deactivated ? ` ${data.deactivated} desactivados.` : ''}`,
          warnings: data.warnings,
        });
        onImported();
      }
    } catch {
      setResult({ type: 'error', message: 'Error de red al importar.' });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2>📂 Importar Maestro de Empleados</h2>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div className={styles.modalBody}>
          <p className={styles.importDesc}>
            Sube el archivo Excel del Listado Maestro de personal. Se realizará un <strong>upsert</strong> por
            SAPID — empleados existentes se actualizan, nuevos se crean.
          </p>
          <div className={styles.importCols}>
            <strong>Columnas requeridas en la hoja:</strong>
            <ul>
              <li><strong>SAPID</strong> — ID SAP del empleado</li>
              <li><strong>NOMBRE</strong> — Nombre completo</li>
              <li><strong>COD_LINEA</strong> — Código numérico de línea</li>
              <li><strong>LINEA</strong> — Nombre de la línea (opcional)</li>
              <li><strong>GRUPO</strong> — Grupo dentro de la línea (opcional)</li>
            </ul>
          </div>
          <div
            className={`${styles.dropZone} ${dragOver ? styles.dropZoneActive : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
          >
            <div className={styles.dropZoneIcon}>📊</div>
            <p className={styles.dropZoneText}>
              {file ? '' : 'Arrastra el archivo aquí o haz clic para seleccionar'}
            </p>
            {file && <p className={styles.dropZoneFile}>📎 {file.name}</p>}
            <input type="file" accept=".xlsx,.xls" className={styles.fileInput}
              onChange={(e) => handleFile(e.target.files[0])} />
          </div>
          <label className={styles.checkRow}>
            <input type="checkbox" checked={deactivate} onChange={(e) => setDeactivate(e.target.checked)} />
            <span>
              Desactivar empleados que <strong>no aparezcan</strong> en el archivo
              {deactivate && (
                <span className={styles.checkWarning}>
                  <br />⚠️ Los empleados que no estén en el archivo serán marcados como inactivos.
                </span>
              )}
            </span>
          </label>
          {result && (
            <div className={`${styles.importResult} ${result.type === 'success' ? styles.importSuccess : styles.importError}`}>
              {result.message}
              {result.warnings?.length > 0 && (
                <div className={styles.importWarnings}>
                  {result.warnings.slice(0, 5).map((w, i) => <div key={i}>• {w}</div>)}
                  {result.warnings.length > 5 && <div>…y {result.warnings.length - 5} más</div>}
                </div>
              )}
            </div>
          )}
          <div className={styles.modalActions}>
            <button className={styles.btnCancel} onClick={onClose}>Cancelar</button>
            <button className={styles.btnSave} onClick={handleUpload} disabled={!file || uploading}>
              {uploading ? 'Importando...' : 'Importar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Reset Modal ────────────────────────────────────────────────────────────────
const CONFIRM_WORD = 'CONFIRMAR';

function ResetModal({ session, allPeriods, allLineas, initialPeriod, initialLinea, onClose, onReset }) {
  const [period, setPeriod]     = useState(initialPeriod || '');
  const [codLinea, setCodLinea] = useState(initialLinea  || '');
  const [reason, setReason]     = useState('');
  const [preview, setPreview]   = useState(null);
  const [loading, setLoading]   = useState(false);
  const [confirm, setConfirm]   = useState('');
  const [step, setStep]         = useState(1);
  const [result, setResult]     = useState(null);

  async function handlePreview() {
    if (!period) return;
    setLoading(true);
    setPreview(null);
    try {
      const params = new URLSearchParams({ period });
      if (codLinea) params.set('cod_linea', codLinea);
      const res  = await fetch(`/api/admin/results?${params.toString()}`);
      const data = await res.json();
      const totalVotes = (data.lines || []).reduce((s, l) => s + l.total_votes, 0);
      setPreview({ count: totalVotes });
      setStep(2);
    } catch {
      setPreview({ count: 0 });
      setStep(2);
    } finally {
      setLoading(false);
    }
  }

  async function handleReset() {
    if (confirm !== CONFIRM_WORD) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/reset-results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ period, cod_linea: codLinea ? parseInt(codLinea, 10) : null, reason }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ type: 'error', message: data.error });
      } else {
        setResult({ type: 'success', deleted: data.deleted });
        setStep(3);
        onReset();
      }
    } catch {
      setResult({ type: 'error', message: 'Error de red.' });
    } finally {
      setLoading(false);
    }
  }

  const lineaNombre = allLineas.find((l) => String(l.cod_linea) === String(codLinea))?.nombre;

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`${styles.modal} ${styles.resetModal}`}>
        <div className={styles.modalHeader}>
          <h2>🗑️ Reset de Resultados</h2>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.stepRow}>
            <span className={`${styles.stepDot} ${step >= 1 ? styles.stepDotActive : ''}`}>1</span>
            <span className={styles.stepLine} />
            <span className={`${styles.stepDot} ${step >= 2 ? styles.stepDotActive : ''}`}>2</span>
            <span className={styles.stepLine} />
            <span className={`${styles.stepDot} ${step >= 3 ? styles.stepDotActive : ''}`}>3</span>
          </div>
          <div className={styles.stepLabels}>
            <span className={step >= 1 ? styles.stepLabelActive : ''}>Filtros</span>
            <span className={step >= 2 ? styles.stepLabelActive : ''}>Confirmar</span>
            <span className={step >= 3 ? styles.stepLabelActive : ''}>Listo</span>
          </div>

          {step === 1 && (
            <>
              <div className={styles.resetAlert}>
                ⚠️ Esta acción es <strong>irreversible</strong>. Los registros de votación eliminados no se pueden recuperar.
              </div>
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Período *</label>
                <select className={styles.filterSelect} value={period}
                  onChange={(e) => { setPeriod(e.target.value); setPreview(null); }}>
                  <option value="">— seleccionar —</option>
                  {allPeriods.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Línea (opcional)</label>
                <select className={styles.filterSelect} value={codLinea}
                  onChange={(e) => { setCodLinea(e.target.value); setPreview(null); }}>
                  <option value="">Todas las líneas</option>
                  {allLineas.map((l) => (
                    <option key={l.cod_linea} value={l.cod_linea}>{l.nombre}</option>
                  ))}
                </select>
              </div>
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Motivo (opcional)</label>
                <input className={styles.filterInput}
                  placeholder="ej. datos de prueba, período incorrecto…"
                  value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} />
              </div>
              <div className={styles.modalActions}>
                <button className={styles.btnCancel} onClick={onClose}>Cancelar</button>
                <button className={styles.btnDanger} onClick={handlePreview} disabled={!period || loading}>
                  {loading ? 'Consultando…' : 'Continuar →'}
                </button>
              </div>
            </>
          )}

          {step === 2 && preview && (
            <>
              <div className={styles.previewBox}>
                <p className={styles.previewTitle}>Registros a eliminar</p>
                <p className={styles.previewCount}>{preview.count}</p>
                <p className={styles.previewSub}>
                  votos en <strong>{period}</strong>
                  {lineaNombre ? ` · línea ${lineaNombre}` : ' · todas las líneas'}
                </p>
              </div>
              {preview.count > 0 ? (
                <>
                  <p className={styles.confirmInstruction}>
                    Para confirmar, escribe <strong>{CONFIRM_WORD}</strong> a continuación:
                  </p>
                  <input
                    className={`${styles.filterInput} ${confirm && confirm !== CONFIRM_WORD ? styles.filterInputError : ''}`}
                    placeholder={CONFIRM_WORD}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value.toUpperCase())}
                    autoFocus
                  />
                  {result?.type === 'error' && (
                    <div className={`${styles.importResult} ${styles.importError}`}>{result.message}</div>
                  )}
                  <div className={styles.modalActions}>
                    <button className={styles.btnCancel} onClick={() => { setStep(1); setConfirm(''); }}>← Atrás</button>
                    <button className={styles.btnDanger} onClick={handleReset}
                      disabled={confirm !== CONFIRM_WORD || loading}>
                      {loading ? 'Eliminando…' : '🗑️ Eliminar ahora'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p style={{ textAlign: 'center', color: 'var(--color-text-soft)', fontSize: '0.9rem' }}>
                    No se encontraron registros con estos filtros.
                  </p>
                  <div className={styles.modalActions}>
                    <button className={styles.btnCancel} onClick={() => setStep(1)}>← Atrás</button>
                  </div>
                </>
              )}
            </>
          )}

          {step === 3 && result?.type === 'success' && (
            <div className={styles.doneBox}>
              <div className={styles.doneIcon}>✅</div>
              <p className={styles.doneTitle}>{result.deleted} registros eliminados</p>
              <p className={styles.doneSub}>La acción fue registrada en el log de auditoría.</p>
              <button className={styles.btnSave} onClick={onClose}>Cerrar</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Audit Log ─────────────────────────────────────────────────────────────────
function AuditLog({ session }) {
  const [records, setRecords] = useState([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage]       = useState(1);
  const limit = 10;

  const load = useCallback(async (p) => {
    setLoading(true);
    try {
      const res  = await fetch(`/api/admin/reset-audit?page=${p}&limit=${limit}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      const data = await res.json();
      setRecords(data.records || []);
      setTotal(data.total   || 0);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => { load(page); }, [page, load]);
  const totalPages = Math.ceil(total / limit);

  return (
    <div className={styles.auditSection}>
      <h3 className={styles.auditTitle}>📋 Log de Auditoría — Resets</h3>
      {loading && <p className={styles.loading}>Cargando…</p>}
      {!loading && records.length === 0 && (
        <p className={styles.auditEmpty}>No hay resets registrados todavía.</p>
      )}
      {!loading && records.length > 0 && (
        <>
          <div className={styles.auditTable}>
            <div className={styles.auditHead}>
              <span>Fecha</span>
              <span>Usuario</span>
              <span>Período</span>
              <span>Línea</span>
              <span>Eliminados</span>
              <span>Motivo</span>
            </div>
            {records.map((r) => (
              <div key={r.id} className={styles.auditRow}>
                <span className={styles.auditDate}>{formatDate(r.created_at)}</span>
                <div>
                  <div className={styles.auditUser}>{r.reset_by_name || '—'}</div>
                  <div className={styles.auditEmail}>{r.reset_by_email}</div>
                </div>
                <span className={styles.auditBadge}>{r.period || 'Todos'}</span>
                <span className={styles.muted}>{r.linea_nombre || <em>Todas</em>}</span>
                <span className={styles.auditCount}>{r.records_deleted}</span>
                <span className={styles.auditReason}>{r.reason || <em className={styles.muted}>—</em>}</span>
              </div>
            ))}
          </div>
          {totalPages > 1 && (
            <div className={styles.auditPager}>
              <button className={styles.pagerBtn} disabled={page <= 1} onClick={() => setPage(page - 1)}>‹ Ant</button>
              <span>Página {page} de {totalPages} · {total} registros</span>
              <button className={styles.pagerBtn} disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Sig ›</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Lines Overview Cards ───────────────────────────────────────────────────────
function LineOverviewCards({ allLines, resultLines }) {
  const voteMap = {};
  (resultLines || []).forEach((l) => { voteMap[l.cod_linea] = l; });

  return (
    <div className={styles.lineOverviewGrid}>
      {allLines.map((line) => {
        const vd  = voteMap[line.cod_linea];
        const pct = vd?.participation_pct ?? 0;
        return (
          <div key={line.cod_linea}
            className={`${styles.lineOvercard} ${vd ? styles.lineOvercardActive : ''}`}>
            <div className={styles.lineOverHeader}>
              <span className={styles.lineOverCode}>#{line.cod_linea}</span>
              {vd && (
                <span className={`${styles.partPill} ${pct >= 50 ? styles.partPillHigh : ''}`}>{pct}%</span>
              )}
            </div>
            <p className={styles.lineOverName}>{line.nombre}</p>
            <div className={styles.lineOverStats}>
              <div className={styles.lineOverStat}>
                <strong>{line.employee_count}</strong>
                <em>empleados</em>
              </div>
              {vd ? (
                <div className={styles.lineOverStat}>
                  <strong>{vd.total_votes}</strong>
                  <em>votos</em>
                </div>
              ) : (
                <div className={`${styles.lineOverStat} ${styles.muted}`}><em>sin votos</em></div>
              )}
            </div>
            {vd && (
              <div className={styles.barTrack} style={{ marginTop: '0.5rem' }}>
                <div
                  className={`${styles.barFill} ${pct >= 50 ? styles.barFillGreen : ''}`}
                  style={{ width: `${Math.max(pct, 4)}%` }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Top Results Table ─────────────────────────────────────────────────────────
// General view: top-1 per line — Filtered view: top-3 for the selected line
function TopResultsTable({ data, isFiltered }) {
  if (!data || data.lines.length === 0) {
    return (
      <div className={styles.empty}>
        Sin votos para el período <strong>{data?.period}</strong>.
      </div>
    );
  }

  // ── General: one row per line showing its top-1 ─────────────────────────
  if (!isFiltered) {
    return (
      <div className={styles.topTable}>
        <div className={styles.topTableHead}>
          <span>Línea</span>
          <span>Líder del período</span>
          <span>Votos</span>
          <span>% del total</span>
          <span>Participación línea</span>
        </div>
        {data.lines.map((line) => {
          const top = line.nominees[0];
          if (!top) return null;
          return (
            <div key={line.cod_linea} className={styles.topTableRow}>
              <div>
                <span className={styles.lineBadge}>#{line.cod_linea}</span>
                <span className={styles.topLineLabel}>{line.linea}</span>
              </div>
              <div className={styles.topLeaderCell}>
                <Avatar photo_url={top.photo_url} nombre={top.nombre} size={34} />
                <span className={styles.topLeaderName}>{top.nombre}</span>
              </div>
              <span className={styles.topVotes}>{top.votes}</span>
              <span className={styles.topPct}>{top.pct}%</span>
              <div className={styles.topBarCell}>
                <div className={styles.barTrack}>
                  <div
                    className={`${styles.barFill} ${line.participation_pct >= 50 ? styles.barFillGreen : ''}`}
                    style={{ width: `${Math.max(line.participation_pct, 3)}%` }}
                  />
                </div>
                <span className={`${styles.partPill} ${line.participation_pct >= 50 ? styles.partPillHigh : ''}`}>
                  {line.participation_pct}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // ── Filtered: top-3 for the selected line ────────────────────────────────
  const line = data.lines[0];
  const top3 = line?.nominees.slice(0, 3) || [];

  return (
    <div className={styles.top3Wrapper}>
      <div className={styles.top3Header}>
        <span className={styles.lineBadge}>#{line.cod_linea}</span>
        <span className={styles.top3LineName}>{line.linea}</span>
        <span className={`${styles.partPill} ${line.participation_pct >= 50 ? styles.partPillHigh : ''}`}>
          {line.participation_pct}% participación
        </span>
      </div>
      <div className={styles.top3List}>
        {top3.map((n, i) => (
          <div key={n.sapid} className={`${styles.top3Row} ${i === 0 ? styles.top3Gold : ''}`}>
            <span className={styles.top3Rank}>{rankEmoji(i + 1)}</span>
            <Avatar photo_url={n.photo_url} nombre={n.nombre} size={48} />
            <div className={styles.top3Info}>
              <span className={styles.top3Name}>{n.nombre}</span>
              <div className={styles.barTrack}>
                <div className={`${styles.barFill} ${i === 0 ? styles.barFillGold : ''}`}
                  style={{ width: `${n.pct}%` }} />
              </div>
            </div>
            <div className={styles.top3Votes}>
              <span className={styles.top3VoteNum}>{n.votes}</span>
              <span className={styles.top3VoteLabel}>votos · {n.pct}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ResultsPage() {
  const { user, session }       = useAuth();
  const [data, setData]         = useState(null);
  const [allLines, setAllLines] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [period, setPeriod]     = useState('');
  const [codLinea, setCodLinea] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [resetOpen, setResetOpen]   = useState(false);
  const [auditOpen, setAuditOpen]   = useState(false);

  const canImport = ['admin', 'suprrhh'].includes(user?.role);
  const canReset  = user?.role === 'admin';
  const isFiltered = !!codLinea;

  useEffect(() => {
    fetch('/api/admin/lines')
      .then((r) => r.json())
      .then(({ lines }) => setAllLines((lines || []).sort((a, b) => a.nombre.localeCompare(b.nombre))));
  }, []);

  const fetchResults = useCallback(async (p, l) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (p) params.set('period', p);
      if (l) params.set('cod_linea', l);
      const res  = await fetch(`/api/admin/results?${params.toString()}`);
      const json = await res.json();
      setData(json);
      if (!p && json.period) setPeriod(json.period);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchResults(period, codLinea); }, [period, codLinea, fetchResults]);

  const exportUrl      = `/api/admin/export-results?period=${period}${codLinea ? `&cod_linea=${codLinea}` : ''}`;
  const totalVotes     = (data?.lines || []).reduce((s, l) => s + l.total_votes, 0);
  const totalEmp       = allLines.reduce((s, l) => s + l.employee_count, 0);
  const globalPct      = totalEmp > 0 ? Math.round((totalVotes / totalEmp) * 100) : 0;
  const linesWithVotes = (data?.lines || []).length;

  return (
    <AdminLayout title="Resultados" requiredRoles={['admin', 'suprrhh']}>

      {/* ── Top bar ── */}
      <div className={styles.topBar}>
        <div className={styles.filtersRow}>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Período</label>
            <select className={styles.filterSelect} value={period}
              onChange={(e) => setPeriod(e.target.value)}>
              {(data?.periods || (period ? [period] : [])).map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Línea</label>
            <select className={styles.filterSelect} value={codLinea}
              onChange={(e) => setCodLinea(e.target.value)}>
              <option value="">Todas las líneas</option>
              {allLines.map((l) => (
                <option key={l.cod_linea} value={l.cod_linea}>{l.nombre}</option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.actions}>
          {canImport && (
            <button className={styles.btnImport} onClick={() => setImportOpen(true)}>
              📂 Importar Maestro
            </button>
          )}
          <a
            className={`${styles.btnExport} ${totalVotes === 0 ? styles.btnExportDisabled : ''}`}
            href={totalVotes > 0 ? exportUrl : undefined}
            download={totalVotes > 0 ? true : undefined}
            title={totalVotes === 0 ? 'Sin votos en este período' : 'Exportar a Excel'}
          >
            📥 Exportar Excel
          </a>
          {canReset && (
            <button className={styles.btnReset} onClick={() => setResetOpen(true)}>
              🗑️ Reset
            </button>
          )}
        </div>
      </div>

      {/* ── Summary cards ── */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statIcon}>🗳️</span>
          <span className={styles.statLabel}>Votos emitidos</span>
          <span className={`${styles.statValue} ${styles.blue}`}>{totalVotes}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statIcon}>👥</span>
          <span className={styles.statLabel}>Total empleados</span>
          <span className={`${styles.statValue} ${styles.green}`}>{totalEmp}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statIcon}>📊</span>
          <span className={styles.statLabel}>Participación global</span>
          <span className={`${styles.statValue} ${styles.purple}`}>{globalPct}%</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statIcon}>🏭</span>
          <span className={styles.statLabel}>Líneas con votos</span>
          <span className={`${styles.statValue} ${styles.orange}`}>{linesWithVotes}</span>
        </div>
      </div>

      {/* ── Top results table ── */}
      <section className={styles.topSection}>
        <h2 className={styles.sectionTitle}>
          {isFiltered ? '🏅 Top 3 de la línea' : '🏆 Top 1 por línea'}
        </h2>
        {loading
          ? <p className={styles.loading}>Cargando resultados...</p>
          : <TopResultsTable data={data} isFiltered={isFiltered} />
        }
      </section>

      {/* ── Audit log (admin only, collapsible, at the bottom) ── */}
      {canReset && (
        <div className={styles.auditToggleRow}>
          <button
            className={`${styles.auditToggleBtn} ${auditOpen ? styles.auditToggleBtnOpen : ''}`}
            onClick={() => setAuditOpen((v) => !v)}
          >
            {auditOpen ? '▲' : '▼'} Log de auditoría de resets
          </button>
        </div>
      )}
      {auditOpen && canReset && <AuditLog session={session} />}

      {/* ── Modals ── */}
      {importOpen && (
        <ImportModal onClose={() => setImportOpen(false)} onImported={() => fetchResults(period, codLinea)} />
      )}
      {resetOpen && (
        <ResetModal
          session={session}
          allPeriods={data?.periods || (period ? [period] : [])}
          allLineas={allLines}
          initialPeriod={period}
          initialLinea={codLinea}
          onClose={() => setResetOpen(false)}
          onReset={() => fetchResults(period, codLinea)}
        />
      )}
    </AdminLayout>
  );
}
