import type { BlogArticle } from '../types/prflow';

export const BLOG_CATEGORIES = [
  'Semua',
  'Strategi PR',
  'Krisis & Reputasi',
  'PESO & Digital',
  'Studi Kasus',
] as const;

export const BLOG_ARTICLES: BlogArticle[] = [
  {
    id: 'art-1',
    category: 'Strategi PR',
    title: 'Panduan Menerapkan Model PESO di PR Agency Modern',
    excerpt:
      'Mengintegrasikan Paid, Earned, Shared, dan Owned Media agar kampanye reputasi klien berjalan selaras sejak tahap riset.',
    author: 'Tim Editorial PRFlow',
    date: '22 Nov 2026',
    readTime: '6 menit baca',
    content: [
      'Di tengah fragmentasi media saat ini, mengandalkan siaran pers saja tidak lagi cukup untuk membangun reputasi korporasi yang konsisten. Tim PR perlu memadukan seluruh spektrum PESO Model sejak tahap Riset & Strategi (Fase 1).',
      'Owned Media menjadi pusat narasi resmi melalui website korporasi, laporan keberlanjutan, dan ruang berita. Earned Media menghadirkan kredibilitas pihak ketiga melalui liputan jurnalis dan media bisnis. Shared Media memperluas percakapan organik di kanal sosial, sementara Paid Media mempercepat jangkauan pesan kunci ke audiens prioritas.',
      'Dengan memetakan setiap konten ke kategori PESO sejak awal, pimpinan agensi dapat mengevaluasi keseimbangan portofolio kampanye secara objektif melalui grafik evaluasi Fase 5.',
    ],
  },
  {
    id: 'art-2',
    category: 'Krisis & Reputasi',
    title: 'Protokol Golden Hour: Meredam Lonjakan Sentimen Negatif di Bawah 60 Menit',
    excerpt:
      'Langkah operasional bagi tim Brand Safety saat gangguan layanan atau isu sensitif mulai menyebar di media sosial.',
    author: 'Tim Editorial PRFlow',
    date: '18 Nov 2026',
    readTime: '5 menit baca',
    content: [
      'Dalam manajemen krisis Public Relations, 60 menit pertama menentukan apakah sebuah insiden dapat diredam cepat atau berkembang menjadi krisis reputasi berskala luas.',
      'Langkah utama meliputi verifikasi fakta internal secara paralel dengan pemantauan rasio sentimen publik (Positif, Netral, Negatif). Begitu sentimen negatif melewati ambang 20%, tim PR mengaktifkan audit akar penyebab serta menyiapkan pernyataan resmi yang empatik, transparan, dan mudah dipahami pelanggan.',
      'Pastikan seluruh draf klarifikasi melewati gerbang QC Brand Safety sebelum dipublikasikan serentak di kanal resmi dan jaringan media.',
    ],
  },
  {
    id: 'art-3',
    category: 'PESO & Digital',
    title: 'Menghilangkan Bentrok Jadwal Kru & Kerancuan Folder Aset Produksi',
    excerpt:
      'Cara menyusun kalender produksi relasional yang menyatukan jadwal kru, lokasi liputan, dan struktur folder 01_Brief hingga 03_Final_Asset.',
    author: 'Tim Editorial PRFlow',
    date: '14 Nov 2026',
    readTime: '4 menit baca',
    content: [
      'Salah satu kendala klasik agensi PR yang menangani banyak klien secara bersamaan adalah bentrok jadwal take antar kru lapangan serta file mentah yang tersebar di berbagai percakapan.',
      'Dengan menyatukan Content Planner bersama kalender anti-bentrok, ekspor jadwal .ICS / Google Calendar, peta lokasi liputan, dan repositori aset terstruktur (01_Brief, 02_Raw_Footage, 03_Final_Asset), tim produksi dapat menjaga tempo kerja tanpa hambatan administratif.',
    ],
  },
  {
    id: 'art-4',
    category: 'Studi Kasus',
    title: 'Menyusun Kampanye ESG Tanpa Risiko Greenwashing lewat Data Terverifikasi',
    excerpt:
      'Pendekatan audit isu dan storytelling dokumenter pendek untuk meningkatkan kredibilitas program keberlanjutan perusahaan.',
    author: 'Tim Editorial PRFlow',
    date: '09 Nov 2026',
    readTime: '7 menit baca',
    content: [
      'Publik dan media bisnis semakin kritis terhadap klaim keberlanjutan korporasi. Infografis generik tanpa bukti lapangan sering memicu keraguan bahkan kritik di kanal sosial.',
      'Kunci keberhasilannya terletak pada penyajian metrik dampak yang dapat diverifikasi, dikemas dalam narasi dokumenter singkat yang menampilkan suara pelaksana di lapangan secara jujur serta melampirkan ringkasan laporan di kanal Owned Media.',
    ],
  },
  {
    id: 'art-5',
    category: 'Krisis & Reputasi',
    title: '4 Parameter Checklist QC Brand Safety Sebelum Final Approval Klien',
    excerpt:
      'Standar pemeriksaan visual, tone of voice PR, sensitivitas isu sosial, dan akurasi data sebelum aset disetujui untuk tayang.',
    author: 'Tim Editorial PRFlow',
    date: '04 Nov 2026',
    readTime: '5 menit baca',
    content: [
      'Sebelum materi diserahkan kepada klien atau pimpinan untuk persetujuan akhir, tim internal wajib menyelesaikan empat gerbang pemeriksaan: kualitas visual dan audio, kesesuaian tone of voice PR, sensitivitas isu terkini, serta akurasi data.',
      'Apabila salah satu kriteria belum terpenuhi, papan Kanban QC mengembalikan kartu ke tahap Editing & Copywriting disertai catatan revisi yang tercatat rapi agar perbaikan berlangsung terarah.',
    ],
  },
  {
    id: 'art-6',
    category: 'Strategi PR',
    title: 'Mengubah Laporan Evaluasi Kampanye Menjadi Arsip Pembelajaran Agensi',
    excerpt:
      'Mengukur capaian KPI aktual terhadap target, mendokumentasikan pembelajaran kunci, dan memulai siklus kampanye berikutnya dengan lebih tajam.',
    author: 'Tim Editorial PRFlow',
    date: '29 Okt 2026',
    readTime: '6 menit baca',
    content: [
      'Nilai strategis tertinggi dalam pekerjaan PR tidak berhenti saat konten tayang, melainkan hadir di Fase 5: Evaluasi & Optimasi.',
      'Dengan mengekspor laporan terstruktur ke CSV, membandingkan capaian aktual terhadap target KPI, dan menyimpan temuan penting ke Arsip Pembelajaran, agensi membangun pengetahuan institusional yang dapat digunakan ulang lintas kampanye.',
    ],
  },
];
