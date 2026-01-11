# Music Madness Testing Plan

## 1. Admin Dashboard (`/admin`)

### Authentication
- [ ] Attempt to access `/admin` without logging in. Verify redirection or login form.
- [ ] Enter incorrect password. Verify error message.
- [ ] Enter correct password (`musicmom`). Verify access to Dashboard.

### Bracket Management
- [ ] **Create Bracket**: Enter a name and click "Create". Verify it appears in the dropdown.
- [ ] **Switch Viewing**: Select a different bracket and click "Go". Verify the "Bracket:" header updates.
- [ ] **Make Active**: Click "Make Active Publicly". Verify:
    - The dropdown label includes `(Active)`.
    - Navigating to `/vote` shows matches from *this* bracket.
    - The Admin dashboard stays on this bracket.
- [ ] **Empty State**: Create a new bracket. Verify "No matches found." is displayed with options to "Create 8/16/32".

### Song Management
- [ ] **Add Song**: Add a song with Title, Artist, and optional YouTube URL. Verify it appears in the list.
- [ ] **Ordering**: Use Up/Down arrows. Verify order persists after refresh.
- [ ] **Soft Delete**: Click `x`. Verify song moves to "Deleted Songs" section.
- [ ] **Restore**: Click `Restore`. Verify song returns to active list.
- [ ] **YouTube URL**: Ensure URL is saved and displayed (icon or text).

### Class Management
- [ ] **Add Class**: Add a class name. Verify appearance.
- [ ] **Delete/Restore**: Verify soft delete works similar to songs.

### Match Management
- [ ] **Generation**: Click "Create 8". Verify matches appear (R1, R2, R3).
- [ ] **Open Match**: Click "Open Match" on a locked match. Verify status changes to "OPEN".
- [ ] **Close Match/Select Winner**: Click "Win: [Song Name]". Verify:
    - Match status becomes "closed".
    - Winner advances to the next match slot.
    - Next match updates with the winner's name.
- [ ] **Reset**: Click "Reset" on an open match. Verify it returns to locked.

## 2. Voting Interface (`/vote`)

### Display
- [ ] **Active Matches**: Verify only "Open" matches from the "Active" bracket are displayed.
- [ ] **YouTube Embed**: If a song has a YouTube URL, verify the video player appears and **is playable** (clickable).
- [ ] **No Matches**: If no bracket is active or no matches are open, verify "No Voting Today" message.

### Interaction
- [ ] **Class Selection**: Verify class dropdown lists all active classes.
- [ ] **Song Selection**: Click a song card. Verify it highlights.
- [ ] **Submit Vote**: Click "Submit". Verify "Vote Registered!" success message.
- [ ] **Change Vote (Undo)**:
    - After voting, click "Change Vote".
    - Verify the voting form **reappears immediately**.
    - Verify you can cast a new vote for a different song.
- [ ] **Duplicate Voting**: Verify a class cannot vote twice without undoing first (Backend validation).

## 3. Data Integrity
- [ ] **Multi-Bracket Isolation**:
    - Add songs to Bracket A. Switch to Bracket B. Verify Song list is empty or specific to Bracket B.
    - Generate matches in A. Switch to B. Verify B has no matches (or its own matches).
- [ ] **Legacy Migration**: If accessing with old data, verify "Initialize & Migrate" button appears and works.

## 4. Deployment & DevOps
- [ ] **Build**: `vercel --prod` completes successfully.
- [ ] **Persistence**: Data persists across deployments (Firebase).
