export type PesoModel = 'Paid' | 'Earned' | 'Shared' | 'Owned';
export type FunnelStage = 'Awareness' | 'Engagement' | 'Conversion';
export type IssueRisk = 'Rendah' | 'Sedang' | 'Tinggi';
export type PhaseNumber = 1 | 2 | 3 | 4 | 5;

export type KanbanStageId =
  | 'pra_produksi'
  | 'take_raw'
  | 'editing'
  | 'qc_safety'
  | 'approval'
  | 'siap_tayang';

export type ResponseStatus = 'Belum Direspon' | 'Sedang Ditangani' | 'Selesai';
export type CampaignStatus = 'Aktif' | 'Perencanaan' | 'Krisis Monitor' | 'Selesai';
export type DriveFolder = '01_Brief' | '02_Raw_Footage' | '03_Final_Asset';
export type AssetFileType = 'PDF' | 'Doc' | 'Slides' | 'Video' | 'Design' | 'Image';
export type NotificationKind = 'info' | 'success' | 'warning' | 'danger';

export type NavView =
  | 'dashboard'
  | 'phase1'
  | 'phase2'
  | 'phase3'
  | 'phase4'
  | 'phase5'
  | 'crew'
  | 'campaigns'
  | 'assets'
  | 'archive'
  | 'settings';

export interface TeamUser {
  id: string;
  name: string;
  role: string;
  email: string;
  color: string;
}

export interface Campaign {
  id: string;
  name: string;
  client: string;
  status: CampaignStatus;
  budget: number;
  color: string;
}

export interface RevisionEntry {
  date: string;
  by: string;
  note: string;
}

export interface PreProdChecklist {
  kamera: boolean;
  audio: boolean;
  lighting: boolean;
  briefingMeet: boolean;
}

export interface QcChecklist {
  visualAudio: boolean;
  tonePR: boolean;
  brandSafety: boolean;
  akurasiData: boolean;
}

export interface SentimentStats {
  positive: number;
  neutral: number;
  negative: number;
}

export interface ContentItem {
  id: string;
  campaignId: string;
  ownerId: string;
  title: string;
  phase: PhaseNumber;
  research: {
    audience: string;
    trends: string;
    issueAudit: string;
    issueRisk: IssueRisk;
    funnel: FunnelStage;
    kpiMetric: string;
    kpiTarget: number;
    pillar: string;
    peso: PesoModel;
    competitorNotes: string;
    format: string;
  };
  planning: {
    brief: string;
    outline: string;
    needsBriefRevision: boolean;
    briefRevisionNote: string;
    takeDate: string;
    publishDate: string;
    publishTime: string;
    crewIds: string[];
    location: string;
    travelEstimate: string;
    gcalSynced: boolean;
    gdriveGenerated: boolean;
  };
  production: {
    stage: KanbanStageId;
    preProdChecklist: PreProdChecklist;
    qcChecklist: QcChecklist;
    revisions: RevisionEntry[];
  };
  distribution: {
    channels: string[];
    published: boolean;
    sentiment: SentimentStats;
    mentions: number;
    responseStatus: ResponseStatus;
  };
  evaluation: {
    kpiActual: number;
    auditCause: string;
    auditNotes: string;
    actionTaken: string;
    archived: boolean;
  };
}

export interface DigitalAsset {
  id: string;
  contentId: string;
  folder: DriveFolder;
  name: string;
  type: AssetFileType;
  url: string;
  version: string;
  uploadedBy: string;
  createdAt: string;
}

export interface ArchiveEntry {
  id: string;
  contentId: string | null;
  campaignId: string;
  title: string;
  campaignName: string;
  peso: PesoModel;
  funnel: FunnelStage;
  kpiSummary: string;
  sentimentPositive: number;
  keyLearning: string;
  archivedAt: string;
}

export interface NotificationItem {
  id: string;
  type: NotificationKind;
  title: string;
  message: string;
  time: string;
  read: boolean;
}

export interface IntegrationSettings {
  webhookUrl: string;
  webhookAutoTrigger: boolean;
  gdriveRootUrl: string;
}

