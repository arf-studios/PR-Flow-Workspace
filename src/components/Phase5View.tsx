import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import { Archive, FileSpreadsheet, RefreshCw } from 'lucide-react';
import { computeKpiAchievement, isContentUnderKpiOrCrisis } from '../lib/prflowLogic';
import type { ContentItem } from '../types/prflow';
import { AUDIT_CAUSES, OPTIMIZATION_ACTIONS } from '../types/prflow';

interface Phase5ViewProps {
  filteredContents: ContentItem[];
  isDark: boolean;
  onExportCSV: () => void;
  onUpdateAuditCause: (contentId: string, cause: string) => void;
  onTriggerOptimization: (contentId: string, actionName: string) => void;
  onArchiveLearning: (contentId: string) => void;
  onCloneToNextCycle: (contentId: string) => void;
}

export const Phase5View: React.FC<Phase5ViewProps> = ({
  filteredContents,
  isDark,
  onExportCSV,
  onUpdateAuditCause,
  onTriggerOptimization,
  onArchiveLearning,
  onCloneToNextCycle,
}) => {
  const pesoCanvasRef = useRef<HTMLCanvasElement>(null);
  const kpiCanvasRef = useRef<HTMLCanvasElement>(null);
  const sentCanvasRef = useRef<HTMLCanvasElement>(null);

  const evalItems = filteredContents.filter(
    (i) => i.phase === 5 || i.distribution.published
  );

  useEffect(() => {
    const textColor = isDark ? '#cbd5e1' : '#475569';
    const gridColor = isDark ? 'rgba(148,163,184,0.14)' : 'rgba(148,163,184,0.22)';
    const charts: Chart[] = [];

    if (pesoCanvasRef.current) {
      const counts = (['Paid', 'Earned', 'Shared', 'Owned'] as const).map(
        (p) => filteredContents.filter((i) => i.research.peso === p).length
      );
      charts.push(
        new Chart(pesoCanvasRef.current, {
          type: 'doughnut',
          data: {
            labels: ['Paid', 'Earned', 'Shared', 'Owned'],
            datasets: [
              {
                data: counts,
                backgroundColor: ['#e11d48', '#10b981', '#0284c7', '#7c3aed'],
                borderWidth: 0,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'bottom',
                labels: { color: textColor, boxWidth: 12, font: { size: 11 } },
              },
            },
          },
        })
      );
    }

    const labels = evalItems.map((i) =>
      i.title.length > 16 ? `${i.title.slice(0, 16)}…` : i.title
    );

    if (kpiCanvasRef.current) {
      const actualPct = evalItems.map((i) =>
        computeKpiAchievement(i.evaluation.kpiActual, i.research.kpiTarget)
      );
      charts.push(
        new Chart(kpiCanvasRef.current, {
          type: 'bar',
          data: {
            labels: labels.length ? labels : ['Belum ada data'],
            datasets: [
              {
                label: 'Capaian (%)',
                data: actualPct.length ? actualPct : [0],
                backgroundColor: '#4f46e5',
                borderRadius: 5,
              },
              {
                label: 'Target (100%)',
                data: (labels.length ? labels : ['1']).map(() => 100),
                backgroundColor: isDark ? '#334155' : '#e2e8f0',
                borderRadius: 5,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: {
                beginAtZero: true,
                grid: { color: gridColor },
                ticks: { color: textColor },
              },
              x: {
                grid: { display: false },
                ticks: { color: textColor, font: { size: 10 } },
              },
            },
            plugins: {
              legend: {
                position: 'bottom',
                labels: { color: textColor, boxWidth: 12, font: { size: 11 } },
              },
            },
          },
        })
      );
    }

    if (sentCanvasRef.current) {
      charts.push(
        new Chart(sentCanvasRef.current, {
          type: 'bar',
          data: {
            labels: labels.length ? labels : ['Belum ada data'],
            datasets: [
              {
                label: 'Positif',
                data: evalItems.length
                  ? evalItems.map((i) => i.distribution.sentiment.positive)
                  : [0],
                backgroundColor: '#10b981',
                borderRadius: 4,
              },
              {
                label: 'Netral',
                data: evalItems.length
                  ? evalItems.map((i) => i.distribution.sentiment.neutral)
                  : [0],
                backgroundColor: '#94a3b8',
                borderRadius: 4,
              },
              {
                label: 'Negatif',
                data: evalItems.length
                  ? evalItems.map((i) => i.distribution.sentiment.negative)
                  : [0],
                backgroundColor: '#e11d48',
                borderRadius: 4,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              x: {
                stacked: true,
                grid: { display: false },
                ticks: { color: textColor, font: { size: 10 } },
              },
              y: {
                stacked: true,
                max: 100,
                grid: { color: gridColor },
                ticks: { color: textColor },
              },
            },
            plugins: {
              legend: {
                position: 'bottom',
                labels: { color: textColor, boxWidth: 12, font: { size: 11 } },
              },
            },
          },
        })
      );
    }

    return () => {
      charts.forEach((c) => c.destroy());
    };
  }, [filteredContents, evalItems, isDark]);

  return (
    <div className="space-y-6 animate-view">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            Fase 5 Alur Kerja PR
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-0.5">
            Evaluasi Analitik, Audit KPI &amp; Krisis
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Visualisasi PESO, capaian KPI aktual terhadap target, respon krisis PR, dan pengarsipan pembelajaran.
          </p>
        </div>

        <button
          type="button"
          onClick={onExportCSV}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors whitespace-nowrap self-start"
        >
          <FileSpreadsheet className="w-4 h-4" aria-hidden="true" />
          Export Laporan CSV
        </button>
      </div>

      {/* 3 Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <section className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <h2 className="font-display font-bold text-sm text-slate-900 dark:text-white mb-3">
            Distribusi PESO Model
          </h2>
          <div className="h-56 relative">
            <canvas ref={pesoCanvasRef} aria-label="Grafik distribusi PESO Model" />
            {filteredContents.length === 0 && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center pb-6">
                <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
                  Belum ada data konten
                </span>
              </div>
            )}
          </div>
        </section>

        <section className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <h2 className="font-display font-bold text-sm text-slate-900 dark:text-white mb-3">
            Capaian KPI vs Target (%)
          </h2>
          <div className="h-56 relative">
            <canvas ref={kpiCanvasRef} aria-label="Grafik capaian KPI terhadap target" />
          </div>
        </section>

        <section className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <h2 className="font-display font-bold text-sm text-slate-900 dark:text-white mb-3">
            Komposisi Sentimen Publik (%)
          </h2>
          <div className="h-56 relative">
            <canvas ref={sentCanvasRef} aria-label="Grafik komposisi sentimen publik" />
          </div>
        </section>
      </div>

      {/* KPI Audit & Optimization Cards */}
      <section className="space-y-3">
        <h2 className="font-display font-bold text-base text-slate-900 dark:text-white">
          Audit KPI &amp; Keputusan Optimasi ({evalItems.length})
        </h2>

        {evalItems.length === 0 ? (
          <div className="p-10 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-sm text-slate-500">
            Belum ada konten yang dipublikasikan atau masuk tahap evaluasi.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {evalItems.map((item) => {
              const target = Number(item.research.kpiTarget) || 1;
              const actual = Number(item.evaluation.kpiActual) || 0;
              const pct = computeKpiAchievement(actual, target);
              const isUnder = isContentUnderKpiOrCrisis(item);

              return (
                <article
                  key={item.id}
                  className={`p-5 rounded-xl bg-white dark:bg-slate-900 border ${
                    isUnder
                      ? 'border-rose-300 dark:border-rose-800'
                      : 'border-emerald-200 dark:border-emerald-800/70'
                  } flex flex-col justify-between gap-4`}
                >
                  <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div
                        className={`text-xs font-semibold ${
                          isUnder
                            ? 'text-rose-700 dark:text-rose-400'
                            : 'text-emerald-700 dark:text-emerald-400'
                        }`}
                      >
                        {isUnder ? 'Di Bawah KPI / Perlu Optimasi' : 'Memenuhi Target KPI'}
                      </div>
                      <h3 className="font-display font-bold text-base text-slate-900 dark:text-white mt-1">
                        {item.title}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                        {item.research.kpiMetric}:{' '}
                        <strong className="text-slate-800 dark:text-slate-100">
                          {actual.toLocaleString('id-ID')}
                        </strong>{' '}
                        / {target.toLocaleString('id-ID')}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <div
                        className={`font-display text-2xl font-bold tabular-nums ${
                          isUnder
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {pct}%
                      </div>
                      <div className="text-[11px] text-slate-400">Capaian</div>
                    </div>
                  </div>

                  {isUnder ? (
                    <div className="p-4 rounded-lg bg-rose-50/70 dark:bg-rose-950/30 space-y-3 text-xs">
                      <div className="font-semibold text-rose-900 dark:text-rose-200">
                        Audit Penyebab &amp; Aksi Respon Krisis
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label
                            htmlFor={`cause-${item.id}`}
                            className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1"
                          >
                            Akar Penyebab
                          </label>
                          <select
                            id={`cause-${item.id}`}
                            value={item.evaluation.auditCause}
                            onChange={(e) => onUpdateAuditCause(item.id, e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500"
                          >
                            <option value="">-- Pilih Penyebab --</option>
                            {AUDIT_CAUSES.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <div className="text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                            Aksi Cepat
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {OPTIMIZATION_ACTIONS.map((act) => (
                              <button
                                key={act}
                                type="button"
                                onClick={() => onTriggerOptimization(item.id, act)}
                                className={`px-2 py-1 rounded-md font-semibold border transition-colors whitespace-nowrap ${
                                  item.evaluation.actionTaken === act
                                    ? 'bg-rose-600 text-white border-rose-600'
                                    : 'bg-white dark:bg-slate-900 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-950'
                                }`}
                              >
                                {act}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/25 text-xs text-emerald-900 dark:text-emerald-200">
                      Performa kampanye memenuhi target dengan sentimen positif{' '}
                      <strong className="font-mono">{item.distribution.sentiment.positive}%</strong>.
                    </div>
                  )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      disabled={item.evaluation.archived}
                      onClick={() => onArchiveLearning(item.id)}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
                        item.evaluation.archived
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 cursor-default'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      <Archive className="w-3.5 h-3.5" aria-hidden="true" />
                      {item.evaluation.archived ? 'Sudah Diarsipkan' : 'Arsipkan Pembelajaran'}
                    </button>

                    <button
                      type="button"
                      onClick={() => onCloneToNextCycle(item.id)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                      Siklus Berikutnya
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
