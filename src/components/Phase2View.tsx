import React, { useState } from 'react';
import {
  AlertOctagon,
  ArrowRight,
  CalendarCheck,
  CalendarPlus,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FolderPlus,
  MapPin,
  SlidersHorizontal,
} from 'lucide-react';
import {
  buildGoogleCalendarUrl,
  buildGoogleMapsUrl,
  formatDateID,
} from '../lib/prflowLogic';
import type {
  ContentItem,
  PhaseNumber,
  PRFlowDatabase,
  ScheduleConflict,
} from '../types/prflow';
import { PHASE_META } from '../types/prflow';

interface Phase2ViewProps {
  db: PRFlowDatabase;
  filteredContents: ContentItem[];
  conflicts: ScheduleConflict[];
  conflictedContentIds: Set<string>;
  onOpenDrawer: (contentId: string, phase: PhaseNumber) => void;
  onAdvancePhase: (contentId: string, targetPhase: PhaseNumber) => void;
  onMarkGcalSynced: (contentId: string) => void;
  onDownloadICS: (contentId: string) => void;
  onGenerateDriveFolders: (contentId: string) => void;
}

const DAY_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

export const Phase2View: React.FC<Phase2ViewProps> = ({
  db,
  filteredContents,
  conflicts,
  conflictedContentIds,
  onOpenDrawer,
  onAdvancePhase,
  onMarkGcalSynced,
  onDownloadICS,
  onGenerateDriveFolders,
}) => {
  const [subView, setSubView] = useState<'calendar' | 'list'>('calendar');
  const [cursor, setCursor] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const userMap = new Map(db.users.map((u) => [u.id, u]));
  const campaignMap = new Map(db.campaigns.map((c) => [c.id, c]));

  const shiftMonth = (delta: number) => {
    if (delta === 0) {
      const now = new Date();
      setCursor(new Date(now.getFullYear(), now.getMonth(), 1));
    } else {
      setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + delta, 1));
    }
  };

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const monthLabel = cursor.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = new Date().toISOString().slice(0, 10);

  const renderPlannerCards = () => {
    if (filteredContents.length === 0) {
      return (
        <div className="p-10 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-sm text-slate-500">
          Belum ada jadwal konten yang sesuai filter.
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredContents.map((item) => {
          const clash = conflictedContentIds.has(item.id);
          const p = item.planning;
          const crew = (p.crewIds || [])
            .map((id) => userMap.get(id))
            .filter((u): u is NonNullable<typeof u> => Boolean(u));
          const cmp = campaignMap.get(item.campaignId);
          const assetCount = db.assets.filter((a) => a.contentId === item.id).length;
          const gcalUrl = buildGoogleCalendarUrl(item, cmp, crew);
          const mapsUrl = buildGoogleMapsUrl(p.location);

          return (
            <article
              key={item.id}
              className={`p-5 rounded-xl bg-white dark:bg-slate-900 border ${
                clash
                  ? 'border-amber-400 dark:border-amber-600'
                  : 'border-slate-200 dark:border-slate-800'
              } space-y-4`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-medium text-slate-500 dark:text-slate-400">
                      {PHASE_META[item.phase].short}
                    </span>
                    <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
                      ·
                    </span>
                    {p.needsBriefRevision ? (
                      <span className="font-semibold text-rose-700 dark:text-rose-400">
                        Revisi Konsep Diperlukan
                      </span>
                    ) : (
                      <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                        Brief Siap
                      </span>
                    )}
                    {clash && (
                      <>
                        <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
                          ·
                        </span>
                        <span className="font-semibold text-amber-700 dark:text-amber-400">
                          Kru Bentrok
                        </span>
                      </>
                    )}
                  </div>
                  <h3 className="font-display font-bold text-base text-slate-900 dark:text-white mt-1">
                    <button
                      type="button"
                      onClick={() => onOpenDrawer(item.id, 2)}
                      className="text-left hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                    >
                      {item.title}
                    </button>
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => onOpenDrawer(item.id, 2)}
                  aria-label={`Atur jadwal dan peta untuk ${item.title}`}
                  className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 shrink-0"
                >
                  <SlidersHorizontal className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>

              {p.needsBriefRevision && (
                <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 text-xs text-rose-900 dark:text-rose-200">
                  <strong className="font-semibold">Revisi Brief: </strong>
                  {p.briefRevisionNote || 'Perlu penyesuaian outline & script.'}
                </div>
              )}

              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-3 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <dt className="text-slate-400 font-medium">
                    Take &amp; Tim Kru ({crew.length})
                  </dt>
                  <dd className="text-slate-900 dark:text-slate-100 font-semibold mt-0.5 tabular-nums">
                    {formatDateID(p.takeDate)}
                  </dd>
                  <dd className="text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {crew.length ? crew.map((u) => u.name).join(', ') : 'Belum ada kru'}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-400 font-medium">Tayang Prime Time</dt>
                  <dd className="text-slate-900 dark:text-slate-100 font-semibold mt-0.5 tabular-nums">
                    {formatDateID(p.publishDate)} · {p.publishTime || '19:00'} WIB
                  </dd>
                  <dd className="text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {p.location || 'Lokasi belum diisi'}
                  </dd>
                </div>
              </dl>

              <div className="flex flex-wrap gap-2 pt-1">
                <a
                  href={gcalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => onMarkGcalSynced(item.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap ${
                    p.gcalSynced
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-indigo-500'
                  }`}
                >
                  <CalendarCheck className="w-3.5 h-3.5" aria-hidden="true" />
                  {p.gcalSynced ? 'GCal Tersinkron' : 'Google Calendar'}
                </a>

                <button
                  type="button"
                  onClick={() => onDownloadICS(item.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-indigo-500 transition-colors whitespace-nowrap"
                >
                  <CalendarPlus className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
                  Unduh .ICS
                </button>

                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-cyan-500 transition-colors whitespace-nowrap"
                >
                  <MapPin className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" aria-hidden="true" />
                  Maps
                </a>

                <button
                  type="button"
                  onClick={() => onGenerateDriveFolders(item.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap ${
                    p.gdriveGenerated
                      ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-300'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-blue-500'
                  }`}
                >
                  <FolderPlus className="w-3.5 h-3.5" aria-hidden="true" />
                  Drive ({assetCount} file)
                </button>
              </div>

              {item.phase === 2 && (
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                  <button
                    type="button"
                    disabled={clash || p.needsBriefRevision}
                    onClick={() => onAdvancePhase(item.id, 3)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
                      clash || p.needsBriefRevision
                        ? 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 cursor-not-allowed'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    }`}
                  >
                    {clash
                      ? 'Selesaikan Bentrok Dulu'
                      : p.needsBriefRevision
                        ? 'Selesaikan Revisi Brief'
                        : 'Kirim ke Fase 3: Produksi'}
                    {!clash && !p.needsBriefRevision && (
                      <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                    )}
                  </button>
                </div>
              )}
            </article>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-view">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-cyan-600 dark:text-cyan-400">
            Fase 2 Alur Kerja PR
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-0.5">
            Perencanaan, Kalender &amp; Workspace Sync
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Detektor bentrok kru relasional, ekspor Google Calendar &amp; .ICS, lokasi Maps, dan sinkronisasi folder aset Drive.
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Mode tampilan planner"
          className="inline-flex items-center gap-1 bg-slate-200/80 dark:bg-slate-800 p-1 rounded-lg self-start shrink-0"
        >
          <button
            type="button"
            role="tab"
            aria-selected={subView === 'calendar'}
            onClick={() => setSubView('calendar')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
              subView === 'calendar'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Kalender Bulanan
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={subView === 'list'}
            onClick={() => setSubView('list')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
              subView === 'list'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Daftar &amp; Integrasi
          </button>
        </div>
      </div>

      {/* Conflict Detector Status Banner */}
      {conflicts.length > 0 ? (
        <section
          aria-label="Detektor bentrok jadwal kru"
          className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/35 border border-amber-300 dark:border-amber-700/80 space-y-3"
        >
          <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-bold text-sm">
            <AlertOctagon className="w-4 h-4 shrink-0" aria-hidden="true" />
            Detektor Bentrok Relasional: {conflicts.length} Jadwal Kru Bertabrakan
          </div>
          <div className="divide-y divide-amber-200/70 dark:divide-amber-800/50">
            {conflicts.map((c) => (
              <div
                key={`${c.date}-${c.user.id}`}
                className="py-2.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div className="text-amber-950 dark:text-amber-100 leading-relaxed">
                  <strong className="font-bold">{c.user.name}</strong> ({c.user.role}) bentrok pada{' '}
                  <strong className="font-semibold tabular-nums">{formatDateID(c.date)}</strong>:{' '}
                  {c.items.map((item, idx) => (
                    <React.Fragment key={item.id}>
                      {idx > 0 && ' & '}
                      <button
                        type="button"
                        onClick={() => onOpenDrawer(item.id, 2)}
                        className="underline font-semibold text-indigo-700 dark:text-indigo-300 hover:text-indigo-900"
                      >
                        {item.title}
                      </button>
                    </React.Fragment>
                  ))}
                </div>
                <span className="text-[11px] font-semibold text-amber-800 dark:text-amber-300 whitespace-nowrap">
                  Klik judul untuk ubah tanggal/kru
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-2.5 text-xs text-emerald-800 dark:text-emerald-300 font-medium">
          <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
          Seluruh jadwal kru &amp; talent bebas bentrok pada tanggal take yang direncanakan.
        </div>
      )}

      {subView === 'calendar' ? (
        <>
          <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <h2 className="font-display font-bold text-base capitalize text-slate-900 dark:text-white">
                  {monthLabel}
                </h2>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => shiftMonth(-1)}
                    aria-label="Bulan sebelumnya"
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => shiftMonth(0)}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
                  >
                    Bulan Ini
                  </button>
                  <button
                    type="button"
                    onClick={() => shiftMonth(1)}
                    aria-label="Bulan berikutnya"
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <ChevronRight className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-300">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-cyan-500" aria-hidden="true" />
                  Take
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-amber-500" aria-hidden="true" />
                  Bentrok
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-indigo-600" aria-hidden="true" />
                  Tayang
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-[720px]">
                <div className="grid grid-cols-7 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 py-2.5">
                  {DAY_NAMES.map((dn) => (
                    <div key={dn}>{dn}</div>
                  ))}
                </div>

                <div className="grid grid-cols-7">
                  {Array.from({ length: firstDay }).map((_, idx) => (
                    <div
                      key={`pad-${idx}`}
                      className="min-h-[104px] p-2 bg-slate-50/50 dark:bg-slate-950/40 border-r border-b border-slate-200/80 dark:border-slate-800"
                    />
                  ))}

                  {Array.from({ length: daysInMonth }).map((_, idx) => {
                    const dayNum = idx + 1;
                    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(
                      dayNum
                    ).padStart(2, '0')}`;
                    const isToday = dateStr === todayStr;
                    const takeEvents = filteredContents.filter(
                      (i) => i.planning.takeDate === dateStr
                    );
                    const pubEvents = filteredContents.filter(
                      (i) => i.planning.publishDate === dateStr
                    );

                    return (
                      <div
                        key={dateStr}
                        className="min-h-[108px] p-2 bg-white dark:bg-slate-900 border-r border-b border-slate-200/80 dark:border-slate-800 flex flex-col gap-1"
                      >
                        <div className="flex items-center justify-between mb-0.5">
                          <span
                            className={`text-xs font-mono tabular-nums font-semibold ${
                              isToday
                                ? 'w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center'
                                : 'text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            {dayNum}
                          </span>
                        </div>

                        {takeEvents.map((ev) => {
                          const clash = conflictedContentIds.has(ev.id);
                          return (
                            <button
                              key={`take-${ev.id}`}
                              type="button"
                              onClick={() => onOpenDrawer(ev.id, 2)}
                              title={`Take: ${ev.title}`}
                              className={`w-full text-left px-2 py-1 rounded text-[11px] font-medium truncate transition-colors ${
                                clash
                                  ? 'bg-amber-100 text-amber-950 border border-amber-400 dark:bg-amber-900/70 dark:text-amber-100'
                                  : 'bg-cyan-50 text-cyan-900 border border-cyan-200 dark:bg-cyan-950/60 dark:text-cyan-200 dark:border-cyan-800'
                              }`}
                            >
                              Take: {ev.title}
                            </button>
                          );
                        })}

                        {pubEvents.map((ev) => (
                          <button
                            key={`pub-${ev.id}`}
                            type="button"
                            onClick={() => onOpenDrawer(ev.id, 2)}
                            title={`Tayang: ${ev.title}`}
                            className="w-full text-left px-2 py-1 rounded text-[11px] font-medium truncate bg-indigo-50 text-indigo-900 border border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-200 dark:border-indigo-800"
                          >
                            Tayang: {ev.title}
                          </button>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-3 pt-1">
            <h2 className="font-display font-bold text-sm text-slate-800 dark:text-slate-200">
              Integrasi Google Workspace, Kalender .ICS &amp; Status Brief
            </h2>
            {renderPlannerCards()}
          </section>
        </>
      ) : (
        renderPlannerCards()
      )}
    </div>
  );
};