export interface PRFlowDatabase {
  meta: {
    version: number;
    updatedAt: string;
  };
  users: TeamUser[];
  campaigns: Campaign[];
  contents: ContentItem[];
  assets: DigitalAsset[];
  archives: ArchiveEntry[];
  notifications: NotificationItem[];
  integrations: IntegrationSettings;
}

export interface ScheduleConflict {
  date: string;
  user: TeamUser;
  items: ContentItem[];
}

export interface ToastMessage {
  id: string;
  type: NotificationKind;
  title: string;
  message: string;
}

export const PHASE_META: Record<PhaseNumber, { name: string; short: string; stepLabel: string }> = {
  1: { name: 'Riset & Strategi', short: 'Fase 1: Riset', stepLabel: 'Riset' },
  2: { name: 'Planner & Kalender', short: 'Fase 2: Planner', stepLabel: 'Planner' },
  3: { name: 'Produksi, QC & Approval', short: 'Fase 3: Produksi', stepLabel: 'Produksi' },
  4: { name: 'Distribusi & Monitoring', short: 'Fase 4: Distribusi', stepLabel: 'Distribusi' },
  5: { name: 'Evaluasi & Optimasi', short: 'Fase 5: Evaluasi', stepLabel: 'Evaluasi' },
};

export const KANBAN_STAGES: { id: KanbanStageId; label: string; accent: string }[] = [
  { id: 'pra_produksi', label: 'Pra-Produksi & Cek Alat', accent: 'text-slate-700 dark:text-slate-200' },
  { id: 'take_raw', label: 'Take & Upload Raw', accent: 'text-sky-700 dark:text-sky-300' },
  { id: 'editing', label: 'Editing & Copywriting', accent: 'text-indigo-700 dark:text-indigo-300' },
  { id: 'qc_safety', label: 'QC Teknis & PR Brand Safety', accent: 'text-amber-700 dark:text-amber-300' },
  { id: 'approval', label: 'Final Approval Klien', accent: 'text-violet-700 dark:text-violet-300' },
  { id: 'siap_tayang', label: 'Siap Tayang (Aset Final)', accent: 'text-emerald-700 dark:text-emerald-300' },
];

export const ALL_CHANNELS = [
  'Instagram',
  'TikTok',
  'LinkedIn',
  'Siaran Pers/Media',
  'YouTube',
  'Website',
] as const;

export const DRIVE_FOLDERS: DriveFolder[] = ['01_Brief', '02_Raw_Footage', '03_Final_Asset'];

export const ASSET_TYPES: AssetFileType[] = ['PDF', 'Doc', 'Slides', 'Video', 'Design', 'Image'];

export const AVATAR_COLORS = [
  { label: 'Indigo', value: 'bg-indigo-600' },
  { label: 'Emerald', value: 'bg-emerald-600' },
  { label: 'Sky', value: 'bg-sky-600' },
  { label: 'Amber', value: 'bg-amber-600' },
  { label: 'Rose', value: 'bg-rose-600' },
  { label: 'Slate', value: 'bg-slate-700' },
] as const;

export const AUDIT_CAUSES = ['Algoritma', 'Pesan', 'Waktu Tayang', 'Isu Eksternal'] as const;

export const OPTIMIZATION_ACTIONS = [
  'A/B Testing',
  'Repurposing',
  'Boosting',
  'Klarifikasi PR',
] as const;

export const PR_AGENCY_ROLES = [
  'PR Account Director',
  'Content Strategist',
  'Media & Production Lead',
  'Crisis & Brand Safety Officer',
] as const;

export type AgencyRole = (typeof PR_AGENCY_ROLES)[number];

export type LandingTab = 'home' | 'about' | 'features' | 'news' | 'contact';

export interface RegisteredAgencyAccount {
  id: string;
  name: string;
  workspaceId: string;
  role: string;
  email: string;
  password: string;
  createdAt: string;
}

export interface AgencySession {
  workspaceId: string;
  email: string;
  name: string;
  role: string;
  loginAt: string;
}

export interface BlogArticle {
  id: string;
  category: 'Strategi PR' | 'Krisis & Reputasi' | 'PESO & Digital' | 'Studi Kasus';
  title: string;
  excerpt: string;
  author: string;
  date: string;
  readTime: string;
  content: string[];
}

