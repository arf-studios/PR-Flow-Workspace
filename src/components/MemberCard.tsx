import React from 'react';
import { motion } from 'motion/react';
import { Crown, ShieldCheck, Trash2, User } from 'lucide-react';
import {
  formatLastSeenID,
  getCrewRoleLabelID,
  type CrewRole,
  type EnrichedCrewMember,
} from '../lib/presenceLogic';
import { UserAvatar } from './UserAvatar';

export interface MemberCardProps {
  member: EnrichedCrewMember;
  nowMs: number;
  isCurrentUser: boolean;
  canManage: boolean;
  onChangeRole?: (crewId: string, memberUid: string, nextRole: CrewRole) => void;
  onRequestRemove?: (member: EnrichedCrewMember) => void;
}

const ROLE_STYLES: Record<CrewRole, string> = {
  owner:
    'bg-amber-500/14 text-amber-800 dark:bg-amber-400/16 dark:text-amber-300 border-amber-400/35',
  admin:
    'bg-[#17B5E8]/14 text-[#0369A1] dark:bg-[#17B5E8]/16 dark:text-[#38BDF8] border-[#17B5E8]/35',
  member:
    'bg-slate-500/10 text-slate-700 dark:bg-white/10 dark:text-slate-300 border-slate-300/60 dark:border-white/15',
};

export const MemberCard: React.FC<MemberCardProps> = React.memo(
  ({ member, nowMs, isCurrentUser, canManage, onChangeRole, onRequestRemove }) => {
    const canEditTarget = canManage && member.crewRole !== 'owner' && !isCurrentUser;
    const statusDescription = member.isOnline
      ? 'Online'
      : `Offline · ${formatLastSeenID(member.lastSeenMs, nowMs)}`;

    return (
      <motion.article
        layout="position"
        initial={{ opacity: 0, y: 10, scale: 0.985 }}
        animate={{ opacity: member.isOptimistic ? 0.72 : 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.98 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="p-4 rounded-2xl glass-subtle hover:border-[#17B5E8]/45 dark:hover:border-[#2CE59B]/35 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3.5"
      >
        <div className="flex items-start sm:items-center gap-3.5 min-w-0">
          <UserAvatar
            user={{
              name: member.name,
              email: member.email,
              photoURL: member.photoURL,
              isOnline: member.isOnline,
              lastSeenMs: member.lastSeenMs,
            }}
            size="md"
            showStatus
            nowMs={nowMs}
          />

          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-display font-bold text-sm text-slate-900 dark:text-white truncate">
                {member.name}
              </h3>
              {isCurrentUser && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#2CE59B]/18 text-[#047857] dark:text-[#2CE59B] border border-[#2CE59B]/35">
                  Anda
                </span>
              )}
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${ROLE_STYLES[member.crewRole]}`}
              >
                {member.crewRole === 'owner' ? (
                  <Crown className="w-2.5 h-2.5" aria-hidden="true" />
                ) : member.crewRole === 'admin' ? (
                  <ShieldCheck className="w-2.5 h-2.5" aria-hidden="true" />
                ) : (
                  <User className="w-2.5 h-2.5" aria-hidden="true" />
                )}
                {getCrewRoleLabelID(member.crewRole)}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-600 dark:text-slate-300">
              <span className="truncate">{member.agencyRole}</span>
              <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">
                ·
              </span>
              <span className="truncate text-slate-500 dark:text-slate-400">{member.email}</span>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-0.5 text-[11px]">
              <span
                className={`inline-flex items-center gap-1.5 font-semibold ${
                  member.isOnline
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-rose-700 dark:text-rose-400'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`w-1.5 h-1.5 rounded-full ${
                    member.isOnline ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}
                />
                {statusDescription}
              </span>
              <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">
                ·
              </span>
              <span className="px-2 py-0.5 rounded-lg bg-white/70 dark:bg-white/6 border border-slate-200/70 dark:border-white/10 text-slate-600 dark:text-slate-300 font-medium">
                {member.crewName}
              </span>
              {member.isOptimistic && (
                <span className="text-[10px] font-mono text-[#0284C7] dark:text-[#38BDF8]">
                  Menyimpan...
                </span>
              )}
            </div>
          </div>
        </div>

        {canEditTarget && (
          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            {onChangeRole && (
              <label className="inline-flex items-center">
                <span className="sr-only">Ubah peran kru {member.name}</span>
                <select
                  aria-label={`Ubah peran kru ${member.name}`}
                  value={member.crewRole}
                  onChange={(e) =>
                    onChangeRole(member.crewId, member.uid, e.target.value as CrewRole)
                  }
                  className="text-xs font-semibold rounded-xl px-2.5 py-1.5 glass-input text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
                >
                  <option value="member">Anggota</option>
                  <option value="admin">Admin Kru</option>
                </select>
              </label>
            )}
            {onRequestRemove && (
              <button
                type="button"
                onClick={() => onRequestRemove(member)}
                aria-label={`Hapus ${member.name} dari ${member.crewName}`}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-300/60 dark:border-rose-500/30 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Hapus</span>
              </button>
            )}
          </div>
        )}
      </motion.article>
    );
  }
);

MemberCard.displayName = 'MemberCard';
