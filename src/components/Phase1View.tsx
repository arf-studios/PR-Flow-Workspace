import React from 'react';
import { ArrowRight, Plus } from 'lucide-react';
import { getPesoAccentClass, getRiskTextClass } from '../lib/prflowLogic';
import type { ContentItem, PesoModel, PhaseNumber, PRFlowDatabase } from '../types/prflow';
import { PHASE_META } from '../types/prflow';

interface Phase1ViewProps {
  db: PRFlowDatabase;
  filteredContents: ContentItem[];
  onOpenNewContent: (phase: PhaseNumber) => void;
  onOpenDrawer: (contentId: string, phase: PhaseNumber) => void;
  onAdvancePhase: (contentId: string, targetPhase: PhaseNumber) => void;
}

const PESO_INFO: { key: PesoModel; desc: string }[] = [
  { key: 'Paid', desc: 'Iklan, Advertorial, KOL' },
  { key: 'Earned', desc: 'Siaran Pers, Liputan Media' },
  { key: 'Shared', desc: 'Media Sosial, Komunitas' },
  { key: 'Owned', desc: 'Website, Blog, Newsletter' },
];

export const Phase1View: React.FC<Phase1ViewProps> = ({
  db,
  filteredContents,
  onOpenNewContent,
  onOpenDrawer,
  onAdvancePhase,
}) => {
  const phase1Items = filteredContents.filter((i) => i.phase === 1);
  const campaignMap = new Map(db.campaigns.map((c) => [c.id, c]));

  return (
    <div className="space-y-6 animate-view">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-fuchsia-600 dark:text-fuchsia-400">
            Fase 1 Alur Kerja PR
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-0.5">
            Riset, Strategi PESO &amp; Audit Isu
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Analisis audiens, pemetaan risiko isu reputasi, target KPI, dan pembagian strategi PESO.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onOpenNewContent(1)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors whitespace-nowrap self-start"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          Riset Konten Baru
        </button>
      </div>

      {/* PESO Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-slate-200 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        {PESO_INFO.map(({ key, desc }) => {
          const count = filteredContents.filter((i) => i.research.peso === key).length;
          return (
            <div key={key} className="p-4 bg-white dark:bg-slate-900">
              <div className="flex items-baseline justify-between gap-2">
                <span className={`text-xs font-bold ${getPesoAccentClass(key)}`}>
                  {key} Media
                </span>
                <span className="font-display text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
                  {count}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{desc}</p>
            </div>
          );
        })}
      </div>

      {/* Active Phase 1 Research Items */}
      <section className="space-y-3">
        <h2 className="font-display font-bold text-sm text-slate-800 dark:text-slate-200">
          Dokumen Riset Aktif di Fase 1 ({phase1Items.length})
        </h2>

        {phase1Items.length === 0 ? (
          <div className="p-8 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-sm text-slate-500 dark:text-slate-400">
            Semua konten telah maju ke Fase 2 atau tahap berikutnya.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {phase1Items.map((item) => {
              const cmp = campaignMap.get(item.campaignId);
              return (
                <article
                  key={item.id}
                  className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {cmp?.name || 'Tanpa Kampanye'}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className={`font-semibold ${getPesoAccentClass(item.research.peso)}`}>
                        {item.research.peso}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className={`font-semibold ${getRiskTextClass(item.research.issueRisk)}`}>
                        Risiko {item.research.issueRisk}
                      </span>
                    </div>
                    <h3 className="font-display font-bold text-base text-slate-900 dark:text-white mt-1">
                      {item.title}
                    </h3>
                  </div>

                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-3 border-t border-slate-100 dark:border-slate-800">
                    <div>
                      <dt className="text-slate-400 font-medium">Target Audiens</dt>
                      <dd className="text-slate-700 dark:text-slate-200 mt-0.5 leading-relaxed">
                        {item.research.audience}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-400 font-medium">Funnel &amp; Target KPI</dt>
                      <dd className="text-slate-800 dark:text-slate-100 font-semibold mt-0.5 tabular-nums">
                        {item.research.funnel} · {Number(item.research.kpiTarget).toLocaleString('id-ID')}{' '}
                        {item.research.kpiMetric}
                      </dd>
                    </div>
                  </dl>

                  <div className="p-3 rounded-lg bg-amber-50/70 dark:bg-amber-950/30 text-xs text-amber-950 dark:text-amber-200">
                    <strong className="font-semibold">Audit Isu: </strong>
                    {item.research.issueAudit}
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => onOpenDrawer(item.id, 1)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                      Edit Riset
                    </button>
                    <button
                      type="button"
                      onClick={() => onAdvancePhase(item.id, 2)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
                    >
                      Lanjut Fase 2: Planner
                      <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Full Strategy Matrix */}
      <section className="space-y-3">
        <h2 className="font-display font-bold text-sm text-slate-800 dark:text-slate-200">
          Matriks Strategi &amp; Audit Isu Seluruh Konten ({filteredContents.length})
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredContents.map((item) => {
            const cmp = campaignMap.get(item.campaignId);
            return (
              <div
                key={item.id}
                className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between gap-4"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className={`font-semibold ${getPesoAccentClass(item.research.peso)}`}>
                      {item.research.peso} · {item.research.funnel}
                    </span>
                    <span className={`font-semibold ${getRiskTextClass(item.research.issueRisk)}`}>
                      Isu {item.research.issueRisk}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-display font-bold text-sm text-slate-900 dark:text-white leading-snug">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {cmp?.name || 'Tanpa Kampanye'} · {item.research.pillar}
                    </p>
                  </div>

                  <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 text-xs space-y-1.5 text-slate-600 dark:text-slate-300">
                    <div className="tabular-nums">
                      <strong className="text-slate-800 dark:text-slate-100">Target KPI:</strong>{' '}
                      {Number(item.research.kpiTarget).toLocaleString('id-ID')} {item.research.kpiMetric}
                    </div>
                    <div className="line-clamp-2">
                      <strong className="text-slate-800 dark:text-slate-100">Audit:</strong>{' '}
                      {item.research.issueAudit || '-'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <span className="text-slate-500 dark:text-slate-400">
                    {PHASE_META[item.phase].short}
                  </span>
                  <button
                    type="button"
                    onClick={() => onOpenDrawer(item.id, 1)}
                    className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Buka Riset
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
