# Config Sync UI Requirements

## Context

RavenBrain now has a `POST /api/config-sync` endpoint (ROLE_SUPERUSER only) that syncs config data from a source RavenBrain instance to the local (target) instance. RavenEye needs a UI page for developers to trigger this sync.

## Page: "Sync from Source"

**Access:** Superuser only (hide from navigation for non-superuser roles)

### Layout

1. **Header**: "Sync from Source" with a brief description: "Pull configuration data from a source RavenBrain server. This will replace all local config data and clear scouting events and comments."

2. **Form fields:**
   - **Source Server URL** — text input, placeholder `http://source-server:8888`. Required.
   - **Username** — text input. Required. This is the developer's login on the source server.
   - **Password** — password input. Required.

3. **Warning banner** (always visible): "This will delete ALL local scouting events, comments, and config data before importing from the source server."

4. **Action button**: "Sync Now" — triggers the API call. Disabled while syncing.

5. **Progress/Result area:**
   - While syncing: spinner with "Syncing from {url}..."
   - On success: summary table showing record counts (strategy areas, event types, sequence types, sequence events, tournaments, schedules) + success message
   - On error: error message with details (e.g., "Authentication failed", "Could not connect to source server", "Server error: ...")

### API Call

```
POST /api/config-sync
Authorization: Bearer <target-jwt-token>
Content-Type: application/json

{
  "sourceUrl": "<value from form>",
  "sourceUser": "<value from form>",
  "sourcePassword": "<value from form>"
}
```

### Response

```json
{
  "strategyAreas": 5,
  "eventTypes": 42,
  "sequenceTypes": 8,
  "sequenceEvents": 24,
  "tournaments": 6,
  "schedules": 450,
  "message": "Sync completed successfully from http://source-server:8888"
}
```

### Behavior Notes

- The form authenticates against the LOCAL (target) server using the developer's existing JWT session
- The form values (`sourceUser`/`sourcePassword`) are credentials for the SOURCE server
- The URL field should persist in the browser (localStorage) so devs don't need to re-enter it each time
- The password field should never be persisted
