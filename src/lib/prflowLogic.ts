import type {
  AgencySession,
  Campaign,
  ContentItem,
  IssueRisk,
  PesoModel,
  PRFlowDatabase,
  RegisteredAgencyAccount,
  ScheduleConflict,
  TeamUser,
} from '../types/prflow';

export const DB_STORAGE_KEY = 'prflow_relational_db_v3_fresh';
export const THEME_STORAGE_KEY = 'prflow_theme_v2';
export const AUTH_SESSION_KEY = 'prflow_auth_session_v2';
export const REGISTERED_ACCOUNTS_KEY = 'prflow_registered_accounts_v2';

export function uid(prefix = 'id'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function getInitials(name: string): string {
  const cleaned = (name || '?').trim();
  if (!cleaned) return '?';
  return cleaned
    .split(/\s+/)
    .map((word) => word[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function formatDateID(dateStr: string): string {
  if (!dateStr) return '-';
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatCurrencyID(num: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(num) || 0);
}

export function getPesoAccentClass(peso: PesoModel): string {
  switch (peso) {
    case 'Paid':
      return 'text-rose-700 dark:text-rose-400';
    case 'Earned':
      return 'text-emerald-700 dark:text-emerald-400';
    case 'Shared':
      return 'text-sky-700 dark:text-sky-400';
    case 'Owned':
      return 'text-violet-700 dark:text-violet-400';
  }
}

export function getRiskTextClass(risk: IssueRisk): string {
  switch (risk) {
    case 'Tinggi':
      return 'text-rose-700 dark:text-rose-400';
    case 'Sedang':
      return 'text-amber-700 dark:text-amber-400';
    default:
      return 'text-emerald-700 dark:text-emerald-400';
  }
}

export function createEmptyDatabase(referenceDate: Date = new Date()): PRFlowDatabase {
  return {
    meta: { version: 3, updatedAt: referenceDate.toISOString() },
    users: [],
    campaigns: [],
    contents: [],
    assets: [],
    archives: [],
    notifications: [],
    integrations: {
      webhookUrl: '',
      webhookAutoTrigger: false,
      gdriveRootUrl: 'https://drive.google.com/drive/my-drive',
    },
  };
}

export function normalizeWorkspaceId(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '');
}

export function registerAgencyAccount(
  existingAccounts: RegisteredAgencyAccount[],
  input: {
    name: string;
    workspaceId: string;
    role: string;
    email: string;
    password: string;
  }
): { account?: RegisteredAgencyAccount; error?: string } {
  const name = input.name.trim();
  const workspaceId = normalizeWorkspaceId(input.workspaceId);
  const role = input.role.trim();
  const email = input.email.trim().toLowerCase();
  const password = input.password;

  if (!name || !workspaceId || !email || !password) {
    return { error: 'Harap lengkapi Nama Lengkap, Workspace ID, Email Agensi, dan Password.' };
  }
  if (workspaceId.length < 3) {
    return { error: 'Workspace ID minimal 3 karakter (huruf, angka, atau tanda hubung).' };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: 'Format email agensi tidak valid.' };
  }
  if (password.length < 6) {
    return { error: 'Password minimal 6 karakter.' };
  }

  const duplicate = existingAccounts.some(
    (acc) => acc.email.toLowerCase() === email && acc.workspaceId.toUpperCase() === workspaceId
  );
  if (duplicate) {
    return {
      error:
        'Email ini sudah terdaftar pada Workspace ID tersebut. Silakan masuk melalui tab Masuk.',
    };
  }

  const account: RegisteredAgencyAccount = {
    id: uid('acc'),
    name,
    workspaceId,
    role: role || 'PR Account Director',
    email,
    password,
    createdAt: new Date().toISOString(),
  };

  return { account };
}

export function authenticateAgencyAccount(
  existingAccounts: RegisteredAgencyAccount[],
  input: {
    workspaceId: string;
    email: string;
    password: string;
    roleOverride?: string;
  }
): { session?: AgencySession; error?: string } {
  const workspaceId = normalizeWorkspaceId(input.workspaceId);
  const email = input.email.trim().toLowerCase();
  const password = input.password;

  if (!workspaceId || !email || !password) {
    return { error: 'Harap lengkapi Agency Workspace ID, Email Agensi, dan Password.' };
  }

  if (existingAccounts.length === 0) {
    return {
      error:
        'Belum ada akun agensi terdaftar di perangkat ini. Silakan buat akun baru terlebih dahulu melalui tab Daftar Akun.',
    };
  }

  const matched = existingAccounts.find(
    (acc) =>
      acc.workspaceId.toUpperCase() === workspaceId &&
      acc.email.toLowerCase() === email &&
      acc.password === password
  );

  if (!matched) {
    return {
      error:
        'Kredensial tidak cocok. Periksa kembali Workspace ID, email, dan password Anda atau daftar akun baru.',
    };
  }

  return {
    session: {
      workspaceId: matched.workspaceId,
      email: matched.email,
      name: matched.name,
      role: input.roleOverride?.trim() || matched.role,
      loginAt: new Date().toISOString(),
    },
  };
}

export function detectScheduleConflicts(
  contents: ContentItem[],
  users: TeamUser[]
): { conflicts: ScheduleConflict[]; conflictedContentIds: Set<string> } {
  const userMap = new Map(users.map((u) => [u.id, u]));
  const bucket = new Map<string, ScheduleConflict>();
  const conflictedContentIds = new Set<string>();

  for (const item of contents) {
    const date = item.planning?.takeDate;
    const crewIds = item.planning?.crewIds || [];
    if (!date || crewIds.length === 0) continue;

    for (const userId of crewIds) {
      const user = userMap.get(userId);
      if (!user) continue;
      const key = `${date}__${userId}`;
      const existing = bucket.get(key);
      if (existing) {
        existing.items.push(item);
      } else {
        bucket.set(key, { date, user, items: [item] });
      }
    }
  }

  const conflicts: ScheduleConflict[] = [];
  for (const entry of bucket.values()) {
    if (entry.items.length > 1) {
      conflicts.push(entry);
      for (const item of entry.items) {
        conflictedContentIds.add(item.id);
      }
    }
  }

  return { conflicts, conflictedContentIds };
}

export function filterContents(
  contents: ContentItem[],
  campaigns: Campaign[],
  users: TeamUser[],
  searchQuery: string,
  campaignFilterId: string
): ContentItem[] {
  const q = searchQuery.toLowerCase().trim();
  const campaignMap = new Map(campaigns.map((c) => [c.id, c]));
  const userMap = new Map(users.map((u) => [u.id, u]));

  return contents.filter((item) => {
    if (campaignFilterId !== 'ALL' && item.campaignId !== campaignFilterId) {
      return false;
    }
    if (!q) return true;
    const cmp = campaignMap.get(item.campaignId);
    const crewNames = (item.planning.crewIds || [])
      .map((id) => userMap.get(id)?.name || '')
      .filter(Boolean);
    const haystack = [
      item.title,
      cmp?.name || '',
      cmp?.client || '',
      item.research.pillar,
      item.research.peso,
      item.research.issueAudit,
      item.planning.location,
      ...crewNames,
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });
}

export function computeKpiAchievement(actual: number, target: number): number {
  const safeTarget = Number(target) > 0 ? Number(target) : 1;
  const safeActual = Math.max(0, Number(actual) || 0);
  return Math.min(200, Math.round((safeActual / safeTarget) * 100));
}

export function isContentUnderKpiOrCrisis(item: ContentItem): boolean {
  const target = Number(item.research.kpiTarget) || 1;
  const actual = Number(item.evaluation.kpiActual) || 0;
  return actual < target || item.distribution.sentiment.negative >= 20;
}

export function computeDashboardMetrics(contents: ContentItem[]) {
  const publishedItems = contents.filter((i) => i.distribution.published);
  const crisisItems = contents.filter(
    (i) =>
      i.research.issueRisk === 'Tinggi' ||
      (i.phase === 5 && i.evaluation.kpiActual < i.research.kpiTarget)
  );
  const avgPositiveSentiment = publishedItems.length
    ? Math.round(
        publishedItems.reduce((sum, item) => sum + (item.distribution.sentiment.positive || 0), 0) /
          publishedItems.length
      )
    : 0;

  return {
    totalContents: contents.length,
    publishedCount: publishedItems.length,
    crisisItems,
    avgPositiveSentiment,
  };
}

export function buildGoogleCalendarUrl(
  item: ContentItem,
  campaign: Campaign | undefined,
  crew: TeamUser[]
): string {
  const takeDate = (item.planning.takeDate || new Date().toISOString().slice(0, 10)).replace(/-/g, '');
  const title = encodeURIComponent(`[PRFlow Take] ${item.title}`);
  const crewNames = crew.map((u) => u.name).join(', ');
  const details = encodeURIComponent(
    `Kampanye: ${campaign?.name || '-'} (${campaign?.client || '-'})\nKru: ${crewNames || '-'}\nBrief: ${item.planning.brief}`
  );
  const location = encodeURIComponent(item.planning.location || 'Jakarta');
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${takeDate}T090000/${takeDate}T120000&details=${details}&location=${location}`;
}

export function buildGoogleMapsUrl(location: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location || 'Jakarta')}`;
}

export function generateICSContent(item: ContentItem, campaign: Campaign | undefined): string {
  const dt = (item.planning.takeDate || new Date().toISOString().slice(0, 10)).replace(/-/g, '');
  const briefClean = (item.planning.brief || '').replace(/\r?\n/g, ' ');
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//PRFlow Workspace Pro//ID',
    'BEGIN:VEVENT',
    `UID:${item.id}@prflow.workspace`,
    `DTSTAMP:${dt}T080000Z`,
    `DTSTART:${dt}T090000`,
    `DTEND:${dt}T120000`,
    `SUMMARY:[PRFlow Take] ${item.title}`,
    `DESCRIPTION:Kampanye: ${campaign?.name || '-'} | Brief: ${briefClean}`,
    `LOCATION:${item.planning.location || 'Kantor Pusat'}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

function csvEscape(value: string | number): string {
  const str = String(value ?? '');
  return `"${str.replace(/"/g, '""')}"`;
}

export function generateCSVContent(db: PRFlowDatabase): string {
  const campaignMap = new Map(db.campaigns.map((c) => [c.id, c]));
  const userMap = new Map(db.users.map((u) => [u.id, u]));

  const headers = [
    'ID',
    'Judul',
    'Kampanye',
    'Klien',
    'PIC',
    'Fase',
    'PESO',
    'Funnel',
    'Risiko',
    'Target KPI',
    'KPI Aktual',
    'Take Date',
    'Publish Date',
    'Kru',
    'Live',
    'Sentimen + (%)',
    'Sentimen - (%)',
    'Jumlah Aset',
  ];

  const rows = db.contents.map((item) => {
    const cmp = campaignMap.get(item.campaignId);
    const owner = userMap.get(item.ownerId);
    const crewNames = (item.planning.crewIds || [])
      .map((id) => userMap.get(id)?.name)
      .filter(Boolean)
      .join('; ');
    const assetCount = db.assets.filter((a) => a.contentId === item.id).length;

    return [
      item.id,
      csvEscape(item.title),
      csvEscape(cmp?.name || 'Tanpa Kampanye'),
      csvEscape(cmp?.client || '-'),
      csvEscape(owner?.name || '-'),
      `Fase ${item.phase}`,
      item.research.peso,
      item.research.funnel,
      item.research.issueRisk,
      item.research.kpiTarget,
      item.evaluation.kpiActual,
      item.planning.takeDate,
      item.planning.publishDate,
      csvEscape(crewNames),
      item.distribution.published ? 'Ya' : 'Belum',
      item.distribution.sentiment.positive,
      item.distribution.sentiment.negative,
      assetCount,
    ].join(',');
  });

  return `\uFEFF${[headers.join(','), ...rows].join('\n')}`;
}

export function validateImportDatabase(parsed: unknown): PRFlowDatabase {
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Format file JSON tidak valid. Pastikan berasal dari backup PRFlow Pro.');
  }
  const obj = parsed as Partial<PRFlowDatabase>;
  if (
    !Array.isArray(obj.contents) ||
    !Array.isArray(obj.users) ||
    !Array.isArray(obj.campaigns)
  ) {
    throw new Error('Format file JSON tidak valid. Pastikan berasal dari backup PRFlow Pro.');
  }
  return {
    meta: obj.meta || { version: 2, updatedAt: new Date().toISOString() },
    users: obj.users,
    campaigns: obj.campaigns,
    contents: obj.contents,
    assets: Array.isArray(obj.assets) ? obj.assets : [],
    archives: Array.isArray(obj.archives) ? obj.archives : [],
    notifications: Array.isArray(obj.notifications) ? obj.notifications : [],
    integrations: {
      webhookUrl: obj.integrations?.webhookUrl || '',
      webhookAutoTrigger: Boolean(obj.integrations?.webhookAutoTrigger),
      gdriveRootUrl: obj.integrations?.gdriveRootUrl || 'https://drive.google.com/drive/my-drive',
    },
  };
}
