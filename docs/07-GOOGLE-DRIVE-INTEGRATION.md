# 07 — Google Drive Integration

## MVP approach
Use manual Google Drive links first. Store title, category, URL, song/version relation, version label, description, active flag, creator and timestamps. Validate URL server-side. Drive permissions remain authoritative; a saved link does not guarantee access.

## Suggested folder structure
```text
Music Team Hub - [Event]/
  00 Event Brief & Liturgi/
  01 Original Songs/
  02 Arrangement References/
  03 Part Guides/Keyboard/
  03 Part Guides/Guitar/
  03 Part Guides/Bass/
  03 Part Guides/Drums-Percussion/
  03 Part Guides/Vocal/
  03 Part Guides/Sequencer/
  04 Chord Charts & Lyrics/
  05 Click Cue & Sequencer/
  06 Rehearsal Recordings/
  07 Technical Rider & Equipment/
  08 Final Locked/
  09 Post Event Review/
```

## Naming convention
`[SongNo]_[SongTitle]_[AssetType]_[Key]_[BPM]_vNN_[YYYY-MM-DD]`  
Example format only: `03_SongTitle_ArrangementRef_D_92_v02_2026-10-30.mp3`.

## Categories
Original, Arrangement Reference, Part Guide, Chord Chart, Lyrics, Click/Cue, Sequencer, Rehearsal Recording, Final Asset, Technical Document, Other.

## Version management
Set one active material/version. When activating a new version, deactivate old one in a transaction, record change summary, and show active label clearly. Keep old files for history but mark superseded/archive.

## Permissions
Share files/folders with intended users. Avoid public access unless explicitly approved. If link fails, tell user to check active Google account and Drive permission. Do not store Google passwords.

## Future Drive API
Only add when manual links become limiting. Use minimal OAuth scopes, protect refresh tokens, keep service credentials server-only, handle quota/token expiry, and do not expose private files accidentally. App must work without Drive OAuth.
