# 05 — Database Schema

Logical model for Prisma. Implement incrementally; preserve history. IDs can use CUID/UUID. All timestamps stored consistently (UTC recommended) and displayed in `Asia/Jakarta`.

## Entities

### User
`id`, `username` unique/normalized, `displayName`, `passwordHash`, `role` (`ADMIN|USER|OBSERVER`), `mustChangePassword`, `isActive`, `lastLoginAt?`, timestamps.

### Person
`id`, `userId?` unique, `displayName`, `congregation?`, `contact?` restricted, `notes?`, `isConfirmed`, `isActive`, timestamps. Person separates operational identity from login identity; may be simplified by combining with User in early MVP.

### InstrumentSkill / PersonSkill
InstrumentSkill: `id`, `name`. PersonSkill: `personId`, `instrumentSkillId`, `proficiencyNote?`; unique pair.

### Event
`id`, `name`, `description?`, `eventDate?`, `startTime?`, `endTime?`, `timezone` default Asia/Jakarta, `venue?`, `theme?`, `targetDurationMinutes?`, `eventStatus` (`DRAFT|PENDING_CONFIRMATION|CONFIRMED|COMPLETED|CANCELLED`), `liturgicalFlowUrl?`, `committeePicName?`, `committeePicContact?` restricted, `notes?`, timestamps.

### Song
`id`, `eventId`, `title`, `artistOrAuthor?`, `liturgicalFunction?`, `key?`, `bpm?`, `timeSignature?`, `estimatedDurationSeconds?`, `originalReferenceUrl?`, `arrangementNotes?`, `status`, `isPublished`, `isFinalLocked`, `activeArrangementVersionId?`, `createdById`, timestamps.

Song status: `DRAFT|SOURCE_SHARED|ARRANGEMENT_IN_PROGRESS|REFERENCE_READY|PRACTICING|NEEDS_REVIEW|READY_FOR_REHEARSAL|REHEARSAL_READY|FINAL_LOCKED`.

### SongBatch / SongBatchItem
SongBatch: `id`, `eventId`, `name`, `description?`, `releaseAt?`, `targetReviewAt?`, `status` (`DRAFT|PUBLISHED|REVIEWING|COMPLETED|ARCHIVED`), `createdById`, timestamps.  
SongBatchItem: `songBatchId`, `songId`, `sortOrder`; unique pair. Enforce one active batch per song if product rule requires it.

### SongAssignment
`id`, `songId`, `personId`, `instrumentSkillId?`, `assignmentNote?`, `isPrimary`, timestamps. Define uniqueness according to assignment semantics.

### ArrangementVersion
`id`, `songId`, `versionLabel`, `changeSummary`, `key?`, `bpm?`, `grooveNotes?`, `structureNotes?`, `referenceUrl?`, `isActive`, `isFinal`, `createdById`, `createdAt`. Service transaction ensures only one active version per song.

### ChartSection / ChartArrangement / ChartArrangementItem
ChartSection: `id`, `songId`, `type` (`INTRO|VERSE|PRE_CHORUS|CHORUS|POST_CHORUS|PRE_BRIDGE|BRIDGE|INTERLUDE|INSTRUMENTAL|SOLO|HOOK|BREAKDOWN|VAMP|TAG|TURNAROUND|KEY_CHANGE|ADLIB|SPOKEN|TRANSITION|REPRISE|ENDING|CODA|OTHER`), `label`, `content` (ChordPro, basis C), `sortOrder`, `createdById`, timestamps; unique `songId+label`. Sections are the song's master library and are shared by all its arrangements.

ChartArrangement: `id`, `songId`, `name`, `isActive`, `createdById`, timestamps; unique `songId+name`; at most one active arrangement per song. A named arrangement orders/repeats master sections independently of `ArrangementVersion`.

ChartArrangementItem: `id`, `arrangementId`, `sectionId`, `sortOrder`, `labelOverride?`, `createdAt`; unique `arrangementId+sortOrder`. Recomposition uses section content, so editing a master section updates every arrangement that uses it.

