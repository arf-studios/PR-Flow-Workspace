import React from 'react';
import { ArrowRight, Edit3, Rocket } from 'lucide-react';
import { formatDateID, getPesoAccentClass } from '../lib/prflowLogic';
import type { ContentItem, PhaseNumber, ResponseStatus } from '../types/prflow';

interface Phase4ViewProps {
  filteredContents: ContentItem[];
  onOpenDrawer: (contentId: string, phase: PhaseNumber) => void;
  onPublishNow: (contentId: string) => void;
  onUpdateResponseStatus: (contentId: string, status: ResponseStatus) => void;
  onAdvancePhase: (contentId: string, targetPhase: PhaseNumber) => void;
}

const RESPONSE_STATUSES: ResponseStatus[] = [
  'Belum Direspon',
  'Sedang Ditangani',
  'Selesai',
];

export const Phase4View: React.FC<Phase4ViewProps> = ({
  filteredContents,
  onOpenDrawer,
  onPublishNow,
  onUpdateResponseStatus,
  onAdvancePhase,
}) => {
  const items = filteredContents.filter(
    (i) =>
      i.phase === 4 ||
      (i.phase === 3 && i.production.stage === 'siap_tayang') ||
      i.distribution.published
  );

  return (
    <div className="space-y-6 animate-view">
      <div>
        <div className="text-xs font-semibold text-sky-600 dark:text-sky-400">
          Fase 4 Alur Kerja PR
        </div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-0.5">
          Distribusi Multi-Kanal &amp; Monitoring Sentimen
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Publikasi Prime Time sesuai strategi PESO, pemantauan sentimen publik, dan status respon komunitas.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="p-12 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center space-y-1.5">
          <div className="text-sm font-semibold text-slate-600 dark:text-slate-300">
            Belum ada konten siap publikasi di Fase 4.
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Selesaikan tahap Final Approval di Fase 3 untuk memasukkan konten ke antrean tayang.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {items.map((item) => {
            const d = item.distribution;
            const s = d.sentiment;

            return (
              <article
                key={item.id}
                className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className={`font-semibold ${getPesoAccentClass(item.research.peso)}`}>
                        {item.research.peso}
                      </span>
                      <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
                        ·
                      </span>
                      {d.published ? (
                        <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                          Tayang (Live)
                        </span>
                      ) : (
                        <span className="font-semibold text-amber-700 dark:text-amber-400">
                          Antrean Prime Time
                        </span>
                      )}
                    </div>
                    <h2 className="font-display font-bold text-base text-slate-900 dark:text-white mt-1">
                      <button
                        type="button"
                        onClick={() => onOpenDrawer(item.id, 4)}
                        className="text-left hover:text-indigo-600 dark:hover:text-indigo-400"
                      >
                        {item.title}
                      </button>
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                      Prime Time: <strong className="text-slate-700 dark:text-slate-200">{formatDateID(item.planning.publishDate)} · {item.planning.publishTime || '19:00'} WIB</strong>
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => onOpenDrawer(item.id, 4)}
                    aria-label={`Edit distribusi ${item.title}`}
                    className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 shrink-0"
                  >
                    <Edit3 className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>

                <div className="text-xs text-slate-600 dark:text-slate-300">
                  <span className="text-slate-400">Kanal: </span>
                  {(d.channels || []).length > 0 ? d.channels.join(' · ') : 'Belum dipilih'}
                </div>

                {/* Sentiment Bar */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      Sentimen Publik
                    </span>
                    <span className="text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                      <strong className="text-slate-800 dark:text-slate-100">
                        {Number(d.mentions || 0).toLocaleString('id-ID')}
                      </strong>{' '}
                      Mention
                    </span>
                  </div>

                  <div className="w-full h-2.5 rounded-full overflow-hidden flex bg-slate-200 dark:bg-slate-800">
                    <div
                      className="bg-emerald-500 h-full transition-all"
                      style={{ width: `${s.positive}%` }}
                    />
                    <div
                      className="bg-slate-400 h-full transition-all"
                      style={{ width: `${s.neutral}%` }}
                    />
                    <div
                      className="bg-rose-500 h-full transition-all"
                      style={{ width: `${s.negative}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono tabular-nums font-medium">
                    <span className="text-emerald-700 dark:text-emerald-400">
                      Positif {s.positive}%
                    </span>
                    <span className="text-slate-500 dark:text-slate-400">
                      Netral {s.neutral}%
                    </span>
                    <span className="text-rose-700 dark:text-rose-400">
                      Negatif {s.negative}%
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 text-xs">
                    <label
                      htmlFor={`resp-${item.id}`}
                      className="text-slate-500 dark:text-slate-400"
                    >
                      Respon Komunitas:
                    </label>
                    <select
                      id={`resp-${item.id}`}
                      value={d.responseStatus}
                      onChange={(e) =>
                        onUpdateResponseStatus(item.id, e.target.value as ResponseStatus)
                      }
                      className="px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500"
                    >
                      {RESPONSE_STATUSES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  {!d.published ? (
                    <button
                      type="button"
                      onClick={() => onPublishNow(item.id)}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold transition-colors"
                    >
                      <Rocket className="w-3.5 h-3.5" aria-hidden="true" />
                      Publikasikan ke Multi-Kanal Sekarang
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => onOpenDrawer(item.id, 4)}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold transition-colors"
                      >
                        Update Sentimen
                      </button>

                      {item.phase < 5 ? (
                        <button
                          type="button"
                          onClick={() => onAdvancePhase(item.id, 5)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors"
                        >
                          Evaluasi Fase 5
                          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      ) : (
                        <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                          Masuk Fase 5
                        </span>
                      )}
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
