import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '@/components/AdminLayout';
import styles from '@/styles/admin/Dashboard.module.css';

// ── Helpers ──────────────────────────────────────────────────────────────────

function initials(nombre) {
  if (!nombre) return '?';
  const parts = nombre.trim().split(/\s+/);
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : nombre.slice(0, 2).toUpperCase();
}

// ── Sub-components ───────────────────────────────────────────────────────────

function Avatar({ photo_url, nombre }) {
  const [imgError, setImgError] = useState(false);
  if (photo_url && !imgError) {
    return (
      <img src={photo_url} alt={nombre} className={styles.leaderAvatar}
        onError={() => setImgError(true)} />
    );
  }
  return <div className={styles.leaderInitials}>{initials(nombre)}</div>;
}

function DonutChart({ pct, votesCast, totalEmployees, period }) {
  const r = 70, cx = 80, cy = 80;
  const circumference = 2 * Math.PI * r;
  const dash = (Math.max(0, Math.min(100, pct)) / 100) * circumference;

  return (
    <div className={styles.donutWrapper}>
      <div className={styles.donutRelative}>
        <svg width="160" height="160" className={styles.donutSvg}>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e5e7eb" strokeWidth="18" />
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--color-primary)"
            strokeWidth="18" strokeDasharray={`${dash} ${circumference}`}
            strokeLinecap="round" transform={`rotate(-90 ${cx} ${cy})`} />
        </svg>
        <div className={styles.donutCenter}>
          <span className={styles.donutPct}>{pct}%</span>
        </div>
      </div>
      <p className={styles.donutDetail}>{votesCast} de {totalEmployees} empleados han votado</p>
      <p className={styles.donutPeriod}>Período: {period}</p>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod]   = useState('');

  const fetchDashboard = useCallback(async (p) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (p) params.set('period', p);
      const res  = await fetch(`/api/admin/dashboard?${params.toString()}`);
      const json = await res.json();
      setData(json);
      if (!p && json.period) setPeriod(json.period);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDashboard(period); }, [period, fetchDashboard]);

  const exportUrl = `/api/admin/export-results?period=${period}`;
  const hasVotes  = data?.summary?.votes_cast > 0;

  return (
    <AdminLayout title="Dashboard">
      {/* ── Filters + export ── */}
      <div className={styles.topBar}>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Período</label>
          <select className={styles.filterSelect} value={period}
            onChange={(e) => setPeriod(e.target.value)}>
            {(data?.periods || (period ? [period] : [])).map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <a
          className={`${styles.btnExport} ${!hasVotes ? styles.btnExportDisabled : ''}`}
          href={hasVotes ? exportUrl : undefined}
          download={hasVotes ? true : undefined}
          title={!hasVotes ? 'Sin votos en este período' : 'Exportar resultados a Excel'}
        >
          📥 Exportar Excel
        </a>
      </div>

      {loading && <p className={styles.loading}>Cargando...</p>}

      {!loading && data && (
        <>
          {/* ── Summary cards (2): votes + employees ── */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <span className={styles.statIcon}>🗳️</span>
              <span className={styles.statLabel}>Votos emitidos</span>
              <span className={`${styles.statValue} ${styles.blue}`}>{data.summary.votes_cast}</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statIcon}>👥</span>
              <span className={styles.statLabel}>Total empleados</span>
              <span className={`${styles.statValue} ${styles.green}`}>{data.summary.total_employees}</span>
            </div>
          </div>

          {/* ── Main section ── */}
          <div className={styles.mainSection}>
            {/* Left: donut */}
            <div className={styles.panel}>
              <p className={styles.panelTitle}>📈 Participación general</p>
              <DonutChart
                pct={data.summary.participation_pct}
                votesCast={data.summary.votes_cast}
                totalEmployees={data.summary.total_employees}
                period={data.period}
              />
              {data.donut.every((l) => l.votes === 0) && (
                <p className={styles.empty}>Sin votos en este período.</p>
              )}
            </div>

            {/* Right: all lines card grid — leader + participation merged */}
            <div className={styles.panel}>
              <p className={styles.panelTitle}>📊 Vista por líneas — {data.period}</p>
              {data.donut.length === 0 ? (
                <p className={styles.empty}>Sin líneas configuradas.</p>
              ) : (
                <div className={styles.lineCardGrid}>
                  {data.donut.map((line) => {
                    const leader = data.leaders.find((l) => l.cod_linea === line.cod_linea);
                    const pct = line.pct;
                    return (
                      <div
                        key={line.cod_linea}
                        className={`${styles.lineCard} ${leader ? styles.lineCardActive : ''}`}
                      >
                        <div className={styles.lineCardHeader}>
                          <span className={styles.lineCardCode}>#{line.cod_linea}</span>
                          {leader && (
                            <span className={`${styles.partPill} ${pct >= 50 ? styles.partPillHigh : ''}`}>
                              {pct}%
                            </span>
                          )}
                        </div>
                        <p className={styles.lineCardName}>{line.linea}</p>
                        <div className={styles.lineCardStats}>
                          <div className={styles.lineCardStat}>
                            <strong>{line.employees}</strong>
                            <em>empleados</em>
                          </div>
                          {leader ? (
                            <div className={styles.lineCardStat}>
                              <strong>{line.votes}</strong>
                              <em>votos</em>
                            </div>
                          ) : (
                            <div className={`${styles.lineCardStat} ${styles.muted}`}><em>sin votos</em></div>
                          )}
                        </div>
                        {leader && (
                          <>
                            <div className={styles.lineCardLeader}>
                              <Avatar photo_url={leader.photo_url} nombre={leader.nombre} />
                              <span className={styles.lineCardLeaderName}>{leader.nombre}</span>
                            </div>
                            <div className={styles.barTrack}>
                              <div
                                className={`${styles.barFill} ${pct >= 50 ? styles.barFillGreen : ''}`}
                                style={{ width: `${Math.max(pct, 4)}%` }}
                              />
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  );
}
