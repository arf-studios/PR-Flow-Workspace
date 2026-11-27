import React from 'react';
import { formatDateID, getPesoAccentClass } from '../lib/prflowLogic';
import type { ArchiveEntry } from '../types/prflow';

interface ArchiveViewProps {
  archives: ArchiveEntry[];
  searchQuery: string;
}

export const ArchiveView: React.FC<ArchiveViewProps> = ({ archives, searchQuery }) => {
  const q = searchQuery.toLowerCase().trim();
  const filtered = archives.filter((arc) => {
    if (!q) return true;
    return [arc.title, arc.campaignName, arc.peso, arc.keyLearning]
      .join(' ')
      .toLowerCase()
      .includes(q);
  });

  return (
    <div className="space-y-6 animate-view">
      <div>
        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          Arsip Digital PR
        </div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-0.5">
          Arsip Dokumentasi &amp; Pembelajaran
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Repositori permanen insight evaluasi, studi kasus optimasi, dan pembelajaran kampanye PR.
        </p>
      </div>

      {filtered.length === 0 ? (
        <div className="p-12 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-sm text-slate-500">
          Belum ada data arsip yang cocok. Arsipkan hasil evaluasi dari Fase 5.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((arc) => (
            <article
              key={arc.id}
              className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className={`font-semibold ${getPesoAccentClass(arc.peso)}`}>
                    {arc.peso}
                  </span>
                  <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
                    ·
                  </span>
                  <span className="text-slate-600 dark:text-slate-300">{arc.funnel}</span>
                </div>
                <span className="text-slate-400 font-mono tabular-nums">
                  Diarsipkan {formatDateID(arc.archivedAt)}
                </span>
              </div>

              <div>
                <h2 className="font-display font-bold text-base text-slate-900 dark:text-white">
                  {arc.title}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {arc.campaignName}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs font-semibold tabular-nums pt-1">
                <span className="text-indigo-700 dark:text-indigo-400">
                  KPI: {arc.kpiSummary}
                </span>
                <span className="text-emerald-700 dark:text-emerald-400">
                  Sentimen Positif: {arc.sentimentPositive}%
                </span>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                <strong className="block text-slate-900 dark:text-white mb-1">
                  Key Learning &amp; Best Practice
                </strong>
                {arc.keyLearning}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};
