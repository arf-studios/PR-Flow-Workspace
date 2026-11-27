import React, { useEffect, useState } from 'react';
import {
  getAvatarInitials,
  getAvatarStatusLabel,
  getDeterministicAvatarColor,
} from '../lib/presenceLogic';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface AvatarUserInfo {
  name: string;
  email?: string;
  photoURL?: string | null;
  colorClass?: string;
  isOnline?: boolean;
  lastSeenMs?: number | null;
}

export interface UserAvatarProps {
  user: AvatarUserInfo;
  size?: AvatarSize;
  showStatus?: boolean;
  nowMs?: number;
  className?: string;
}

// Proportional diameters & bottom-right status dots (~26-29% of avatar diameter)
const SIZE_CONFIG: Record<
  AvatarSize,
  {
    wrapper: string;
    text: string;
    dot: string;
    ring: string;
    dotOffset: string;
  }
> = {
  xs: {
    wrapper: 'w-6 h-6',
    text: 'text-[9px]',
    dot: 'w-[7px] h-[7px]',
    ring: 'ring-[1.5px]',
    dotOffset: '-bottom-0.5 -right-0.5',
  },
  sm: {
    wrapper: 'w-8 h-8',
    text: 'text-[11px]',
    dot: 'w-[9px] h-[9px]',
    ring: 'ring-2',
    dotOffset: '-bottom-0.5 -right-0.5',
  },
  md: {
    wrapper: 'w-10 h-10',
    text: 'text-xs',
    dot: 'w-[11px] h-[11px]',
    ring: 'ring-2',
    dotOffset: '-bottom-0.5 -right-0.5',
  },
  lg: {
    wrapper: 'w-12 h-12',
    text: 'text-sm',
    dot: 'w-[13px] h-[13px]',
    ring: 'ring-2',
    dotOffset: 'bottom-0 right-0',
  },
  xl: {
    wrapper: 'w-14 h-14',
    text: 'text-base',
    dot: 'w-[15px] h-[15px]',
    ring: 'ring-[2.5px]',
    dotOffset: 'bottom-0 right-0',
  },
};

export const UserAvatar: React.FC<UserAvatarProps> = React.memo(
  ({ user, size = 'md', showStatus = false, nowMs, className = '' }) => {
    const [imgFailed, setImgFailed] = useState(false);

    useEffect(() => {
      setImgFailed(false);
    }, [user.photoURL]);

    const cfg = SIZE_CONFIG[size];
    const initials = getAvatarInitials(user.name);
    const bgClass =
      user.colorClass || getDeterministicAvatarColor(user.email || user.name || 'prflow');
    const isOnline = Boolean(user.isOnline);
    const effectiveNow = nowMs ?? Date.now();
    const statusMeta = getAvatarStatusLabel(isOnline, user.lastSeenMs, effectiveNow, user.name);

    const hasPhoto = Boolean(user.photoURL && !imgFailed);

    return (
      <span
        className={`relative inline-flex shrink-0 select-none ${cfg.wrapper} ${className}`}
        title={showStatus ? statusMeta.tooltip : user.name}
        role="img"
        aria-label={showStatus ? statusMeta.ariaLabel : user.name}
      >
        <span
          className={`w-full h-full rounded-full overflow-hidden flex items-center justify-center text-white font-bold shadow-sm ${cfg.text} ${
            hasPhoto ? 'bg-slate-200 dark:bg-slate-800' : bgClass
          }`}
        >
          {hasPhoto ? (
            <img
              src={user.photoURL as string}
              alt=""
              aria-hidden="true"
              referrerPolicy="no-referrer"
              onError={() => setImgFailed(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <span aria-hidden="true" className="leading-none tracking-tight">
              {initials}
            </span>
          )}
        </span>

        {showStatus && (
          <span
            aria-hidden="true"
            className={`absolute ${cfg.dotOffset} ${cfg.dot} rounded-full ${cfg.ring} ring-white dark:ring-slate-900 flex items-center justify-center ${
              isOnline ? 'bg-emerald-500' : 'bg-rose-500'
            }`}
          >
            {isOnline && (
              <span className="avatar-pulse-ring absolute inset-0 rounded-full bg-emerald-400" />
            )}
          </span>
        )}
      </span>
    );
  }
);

UserAvatar.displayName = 'UserAvatar';
