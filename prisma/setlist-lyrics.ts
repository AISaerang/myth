import type { ChartSectionKind } from "@/lib/chart-arrangement";

export interface SetlistLyricSection {
  label: string;
  type: ChartSectionKind;
  content: string;
}

export interface SetlistLyricArrangementItem {
  label: string;
  labelOverride?: string;
}

export interface SetlistLyricSong {
  title: string;
  arrangementName: string;
  sections: SetlistLyricSection[];
  items: SetlistLyricArrangementItem[];
}

export const SETLIST_LYRICS: SetlistLyricSong[] = [
  {
    title: "Ku Tak Pandang dari Gereja Mana",
    arrangementName: "Aransemen Utama",
    sections: [
      {
        label: "Verse 1",
        type: "VERSE",
        content: [
          "Ku tak pandang dari Gereja mana",
          "Asal kau berdiri atas FirmanNYA",
          "Kalau hatimu seperti hati ku",
          "Kaulah saudara dan saudariku",
        ].join("\n"),
      },
      {
        label: "Verse 2",
        type: "VERSE",
        content: [
          "Ku tak pandang dari GMIM mana",
          "Asal kau berdiri atas FirmanNYA",
          "Kalau hatimu seperti hati ku",
          "Kalaulah saudara dan saudariku",
        ].join("\n"),
      },
    ],
    items: [{ label: "Verse 1" }, { label: "Verse 2" }],
  },
  {
    title: "NNBT No. 20 Kami Bersyukur padaMu Tuhan",
    arrangementName: "Aransemen Utama",
    sections: [
      {
        label: "Verse 1",
        type: "VERSE",
        content: [
          "Kami bersyukur padaMu Tuhan: kami memuji namaMu.",
          "berkat melimpah Engkau berikan bagi kami tiap hari.",
          "Kami umatMu, Kau selamatkan, kami umatMu, Engkau pulihkan, karna kasihMu di dalam Yesus, kami beroleh hidup yang kekal.",
        ].join("\n"),
      },
      {
        label: "Chorus",
        type: "CHORUS",
        content: [
          "O haleluya! O, haleluya! Mulia namaMu Tuhan,",
          "kar'na kasihMu dan anug'rahMu kami beroleh kehidupan kekal",
        ].join("\n"),
      },
      {
        label: "Verse 2",
        type: "VERSE",
        content: [
          "Syukur padaMu, ya Roh Kudus, Kau melindungi umatMu.",
          "B'ri kekuatan dan pengharapan dalam badai cobaan.",
          "Hanya padaMu kami berserah, hanya padaMu kami berteduh.",
          "Engkau menghibur dan menenangkan, membuat hati berbahagia",
        ].join("\n"),
      },
    ],
    items: [{ label: "Verse 1" }, { label: "Chorus" }, { label: "Verse 2" }],
  },
  {
    title: "Obor Pembangunan",
    arrangementName: "Aransemen Utama",
    sections: [
      {
        label: "Verse 1",
        type: "VERSE",
        content: [
          "Di atas satu iman",
          "Pemuda g'reja ber-esa",
          "Menjadi saksi Tuhan",
          "Ketiga yang esa",
        ].join("\n"),
      },
      {
        label: "Verse 2",
        type: "VERSE",
        content: [
          "Sadarkan jiwa kita",
          "Pada tugas panggilanNya",
          "Nyatakan sungguh-sungguh",
          "Kristus Panglimamu",
        ].join("\n"),
      },
      {
        label: "Pre-Chorus",
        type: "PRE_CHORUS",
        content: [
          "Jadilah kau",
          "Umat yang bekerja",
          "Dengan semua",
          "Greja Tuhan yang esa",
        ].join("\n"),
      },
      {
        label: "Chorus",
        type: "CHORUS",
        content: [
          "Kita maju dan bekerja",
          "Dalam Kristus kita menang",
          "(Ayolah)",
          "Membangun dunia baru",
          "Sejaht'ra dan bersatu",
          "Bangkitkan jiwa ragamu",
          "Bagi umat dan manusia",
          "Pemuda gereja jadilah",
          "Obor pembangunan",
        ].join("\n"),
      },
    ],
    items: [
      { label: "Verse 1" },
      { label: "Verse 2" },
      { label: "Pre-Chorus" },
      { label: "Chorus" },
    ],
  },
];
