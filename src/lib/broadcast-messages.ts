// Copy-ready WhatsApp message builders for onboarding (admin broadcast).
// Pure functions: every personal detail comes from arguments so the
// templates are unit-testable without a database.

export type BroadcastVariant = "band" | "singer" | "coordinator";

const BAND_SKILLS = new Set([
  "Keyboard",
  "Guitar Rhythm",
  "Guitar Lead",
  "Bass",
  "Drum",
]);

// Vocalists get the singer paragraph, band players the band paragraph,
// everyone else (e.g. rebana coordinator, no song assignment) the
// coordinator paragraph.
export function resolveBroadcastVariant(skills: string[]): BroadcastVariant {
  if (skills.some((s) => s.toLowerCase() === "vokal")) return "singer";
  if (skills.some((s) => BAND_SKILLS.has(s))) return "band";
  return "coordinator";
}

export interface DirectMessageInput {
  displayName: string;
  username: string;
  appUrl: string;
  inviteLinkPlaceholder?: string;
  passwordPlaceholder?: string;
  skills: string[];
  assignmentCount: number;
  isAdmin?: boolean;
}

const FIRST_NAME = (displayName: string) => displayName.split(" ")[0];

export function buildGroupMessage(appUrl: string): string {
  return [
    "Shalom semua! 🙏",
    "",
    "Perkenalkan *Music Youth Team Hub* — portal privat tim musik kita di",
    appUrl,
    "",
    "Di sana kalian bisa lihat: lagu-lagu yang ditugaskan ke masing-masing, materi latihan (chord, referensi, panduan part), update progres latihan sendiri, task, dan jadwal rehearsal. Semua terpusat, tidak tenggelam di chat. 🎶",
    "",
    "Caranya masuk: *link undangan pribadi akan saya japri ke masing-masing* (berlaku 7 hari, sekali pakai). Klik link → buat password sendiri → langsung masuk sebagai nama kalian.",
    "",
    "Mohon setelah masuk: lengkapi progres latihan lagu-lagunya ya, supaya MD bisa pantau kesiapan kita. Kalau link kedaluwarsa atau ada kendala login, japri saya langsung.",
    "",
    "Tuhan berkati pelayanan kita! 🎹🎸🥁🎤",
  ].join("\n");
}

const VARIANT_PARAGRAPH: Record<BroadcastVariant, string> = {
  band: "Di dalam ada lagu-lagu sesuai part kamu — tolong update progres latihannya (ada pilihan *Butuh bantuan* kalau ada bagian yang susah, tulis kendalanya).",
  singer:
    "Di dalam ada lagu-lagu bagian vokal kamu + materi referensinya — tolong update progres latihannya ya.",
  coordinator:
    "Task koordinasi akan muncul di *Task Saya*. Lagu tidak ada di daftar kamu karena memang tidak ada assignment vokal/band — itu normal ya.",
};

export function buildDirectMessage(input: DirectMessageInput): string {
  const variant = resolveBroadcastVariant(input.skills);
  const inviteLink = input.inviteLinkPlaceholder ?? "[LINK UNDANGAN]";
  const password = input.passwordPlaceholder ?? "[PASSWORD SEMENTARA]";
  const lines = [
    `Shalom ${FIRST_NAME(input.displayName)}! 🙏 Ini admin tim musik, mau kasih akses portal tim kita: *Music Youth Team Hub* 🎶`,
    "",
    "Klik link ini untuk masuk (berlaku 7 hari, sekali pakai, jangan diteruskan):",
    inviteLink,
    "",
    `Atau login manual di ${input.appUrl}/login`,
    `Username: ${input.username}`,
    `Password sementara: ${password}`,
    "",
    "Saat pertama masuk kamu diminta buat password sendiri ya.",
    "",
    VARIANT_PARAGRAPH[variant],
  ];
  if (input.isAdmin) {
    lines.push(
      "Catatan: akun kamu ADMIN — kamu juga bisa mempublikasikan lagu, mereview progres personel, dan mengelola akun dari dashboard.",
    );
  }
  lines.push("", "Kalau ada masalah login, kabari saya. Makasih banyak untuk pelayanannya! 🙌");
  return lines.join("\n");
}
