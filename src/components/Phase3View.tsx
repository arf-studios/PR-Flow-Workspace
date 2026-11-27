import React, { useState } from 'react';
import { ArrowRight, Paperclip, Plus } from 'lucide-react';
import { getPesoAccentClass } from '../lib/prflowLogic';
import type {
  ContentItem,
  KanbanStageId,
  PhaseNumber,
  PRFlowDatabase,
} from '../types/prflow';
import { KANBAN_STAGES } from '../types/prflow';

interface Phase3ViewProps {
  db: PRFlowDatabase;
  filteredContents: ContentItem[];
  onOpenNewContent: (phase: PhaseNumber) => void;
  onOpenDrawer: (contentId: string, phase: PhaseNumber) => void;
  onMoveStage: (contentId: string, stage: KanbanStageId) => void;
  onApproveItem: (contentId: string) => void;
  onOpenRevisionModal: (contentId: string) => void;
  onAdvancePhase: (contentId: string, targetPhase: PhaseNumber) => void;
}

export const Phase3View: React.FC<Phase3ViewProps> = ({
  db,
  filteredContents,
  onOpenNewContent,
  onOpenDrawer,
  onMoveStage,
  onApproveItem,
  onOpenRevisionModal,
  onAdvancePhase,
}) => {
  const [dragOverStage, setDragOverStage] = useState<KanbanStageId | null>(null);
  const phase3Items = filteredContents.filter((i) => i.phase === 3);
  const campaignMap = new Map(db.campaigns.map((c) => [c.id, c]));

  const moveNext = (item: ContentItem) => {
    const idx = KANBAN_STAGES.findIndex((s) => s.id === item.production.stage);
    if (idx >= 0 && idx < KANBAN_STAGES.length - 1) {
      onMoveStage(item.id, KANBAN_STAGES[idx + 1].id);
    }
  };

  return (
    <div className="space-y-6 animate-view">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-amber-600 dark:text-amber-400">
            Fase 3 Alur Kerja PR
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-0.5">
            Kanban Produksi, QC Teknis &amp; Brand Safety
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Seret kartu antar tahap produksi, validasi checklist QC PR Brand Safety, serta jalankan loop Approval &amp; Revisi.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onOpenNewContent(3)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors whitespace-nowrap self-start"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          Tambah ke Produksi
        </button>
      </div>

      {/* 6-Stage Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px bg-slate-200 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        {KANBAN_STAGES.map((stage) => {
          const count = phase3Items.filter((i) => i.production.stage === stage.id).length;
          return (
            <div key={`summary-${stage.id}`} className="px-3.5 py-2.5 bg-white dark:bg-slate-900">
              <div className="flex items-center justify-between gap-2">
                <span className={`text-[11px] font-semibold truncate ${stage.accent}`}>
                  {stage.label}
                </span>
                <span className="text-xs font-mono tabular-nums font-bold text-slate-900 dark:text-white shrink-0">
                  {count}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 items-start">
        {KANBAN_STAGES.map((stage) => {
          const colItems = phase3Items.filter((i) => i.production.stage === stage.id);
          const isOver = dragOverStage === stage.id;

          return (
            <section
              key={stage.id}
              aria-label={stage.label}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverStage(stage.id);
              }}
              onDragLeave={() => setDragOverStage(null)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverStage(null);
                const contentId = e.dataTransfer.getData('text/plain');
                if (contentId) {
                  onMoveStage(contentId, stage.id);
                }
              }}
              className={`w-[272px] shrink-0 min-h-[420px] rounded-xl border p-3 flex flex-col gap-3 transition-colors ${
                isOver
                  ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900/70'
              }`}
            >
              <div className="flex items-center justify-between gap-2 px-1">
                <h2 className={`text-xs font-bold ${stage.accent}`}>{stage.label}</h2>
                <span className="text-xs font-mono tabular-nums font-semibold text-slate-500 dark:text-slate-400">
                  {colItems.length}
                </span>
              </div>

              <div className="space-y-3 flex-1">
                {colItems.length === 0 ? (
                  <div className="p-6 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 text-center text-xs text-slate-400">
                    Kosong — seret kartu ke kolom ini
                  </div>
                ) : (
                  colItems.map((item) => {
                    const cmp = campaignMap.get(item.campaignId);
                    const prod = item.production;
                    const preDone = Object.values(prod.preProdChecklist).filter(Boolean).length;
                    const qcDone = Object.values(prod.qcChecklist).filter(Boolean).length;
                    const assetCount = db.assets.filter((a) => a.contentId === item.id).length;

                    return (
                      <article
                        key={item.id}
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData('text/plain', item.id)}
                        className="p-4 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 transition-colors space-y-3 cursor-grab active:cursor-grabbing"
                      >
                        <div className="flex items-center justify-between gap-2 text-[11px]">
                          <span className={`font-semibold ${getPesoAccentClass(item.research.peso)}`}>
                            {item.research.peso}
                          </span>
                          <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                            <Paperclip className="w-3 h-3" aria-hidden="true" />
                            {assetCount} aset
                          </span>
                        </div>

                        <div>
                          <h3 className="font-semibold text-sm text-slate-900 dark:text-white leading-snug">
                            <button
                              type="button"
                              onClick={() => onOpenDrawer(item.id, 3)}
                              className="text-left hover:text-indigo-600 dark:hover:text-indigo-400"
                            >
                              {item.title}
                            </button>
                          </h3>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {cmp?.name || 'Tanpa Kampanye'}
                          </p>
                        </div>

                        <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-100 dark:border-slate-800 tabular-nums">
                          <span className="text-slate-500 dark:text-slate-400">
                            Pra-Prod:{' '}
                            <strong
                              className={
                                preDone === 4
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-slate-800 dark:text-slate-200'
                              }
                            >
                              {preDone}/4
                            </strong>
                          </span>
                          <span className="text-slate-500 dark:text-slate-400">
                            QC Safety:{' '}
                            <strong
                              className={
                                qcDone === 4
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-amber-600 dark:text-amber-400'
                              }
                            >
                              {qcDone}/4
                            </strong>
                          </span>
                        </div>

                        {prod.revisions.length > 0 && (
                          <div className="p-2.5 rounded-md bg-rose-50 dark:bg-rose-950/40 text-[11px] text-rose-800 dark:text-rose-200 leading-relaxed">
                            <strong className="font-semibold">
                              Revisi #{prod.revisions.length}:{' '}
                            </strong>
                            {prod.revisions[0].note}
                          </div>
                        )}

                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-1.5">
                          {stage.id === 'qc_safety' || stage.id === 'approval' ? (
                            <>
                              <button
                                type="button"
                                onClick={() => onApproveItem(item.id)}
                                className="flex-1 px-2.5 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors whitespace-nowrap"
                              >
                                {stage.id === 'qc_safety' ? 'Lolos QC' : 'Setujui Final'}
                              </button>
                              <button
                                type="button"
                                onClick={() => onOpenRevisionModal(item.id)}
                                className="px-2.5 py-1.5 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 dark:text-rose-300 text-xs font-semibold transition-colors whitespace-nowrap"
                              >
                                Revisi
                              </button>
                            </>
                          ) : stage.id === 'siap_tayang' ? (
                            <button
                              type="button"
                              onClick={() => onAdvancePhase(item.id, 4)}
                              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors"
                            >
                              Lanjut Fase 4: Distribusi
                              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => moveNext(item)}
                              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-indigo-600 hover:text-white text-xs font-semibold transition-colors"
                            >
                              Tahap Berikutnya
                              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                            </button>
                          )}
                        </div>
                      </article>
                    );
                  })
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
};
