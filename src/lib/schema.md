# Firestore Schema Reference

## Collection: `songs`
List of all songs in the tournament.
- `id` (auto-gen): Document ID
- `title` (string): Song title
- `artist` (string): Artist name
- `seed` (number): 1-32 (Initial ranking)

## Collection: `matches`
Represents a matchup between two songs or a TBD spot.
- `id` (string): "r1-m1", "r1-m2" ... "finals"
- `round` (number): 1, 2, 3, 4, 5
- `song1Id` (string | null): ID of first song
- `song2Id` (string | null): ID of second song
- `winnerId` (string | null): ID of winning song (once decided)
- `status` (string): "locked", "open", "closed" (Voting status)
- `day` (string): "2024-03-01" (Scheduled voting day)

## Collection: `votes`
Individual votes cast by classes.
- `id` (auto-gen)
- `matchId` (string): ID of the match
- `classId` (string): ID/Name of the class (e.g., "5B-Smith")
- `votedForIds` (string): ID of the song selected
- `timestamp` (timestamp)

## Collection: `classes`
List of registered classes (for the dropdown).
- `id` (auto-gen)
- `name` (string): Display name (e.g., "Mrs. Smith (5B)")
