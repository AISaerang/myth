"use client";

import { useState } from "react";

/**
 * Panduan singkat simbol not angka. Dipakai di editor bagian chart (dekat
 * hint) dan viewer (dekat kontrol transpose) supaya MD/penyusun tahu sintaks
 * yang dirender CSS oleh NotationLine.
 */
export function NotationSymbolGuide({
  compact = false,
}: {
  compact?: boolean;
}) {
  const [open, setOpen] = useState(!compact);

  return (
    <div
      data-notation-guide=""
      className="rounded-lg border border-zinc-300 dark:border-zinc-700"
    >
      <button
        type="button"
        onClick={() => setOpen((next) => !next)}
        aria-expanded={open}
        className="flex min-h-[44px] w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm font-medium"
      >
        Panduan not angka
        <span aria-hidden className="text-zinc-500">
          {open ? "−" : "?"}
        </span>
      </button>
      {open ? (
        <div className="px-3 pb-3">
          <table className="w-full text-xs leading-5">
            <thead>
              <tr className="text-left text-zinc-500">
                <th scope="col" className="pr-3 font-medium">
                  Ketik
                </th>
                <th scope="col" className="font-medium">
                  Hasil
                </th>
              </tr>
            </thead>
            <tbody className="font-mono">
              <tr>
                <td className="pr-3 align-top">5</td>
                <td className="align-top">nada 5</td>
              </tr>
              <tr>
                <td className="pr-3 align-top">5&#39; atau 5&#39;&#39;</td>
                <td className="align-top">titik di atas (oktaf naik)</td>
              </tr>
              <tr>
                <td className="pr-3 align-top whitespace-nowrap">
                  5, atau .5
                </td>
                <td className="align-top">titik di bawah (oktaf turun)</td>
              </tr>
              <tr>
                <td className="pr-3 align-top whitespace-nowrap">#4 / b7</td>
                <td className="align-top">kres (♯) / mol (♭) pada angka</td>
              </tr>
              <tr>
                <td className="pr-3 align-top whitespace-nowrap">
                  [5 6] / [[5 6]]
                </td>
                <td className="align-top">beam 1 / 2 garis di atas</td>
              </tr>
              <tr>
                <td className="pr-3 align-top whitespace-nowrap">(5 6)</td>
                <td className="align-top">slur/legato di bawah angka</td>
              </tr>
              <tr>
                <td className="pr-3 align-top whitespace-nowrap">5/ 5//</td>
                <td className="align-top">garis bawah setengah / seperempat</td>
              </tr>
              <tr>
                <td className="pr-3 align-top">-</td>
                <td className="align-top">tahan belakang nada</td>
              </tr>
              <tr>
                <td className="pr-3 align-top">|</td>
                <td className="align-top">birama</td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