Legacy `ChordChart` remains as fallback/history. Public display precedence: active structured arrangement → active legacy `ChordChart` → empty. Legacy charts can be imported into sections/arrangement by an admin and then reviewed before saving. All chart mutations are admin-only and audited.

### SongMaterial
`id`, `songId`, `arrangementVersionId?`, `title`, `category`, `url`, `versionLabel?`, `description?`, `isActive`, `createdById`, timestamps. Categories: `ORIGINAL|ARRANGEMENT_REFERENCE|PART_GUIDE|CHORD_CHART|LYRICS|CLICK_CUE|SEQUENCER|REHEARSAL_RECORDING|FINAL_ASSET|OTHER`.

### PracticeProgress
`id`, `songId`, `personId`, `status` (`NOT_STARTED|LEARNING|TRIED_WITH_REFERENCE|NEEDS_HELP|READY_FOR_REHEARSAL`), `note?`, `updatedById`, `updatedAt`; unique song/person.

### Task
`id`, `eventId`, `title`, `description?`, `status` (`TODO|IN_PROGRESS|BLOCKED|DONE|CANCELLED`), `priority` (`LOW|MEDIUM|HIGH|CRITICAL`), `dueAt?`, `assigneePersonId?`, `relatedSongId?`, `relatedRehearsalId?`, `createdById`, timestamps.

### Rehearsal / RehearsalSong / RehearsalAttendance
Rehearsal: `id`, `eventId`, `title`, `type` (`ONLINE_MONITORING|ONSITE_SECTIONAL|FULL_REHEARSAL|TECHNICAL_REHEARSAL|EVENT_DAY_SOUNDCHECK|OTHER`), `startsAt`, `endsAt?`, `venueOrMeetingUrl?`, `agenda?`, `status` (`SCHEDULED|COMPLETED|CANCELLED|RESCHEDULED`), `notes?`, `createdById`, timestamps.  
RehearsalSong: `rehearsalId`, `songId`, `sortOrder`.  
RehearsalAttendance: `id`, `rehearsalId`, `personId`, `status` (`EXPECTED|PRESENT|ABSENT|LATE|EXCUSED`), `note?`; unique pair.

### EquipmentItem
`id`, `eventId`, `name`, `category`, `quantity`, `status` (`NOT_CHECKED|NEEDED|CONFIRMED|TESTED|BLOCKED|NOT_APPLICABLE`), `ownerOrSource?`, `assigneePersonId?`, `dueAt?`, `notes?`, `createdById`, timestamps.

### DecisionLog
`id`, `eventId`, `title`, `decisionType` (`MUSICAL|EVENT|TECHNICAL|PERSONNEL|OTHER`), `decisionText`, `reason?`, `decidedBy?`, `relatedSongId?`, `relatedRehearsalId?`, `createdById`, `createdAt`.

### AuditLog
`id`, `actorUserId?`, `action`, `entityType`, `entityId`, `summary`, `metadataJson?` (never secrets), `createdAt`.

## Relationships and rules
Event has songs, batches, tasks, rehearsals, equipment, decisions. Song has assignments, versions, materials, progress. Person has skills, assignments, progress, tasks, attendance. Rehearsal links songs and people.

Use transactions for version activation; archive rather than delete referenced songs; preserve user history after deactivation; validate BPM/duration and date ranges; normalize usernames; restrict contact fields.

## Indexes
Unique username; indexes for event/status/published songs, batch status, progress person/song, task status/due/assignee, rehearsal starts/status, equipment status, audit entity/date.

## Authorization
Admin can manage event records. User sees published/relevant data, assigned songs/tasks, and own progress. Observer (`OBSERVER`, label UI "Pantau") sees all published data and all personnel progress on published songs plus publish-scoped tasks, and may create suggestions (Task `TODO` without PIC, moderated by MD). Observer cannot see DRAFT songs, contacts, or manage anything. User cannot change other users' progress or roles. Enforce server-side.
