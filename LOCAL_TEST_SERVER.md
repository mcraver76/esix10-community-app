# Community app: local test server

Michael's rule (2026-11-26): "We need to build everything out on a test server… local hosts to play with designs… Nothing that we do will go into the live database until we get it locked in pretty well."

This runs the whole community app **on this Mac**, with **made-up people and posts**. It can't reach the live database: the app refuses to start in test mode unless it's pointed at the local one.

## See it (Michael)
The easiest way is to ask Lúthien: "show me the community test app." She opens it in the browser pane.

To open it yourself, paste this into Terminal:
```bash
zsh ~/claude/esix10/scripts/start-local.sh
```
Then open **http://localhost:5310** in your browser. Press Ctrl+C in Terminal to stop the app.

- Start over with fresh fake data: add `--reset` to the end.
- Stop the test database: add `--stop` to the end.

## Test logins (fake, local only)
| Who | Email | Can do |
|---|---|---|
| Admin | admin@example.test | everything, plus the admin dashboard |
| Moderator | mod@example.test | approvals and moderation |
| Members | james@, maria@, david@example.test | normal member views |
| Waiting for approval | newbie@example.test | the "under review" experience |

All of them share one test password, kept in `supabase/seed.sql` (line 14). It only works on this Mac.

**Extras:** the test database dashboard is at http://localhost:55323. Test emails don't go out; they land in a fake inbox at http://localhost:55324.

## For the elves
- Ports are 553xx and the app is on 5310. That way it can run beside Idril's Alliance test server (543xx).
- Fake data lives in `supabase/seed.sql`, and the schema comes from `supabase/migrations/`. The start script rebuilds it all from those files, which is also our test that the Dec 1 fresh database can be rebuilt.
- `src/supabaseClient.js` throws an error in dev mode if no local address is given. It never falls back to live.
- Going live later needs Michael's own yes, once a design is locked in.
