import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  authenticateAgencyAccount,
  buildGoogleCalendarUrl,
  computeDashboardMetrics,
  computeKpiAchievement,
  createEmptyDatabase,
  detectScheduleConflicts,
  filterContents,
  generateCSVContent,
  generateICSContent,
  registerAgencyAccount,
  validateImportDatabase,
} from './prflowLogic.ts';
import type { ContentItem, PRFlowDatabase, TeamUser } from '../types/prflow.ts';

function buildFixtureDb(): PRFlowDatabase {
  const base = createEmptyDatabase(new Date('2026-11-10T00:00:00Z'));
  const users: TeamUser[] = [
    {
      id: 'usr-1',
      name: 'Rina Kusuma',
      role: 'Executive Producer',
      email: 'rina@agency.id',
      color: 'bg-indigo-600',
    },
    {
      id: 'usr-2',
      name: 'Dimas Saputra',
      role: 'Videografer',
      email: 'dimas@agency.id',
      color: 'bg-emerald-600',
    },
  ];
  const campaigns = [
    {
      id: 'cmp-1',
      name: 'Corporate Sustainability',
      client: 'PT Nusantara Hijau',
      status: 'Aktif' as const,
      budget: 150000000,
      color: 'emerald',
    },
    {
      id: 'cmp-2',
      name: 'Nusantara AI Launch',
      client: 'Nusantara Tech',
      status: 'Aktif' as const,
      budget: 250000000,
      color: 'indigo',
    },
  ];
  const makeContent = (overrides: Partial<ContentItem>): ContentItem => ({
    id: 'cnt-1',
    campaignId: 'cmp-1',
    ownerId: 'usr-1',
    title: 'Konten A',
    phase: 2,
    research: {
      audience: 'Media',
      trends: 'ESG',
      issueAudit: 'Aman',
      issueRisk: 'Rendah',
      funnel: 'Awareness',
      kpiMetric: 'Reach',
      kpiTarget: 10000,
      pillar: 'ESG',
      peso: 'Earned',
      competitorNotes: '-',
      format: 'Video',
    },
    planning: {
      brief: 'Brief',
      outline: 'Outline',
      needsBriefRevision: false,
      briefRevisionNote: '',
      takeDate: '2026-11-15',
      publishDate: '2026-11-20',
      publishTime: '19:00',
      crewIds: ['usr-1', 'usr-2'],
      location: 'Jakarta',
      travelEstimate: '20 menit',
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
      channels: ['Instagram'],
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
    ...overrides,
  });

  const contents: ContentItem[] = [
    makeContent({ id: 'cnt-1', title: 'Press Tour AI', campaignId: 'cmp-2' }),
    makeContent({
      id: 'cnt-2',
      title: 'Video Profil CEO',
      campaignId: 'cmp-1',
      planning: {
        brief: 'Brief CEO',
        outline: 'Outline',
        needsBriefRevision: false,
        briefRevisionNote: '',
        takeDate: '2026-11-15',
        publishDate: '2026-11-22',
        publishTime: '18:00',
        crewIds: ['usr-1'],
        location: 'GBK Senayan',
        travelEstimate: '15 menit',
        gcalSynced: false,
        gdriveGenerated: false,
      },
    }),
    makeContent({
      id: 'cnt-3',
      title: 'Klarifikasi Layanan',
      phase: 5,
      research: {
        audience: 'Publik',
        trends: 'Downtime',
        issueAudit: 'Krisis',
        issueRisk: 'Tinggi',
        funnel: 'Engagement',
        kpiMetric: 'Sentimen %',
        kpiTarget: 80,
        pillar: 'Krisis',
        peso: 'Earned',
        competitorNotes: '-',
        format: 'Statement',
      },
      planning: {
        brief: 'Brief Krisis',
        outline: 'Outline',
        needsBriefRevision: false,
        briefRevisionNote: '',
        takeDate: '2026-11-18',
        publishDate: '2026-11-19',
        publishTime: '17:00',
        crewIds: ['usr-2'],
        location: 'HQ Jakarta',
        travelEstimate: '10 menit',
        gcalSynced: false,
        gdriveGenerated: false,
      },
      distribution: {
        channels: ['Instagram'],
        published: true,
        sentiment: { positive: 60, neutral: 20, negative: 20 },
        mentions: 120,
        responseStatus: 'Sedang Ditangani',
      },
      evaluation: {
        kpiActual: 60,
        auditCause: 'Pesan',
        auditNotes: '',
        actionTaken: '',
        archived: false,
      },
    }),
  ];

  return { ...base, users, campaigns, contents };
}

describe('PRFlow Workspace Pro fresh state & auth logic', () => {
  it('initializes a completely empty fresh database with zero demo records', () => {
    const empty = createEmptyDatabase();
    assert.equal(empty.users.length, 0);
    assert.equal(empty.campaigns.length, 0);
    assert.equal(empty.contents.length, 0);
    assert.equal(empty.assets.length, 0);
    assert.equal(empty.archives.length, 0);
    assert.equal(empty.notifications.length, 0);
  });

  it('registers a fresh agency account and authenticates without any hardcoded demo accounts', () => {
    // Login fails cleanly when no accounts exist
    const failNoAcc = authenticateAgencyAccount([], {
      workspaceId: 'PR-JKT-01',
      email: 'director@prflow-agency.id',
      password: 'PRFlow2026!',
    });
    assert.equal(failNoAcc.session, undefined);
    assert.ok(failNoAcc.error);

    // Register new account
    const reg = registerAgencyAccount([], {
      name: 'Nadia Putri',
      workspaceId: 'ag-nusantara',
      role: 'PR Account Director',
      email: 'nadia@nusantara-pr.id',
      password: 'PasswordKuat123',
    });
    assert.ok(reg.account);
    assert.equal(reg.account.workspaceId, 'AG-NUSANTARA');

    // Duplicate registration rejected
    const dup = registerAgencyAccount([reg.account], {
      name: 'Nadia Lain',
      workspaceId: 'AG-NUSANTARA',
      role: 'Content Strategist',
      email: 'nadia@nusantara-pr.id',
      password: 'PasswordLain123',
    });
    assert.equal(dup.account, undefined);
    assert.ok(dup.error);

    // Authenticate registered account
    const okLogin = authenticateAgencyAccount([reg.account], {
      workspaceId: 'ag-nusantara',
      email: 'nadia@nusantara-pr.id',
      password: 'PasswordKuat123',
    });
    assert.ok(okLogin.session);
    assert.equal(okLogin.session.name, 'Nadia Putri');
    assert.equal(okLogin.session.workspaceId, 'AG-NUSANTARA');
  });

  it('detects relational crew schedule conflicts and clears once rescheduled', () => {
    const db = buildFixtureDb();
    const result = detectScheduleConflicts(db.contents, db.users);
    assert.equal(result.conflicts.length, 1);
    assert.equal(result.conflicts[0].user.id, 'usr-1');
    assert.ok(result.conflictedContentIds.has('cnt-1'));
    assert.ok(result.conflictedContentIds.has('cnt-2'));

    const updatedContents = db.contents.map((c) =>
      c.id === 'cnt-2' ? { ...c, planning: { ...c.planning, takeDate: '2026-11-25' } } : c
    );
    const afterReschedule = detectScheduleConflicts(updatedContents, db.users);
    assert.equal(afterReschedule.conflicts.length, 0);
  });

  it('filters contents by campaign and relational crew/client search query', () => {
    const db = buildFixtureDb();
    const byCampaign = filterContents(db.contents, db.campaigns, db.users, '', 'cmp-2');
    assert.equal(byCampaign.length, 1);
    assert.equal(byCampaign[0].id, 'cnt-1');

    const byCrew = filterContents(db.contents, db.campaigns, db.users, 'Dimas', 'ALL');
    assert.equal(byCrew.length, 2);
  });

  it('computes dashboard metrics, KPI achievement, ICS, GCal, CSV and JSON import validation', () => {
    const db = buildFixtureDb();
    const metrics = computeDashboardMetrics(db.contents);
    assert.equal(metrics.totalContents, 3);
    assert.equal(metrics.publishedCount, 1);
    assert.equal(metrics.avgPositiveSentiment, 60);
    assert.equal(metrics.crisisItems.length, 1);
    assert.equal(computeKpiAchievement(60, 80), 75);

    const ics = generateICSContent(db.contents[0], db.campaigns[1]);
    assert.ok(ics.includes('BEGIN:VCALENDAR'));
    assert.ok(ics.includes('Press Tour AI'));

    const gcalUrl = buildGoogleCalendarUrl(db.contents[0], db.campaigns[1], db.users);
    assert.ok(gcalUrl.startsWith('https://calendar.google.com/calendar/render?action=TEMPLATE'));

    const csv = generateCSVContent(db);
    assert.ok(csv.startsWith('\uFEFFID,Judul,Kampanye'));
    assert.ok(csv.includes('Press Tour AI'));

    const validated = validateImportDatabase(db);
    assert.equal(validated.contents.length, 3);
    assert.throws(() => validateImportDatabase({ foo: 'bar' }));
  });
});
