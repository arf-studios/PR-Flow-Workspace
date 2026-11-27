import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  MessageSquareWarning,
  Send,
  X,
} from 'lucide-react';
import type {
  AssetFileType,
  Campaign,
  CampaignStatus,
  ContentItem,
  DriveFolder,
  FunnelStage,
  IssueRisk,
  PesoModel,
  PhaseNumber,
  TeamUser,
  ToastMessage,
} from '../types/prflow';
import { ASSET_TYPES, AVATAR_COLORS, DRIVE_FOLDERS } from '../types/prflow';

/* ================= 1. NEW CONTENT MODAL ================= */
interface NewContentModalProps {
  open: boolean;
  defaultPhase: PhaseNumber;
  campaigns: Campaign[];
  users: TeamUser[];
  onClose: () => void;
  onSubmit: (payload: Omit<ContentItem, 'id'>) => void;
}

export const NewContentModal: React.FC<NewContentModalProps> = ({
  open,
  defaultPhase,
  campaigns,
  users,
  onClose,
  onSubmit,
}) => {
  const [title, setTitle] = useState('');
  const [campaignId, setCampaignId] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [phase, setPhase] = useState<PhaseNumber>(defaultPhase);
  const [peso, setPeso] = useState<PesoModel>('Earned');
  const [funnel, setFunnel] = useState<FunnelStage>('Awareness');
  const [pillar, setPillar] = useState('Reputasi Korporasi');
  const [risk, setRisk] = useState<IssueRisk>('Rendah');

  useEffect(() => {
    if (open) {
      setTitle('');
      setCampaignId(campaigns[0]?.id || '');
      setOwnerId(users[0]?.id || '');
      setPhase(defaultPhase);
      setPeso('Earned');
      setFunnel('Awareness');
      setPillar('Reputasi Korporasi');
      setRisk('Rendah');
    }
  }, [open, defaultPhase, campaigns, users]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedTitle = title.trim();
    if (!cleanedTitle) return;
    const todayStr = new Date().toISOString().slice(0, 10);

    onSubmit({
      campaignId: campaignId || campaigns[0]?.id || '',
      ownerId: ownerId || users[0]?.id || '',
      title: cleanedTitle,
      phase,
      research: {
        audience: 'Publik & Media Nasional',
        trends: 'Tren industri terkini',
        issueAudit: 'Belum ada catatan risiko khusus.',
        issueRisk: risk,
        funnel,
        kpiMetric: 'Impressions / Reach',
        kpiTarget: 50000,
        pillar: pillar.trim() || 'Reputasi Korporasi',
        peso,
        competitorNotes: '-',
        format: 'Artikel + Konten Visual',
      },
      planning: {
        brief: 'Lengkapi creative brief di sini.',
        outline: '1. Hook\n2. Pesan Utama\n3. CTA',
        needsBriefRevision: false,
        briefRevisionNote: '',
        takeDate: todayStr,
        publishDate: todayStr,
        publishTime: '19:00',
        crewIds: ownerId ? [ownerId] : [],
        location: 'Kantor Pusat Jakarta',
        travelEstimate: '15 menit',
        gcalSynced: false,
        gdriveGenerated: false,
      },
      production: {
        stage: 'pra_produksi',
        preProdChecklist: { kamera: false, audio: false, lighting: false, briefingMeet: false },
        qcChecklist: { visualAudio: false, tonePR: false, brandSafety: false, akurasiData: false },
        revisions: [],
      },
      distribution: {
        channels: ['Instagram', 'LinkedIn'],
        published: false,
        sentiment: { positive: 0, neutral: 0, negative: 0 },
        mentions: 0,
        responseStatus: 'Belum Direspon',
      },
      evaluation: {
        kpiActual: 0,
        auditCause: '',
        auditNotes: '',
        actionTaken: '',
        archived: false,
      },
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/55 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-content-modal-title"
    >
      <div className="glass-panel rounded-[28px] w-full max-w-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200/70 dark:border-white/10 flex items-center justify-between">
          <h2 id="new-content-modal-title" className="font-display font-bold text-base text-slate-900 dark:text-white">
            Buat Item Konten PR Baru
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal konten baru"
            className="p-2 rounded-2xl text-slate-500 hover:bg-white/75 dark:hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="nc-title" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Judul Konten / Topik PR *
            </label>
            <input
              id="nc-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Siaran Pers Peluncuran Program Beasiswa"
              className="w-full px-3.5 py-2.5 text-sm rounded-2xl glass-input text-slate-900 dark:text-white outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="nc-campaign" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Kampanye (Relasional)
              </label>
              <select
                id="nc-campaign"
                value={campaignId}
                onChange={(e) => setCampaignId(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
              >
                <option value="">
                  {campaigns.length === 0
                    ? 'Belum ada kampanye (isi nanti)'
                    : 'Tanpa Kampanye'}
                </option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.client})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="nc-owner" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                PIC / Penanggung Jawab
              </label>
              <select
                id="nc-owner"
                value={ownerId}
                onChange={(e) => setOwnerId(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
              >
                <option value="">
                  {users.length === 0
                    ? 'Belum ada anggota tim (isi nanti)'
                    : 'Belum ditentukan'}
                </option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} — {u.role}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="nc-phase" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Mulai Fase
              </label>
              <select
                id="nc-phase"
                value={phase}
                onChange={(e) => setPhase(Number(e.target.value) as PhaseNumber)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
              >
                <option value={1}>Fase 1: Riset</option>
                <option value={2}>Fase 2: Planner</option>
                <option value={3}>Fase 3: Produksi</option>
              </select>
            </div>

            <div>
              <label htmlFor="nc-peso" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                PESO Model
              </label>
              <select
                id="nc-peso"
                value={peso}
                onChange={(e) => setPeso(e.target.value as PesoModel)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
              >
                <option value="Earned">Earned Media</option>
                <option value="Owned">Owned Media</option>
                <option value="Shared">Shared Media</option>
                <option value="Paid">Paid Media</option>
              </select>
            </div>

            <div>
              <label htmlFor="nc-funnel" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Funnel
              </label>
              <select
                id="nc-funnel"
                value={funnel}
                onChange={(e) => setFunnel(e.target.value as FunnelStage)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
              >
                <option value="Awareness">Awareness</option>
                <option value="Engagement">Engagement</option>
                <option value="Conversion">Conversion</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="nc-pillar" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Content Pillar
              </label>
              <input
                id="nc-pillar"
                type="text"
                value={pillar}
                onChange={(e) => setPillar(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label htmlFor="nc-risk" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Level Risiko Isu
              </label>
              <select
                id="nc-risk"
                value={risk}
                onChange={(e) => setRisk(e.target.value as IssueRisk)}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
              >
                <option value="Rendah">Rendah (Aman)</option>
                <option value="Sedang">Sedang (Perlu Monitor)</option>
                <option value="Tinggi">Tinggi (Potensi Krisis)</option>
              </select>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold rounded-full bg-gradient-to-r from-[#0284C7] via-[#17B5E8] to-[#0EA5A4] hover:brightness-105 text-white shadow-md shadow-[#17B5E8]/25 transition-all"
            >
              Simpan &amp; Buka Detail
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ================= 2. CAMPAIGN MODAL ================= */
interface CampaignModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<Campaign, 'id'>) => void;
}

export const CampaignModal: React.FC<CampaignModalProps> = ({ open, onClose, onSubmit }) => {
  const [name, setName] = useState('');
  const [client, setClient] = useState('');
  const [status, setStatus] = useState<CampaignStatus>('Aktif');
  const [budget, setBudget] = useState('150000000');

  useEffect(() => {
    if (open) {
      setName('');
      setClient('');
      setStatus('Aktif');
      setBudget('150000000');
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !client.trim()) return;
    onSubmit({
      name: name.trim(),
      client: client.trim(),
      status,
      budget: Number(budget) || 0,
      color: status === 'Krisis Monitor' ? 'rose' : 'indigo',
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/55 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="campaign-modal-title"
    >
      <div className="glass-panel rounded-[28px] w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200/70 dark:border-white/10 flex items-center justify-between">
          <h2 id="campaign-modal-title" className="font-display font-bold text-base text-slate-900 dark:text-white">
            Tambah Kampanye Baru
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal kampanye"
            className="p-2 rounded-2xl text-slate-500 hover:bg-white/75 dark:hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="cmp-name" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Nama Kampanye *
            </label>
            <input
              id="cmp-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Brand Refresh Q4 2026"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label htmlFor="cmp-client" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Nama Klien / Divisi *
            </label>
            <input
              id="cmp-client"
              type="text"
              required
              value={client}
              onChange={(e) => setClient(e.target.value)}
              placeholder="Contoh: PT Karya Mandiri Tbk"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="cmp-status" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Status
              </label>
              <select
                id="cmp-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as CampaignStatus)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
              >
                <option value="Aktif">Aktif</option>
                <option value="Perencanaan">Perencanaan</option>
                <option value="Krisis Monitor">Krisis Monitor</option>
                <option value="Selesai">Selesai</option>
              </select>
            </div>

            <div>
              <label htmlFor="cmp-budget" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Anggaran (IDR)
              </label>
              <input
                id="cmp-budget"
                type="number"
                min={0}
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold rounded-full bg-gradient-to-r from-[#0284C7] via-[#17B5E8] to-[#0EA5A4] hover:brightness-105 text-white shadow-md shadow-[#17B5E8]/25 transition-all"
            >
              Simpan Kampanye
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ================= 3. USER / CREW MODAL ================= */
interface UserModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<TeamUser, 'id'>) => void;
}

export const UserModal: React.FC<UserModalProps> = ({ open, onClose, onSubmit }) => {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [email, setEmail] = useState('');
  const [color, setColor] = useState<string>(AVATAR_COLORS[0].value);

  useEffect(() => {
    if (open) {
      setName('');
      setRole('');
      setEmail('');
      setColor(AVATAR_COLORS[0].value);
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !role.trim()) return;
    onSubmit({
      name: name.trim(),
      role: role.trim(),
      email: email.trim() || `${name.trim().toLowerCase().replace(/\s+/g, '.')}@prflow.id`,
      color,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/55 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="user-modal-title"
    >
      <div className="glass-panel rounded-[28px] w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200/70 dark:border-white/10 flex items-center justify-between">
          <h2 id="user-modal-title" className="font-display font-bold text-base text-slate-900 dark:text-white">
            Tambah Anggota Tim / Kru
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal anggota tim"
            className="p-2 rounded-2xl text-slate-500 hover:bg-white/75 dark:hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="usr-name" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Nama Lengkap *
            </label>
            <input
              id="usr-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Bima Santoso"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label htmlFor="usr-role" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Peran / Jabatan *
            </label>
            <input
              id="usr-role"
              type="text"
              required
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="Contoh: Media Relations Specialist"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label htmlFor="usr-email" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Email Kerja
            </label>
            <input
              id="usr-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="bima@prflow.id"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Warna Inisial
            </div>
            <div className="flex items-center gap-2">
              {AVATAR_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  aria-label={`Pilih warna ${c.label}`}
                  onClick={() => setColor(c.value)}
                  className={`w-7 h-7 rounded-full ${c.value} ${
                    color === c.value ? 'ring-2 ring-offset-2 ring-indigo-500 dark:ring-offset-slate-900' : ''
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold rounded-full bg-gradient-to-r from-[#0284C7] via-[#17B5E8] to-[#0EA5A4] hover:brightness-105 text-white shadow-md shadow-[#17B5E8]/25 transition-all"
            >
              Simpan Anggota
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ================= 4. ASSET MODAL ================= */
interface AssetModalProps {
  open: boolean;
  defaultContentId: string;
  contents: ContentItem[];
  users: TeamUser[];
  defaultDriveUrl: string;
  onClose: () => void;
  onSubmit: (data: {
    contentId: string;
    folder: DriveFolder;
    name: string;
    type: AssetFileType;
    url: string;
    version: string;
    uploadedBy: string;
  }) => void;
}

export const AssetModal: React.FC<AssetModalProps> = ({
  open,
  defaultContentId,
  contents,
  users,
  defaultDriveUrl,
  onClose,
  onSubmit,
}) => {
  const [name, setName] = useState('');
  const [contentId, setContentId] = useState('');
  const [folder, setFolder] = useState<DriveFolder>('01_Brief');
  const [type, setType] = useState<AssetFileType>('PDF');
  const [version, setVersion] = useState('v1.0');
  const [url, setUrl] = useState('');
  const [uploadedBy, setUploadedBy] = useState('');

  useEffect(() => {
    if (open) {
      setName('');
      setContentId(defaultContentId || contents[0]?.id || '');
      setFolder('01_Brief');
      setType('PDF');
      setVersion('v1.0');
      setUrl(defaultDriveUrl || 'https://drive.google.com');
      setUploadedBy(users[0]?.id || '');
    }
  }, [open, defaultContentId, contents, users, defaultDriveUrl]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({
      name: name.trim(),
      contentId,
      folder,
      type,
      version: version.trim() || 'v1.0',
      url: url.trim() || 'https://drive.google.com',
      uploadedBy: uploadedBy || users[0]?.id || '',
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[55] flex items-center justify-center p-4 bg-slate-950/55 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="asset-modal-title"
    >
      <div className="glass-panel rounded-[28px] w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200/70 dark:border-white/10 flex items-center justify-between">
          <h2 id="asset-modal-title" className="font-display font-bold text-base text-slate-900 dark:text-white">
            Tambah Tautan Aset Digital (DAM)
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal aset digital"
            className="p-2 rounded-2xl text-slate-500 hover:bg-white/75 dark:hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="ast-name" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Nama File *
            </label>
            <input
              id="ast-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Siaran_Pers_Final_v3.pdf"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label htmlFor="ast-content" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Tautkan ke Konten PR
            </label>
            <select
              id="ast-content"
              value={contentId}
              onChange={(e) => setContentId(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
            >
              <option value="">Umum (Tanpa Konten Spesifik)</option>
              {contents.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="ast-folder" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Folder Drive
              </label>
              <select
                id="ast-folder"
                value={folder}
                onChange={(e) => setFolder(e.target.value as DriveFolder)}
                className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
              >
                {DRIVE_FOLDERS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="ast-type" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tipe File
              </label>
              <select
                id="ast-type"
                value={type}
                onChange={(e) => setType(e.target.value as AssetFileType)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
              >
                {ASSET_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="ast-version" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Versi
              </label>
              <input
                id="ast-version"
                type="text"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="v1.0 / FINAL"
                className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label htmlFor="ast-uploader" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Diunggah Oleh
              </label>
              <select
                id="ast-uploader"
                value={uploadedBy}
                onChange={(e) => setUploadedBy(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
              >
                <option value="">
                  {users.length === 0 ? 'Belum ada anggota tim' : 'Belum ditentukan'}
                </option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="ast-url" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              URL Google Drive / Cloud *
            </label>
            <input
              id="ast-url"
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://drive.google.com/file/d/..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold rounded-full bg-gradient-to-r from-[#0284C7] via-[#17B5E8] to-[#0EA5A4] hover:brightness-105 text-white shadow-md shadow-[#17B5E8]/25 transition-all"
            >
              Simpan Aset
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ================= 5. REVISION REQUEST MODAL ================= */
interface RevisionModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (note: string) => void;
}

export const RevisionModal: React.FC<RevisionModalProps> = ({ open, onClose, onSubmit }) => {
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setNote('');
      setError('');
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = note.trim();
    if (!cleaned) {
      setError('Harap tuliskan detail catatan revisi terlebih dahulu.');
      return;
    }
    onSubmit(cleaned);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="revision-modal-title"
    >
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2
            id="revision-modal-title"
            className="font-display font-bold text-base flex items-center gap-2 text-rose-600 dark:text-rose-400"
          >
            <MessageSquareWarning className="w-5 h-5" aria-hidden="true" />
            Tolak / Minta Revisi Produksi
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal revisi"
            className="p-1 text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          Kartu akan dikembalikan ke tahap <strong>Editing &amp; Copywriting</strong>, catatan dicatat di riwayat revisi, dan notifikasi dikirim ke tim editor.
        </p>

        <div>
          <label htmlFor="rev-note" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Catatan Revisi (Teknis / Brand Safety / Klien) *
          </label>
          <textarea
            id="rev-note"
            rows={4}
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              if (error) setError('');
            }}
            placeholder="Contoh: Revisi kalimat di detik 0:15 agar lebih netral sesuai pedoman PR Brand Safety..."
            className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-rose-500"
          />
          {error && <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Batal
          </button>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white"
          >
            <Send className="w-3.5 h-3.5" aria-hidden="true" />
            Kirim Revisi
          </button>
        </div>
      </form>
    </div>
  );
};

/* ================= 6. CONFIRMATION MODAL ================= */
interface ConfirmModalProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  open,
  title,
  description,
  confirmLabel = 'Ya, Lanjutkan',
  onCancel,
  onConfirm,
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[65] flex items-center justify-center p-4 bg-slate-950/55 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div className="glass-panel rounded-[28px] w-full max-w-sm p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h2 id="confirm-modal-title" className="font-display font-bold text-base text-slate-900 dark:text-white">
              {title}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-5 py-2 text-xs font-semibold rounded-full bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20 transition-all"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ================= 7. TOAST STACK ================= */
interface ToastStackProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastStack: React.FC<ToastStackProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-20 right-5 z-[70] flex flex-col gap-2 max-w-sm w-full pointer-events-none"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto p-3.5 rounded-2xl glass-panel flex items-start gap-3 text-xs"
        >
          {t.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-[#059669] dark:text-[#2CE59B] shrink-0 mt-0.5" aria-hidden="true" />
          ) : t.type === 'warning' || t.type === 'danger' ? (
            <AlertTriangle
              className={`w-4 h-4 shrink-0 mt-0.5 ${
                t.type === 'danger' ? 'text-rose-600' : 'text-[#F37021]'
              }`}
              aria-hidden="true"
            />
          ) : (
            <Info className="w-4 h-4 text-[#0284C7] dark:text-[#38BDF8] shrink-0 mt-0.5" aria-hidden="true" />
          )}

          <div className="flex-1 min-w-0">
            <div className="font-bold text-slate-900 dark:text-white">{t.title}</div>
            <div className="text-slate-600 dark:text-slate-300 mt-0.5">{t.message}</div>
          </div>

          <button
            type="button"
            onClick={() => onDismiss(t.id)}
            aria-label="Tutup notifikasi"
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 shrink-0"
          >
            <X className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
};
