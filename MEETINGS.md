# Meetings

The admin Meetings page is at `/meetings`. Its Notion database lives under **DAD — Business Command Center** and is configured in `server/meetings-config.json`. An optional `NOTION_MEETINGS_DB_ID` environment variable overrides it.

## Workflow

1. **New meeting:** enter the title, date/time, person and entity. Add their post, core functionality, contact information, DAD owner, attendees, agenda, venue/video link and supporting documents.
2. Click a meeting card to open the complete record in the right drawer.
3. **Record outcome:** capture notes, outcome, decisions and action items with owners/deadlines. Completed meetings require an outcome.
4. Use **Past meetings** to review earlier records, including scheduled meetings whose time has passed and still need an outcome. Records are retained, not deleted.
5. Set a follow-up to **Pending**, specify the next contact date, authorised person and action. Set it to **Done** after chasing the person. **Schedule next meeting** creates a separate linked record; it deliberately does not mark an outstanding follow-up as done.

All dashboard date/time entry and display uses **Asia/Kolkata (IST)**. Notion stores timezone-aware timestamps.

## Reminders

- Upcoming meetings and pending follow-ups appear in the right panel and the home dashboard widget. Alerts begin at the selected interval (at the scheduled time, 1 hour, 1 day or 2 days before). Overdue follow-ups remain visible until marked Done; cancelled meetings do not generate alerts.
- Email is **off by default**, opt-in per meeting. It requires `EMAIL_FROM`, `EMAIL_PASSWORD` and `EMAIL_TO` on the server. The form disables the option when these are absent.
- A job checks every five minutes. Email goes only to `EMAIL_TO`, never automatically to the meeting contact. Meeting reminders catch up until the meeting's end (or one hour after its start if no end is set); follow-up reminders catch up for 24 hours.
- Sent signatures are stored in Notion to avoid repeat emails across restarts. Changing the reminder time/date makes a new reminder eligible. As with SMTP generally, a process failure after delivery but before recording the signature can cause a retry.
- No email was sent during feature verification.

## Deployment

The database has already been created and verified using the existing dashboard integration. Do not run setup again during normal deployment. No new npm dependencies or database migration are required.

```bash
cd /var/www/dad-dashboard &&
git pull --ff-only origin main &&
npm test &&
pm2 restart dad-dashboard &&
git log -1 --oneline &&
pm2 logs dad-dashboard --lines 20 --nostream
```

For a separate Notion workspace, `node scripts/setup-meetings.js` finds or creates a Meetings database alongside the configured Team database and writes its non-secret ID to the config file. The integration must have create/update permissions.

## Validation

`npm test` covers existing page regressions, meeting property round-trips, required fields, date/URL validation, outcome/follow-up requirements, history filters, reminder windows, sent-signature deduplication, pagination, cache invalidation, stale-edit checks, and preventing writes to unrelated Notion databases.

The page, list API, create API and edit API require the existing admin session. Editing includes a last-edited check to detect stale forms; Notion does not provide atomic compare-and-swap, so avoid simultaneously editing the same record in multiple clients.
