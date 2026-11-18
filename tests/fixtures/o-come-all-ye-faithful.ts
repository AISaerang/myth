export const oComeAllYeFaithfulFixture = {
  title: "O Come, All Ye Faithful",
  baseKey: "C",
  originalKey: "G",
  timeSignature: "4/4",
  sections: [
    {
      id: "fixture-verse",
      label: "Verse",
      content:
        "O [C]come, all ye [G]faith[C]ful, [Am]joy[G]ful and [D]tri[G]umph[G]ant,\n" +
        "O [C]come ye, O [G]come [D7]ye to [G7]Beth[D]e[G]lehem;\n" +
        "[C]Come and be[G]hold [C]Him, [F]born the [C]King of [G]an[C]gels;",
      dynamic: "mp",
      rhythm: {
        guitar: "D - D u",
        piano: "LH root on beats 1 and 3",
      },
    },
    {
      id: "fixture-chorus",
      label: "Refrain / Chorus",
      content:
        "O come, let us a[C]dore Him, O come, let us a[G]dore Him,\n" +
        "O [C]come, let us a[F]dore [C]Him, [F]Chr[C]ist [G]the [C]Lord.",
      dynamic: "cresc.",
      rhythm: {
        guitar: "D D u u D u",
      },
    },
  ],
} as const;
