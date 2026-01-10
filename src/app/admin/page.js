import { cookies } from 'next/headers';
import { login, logout, addSong, clearSongs, generateBracket, deleteBracket, openMatch, resolveMatch } from './actions';
import { db } from '@/lib/firebase';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';

export default async function AdminPage() {
    const isLoggedIn = cookies().get('admin_session')?.value === 'true';

    if (!isLoggedIn) {
        return (
            <div className="card" style={{ maxWidth: '400px', margin: '2rem auto' }}>
                <h2>Admin Login</h2>
                <form action={login} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                    <input
                        name="password"
                        type="password"
                        placeholder="Enter Password"
                        style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
                    />
                    <button className="btn btn-primary">Login</button>
                </form>
            </div>
        );
    }

    // Fetch data
    const songsSnap = await getDocs(collection(db, 'songs'));
    const songs = songsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const matchesSnap = await getDocs(query(collection(db, 'matches'), orderBy('round')));
    let matches = matchesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Sort matches by Round descending (Finals at top) or ascending (Round 1 at top)?
    // Usually usually nice to see active matches. Let's sort by Round Ascending.
    // Already done in query.

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1>Admin Dashboard</h1>
                <form action={logout}>
                    <button className="btn" style={{ background: '#334155', color: 'white' }}>Logout</button>
                </form>
            </div>

            <div className="card">
                <h3>Manage Songs ({songs.length})</h3>
                <div style={{ display: 'flex', gap: '2rem', marginTop: '1rem' }}>

                    {/* Add Song Form */}
                    <div style={{ flex: 1 }}>
                        <h4>Add New Song</h4>
                        <form action={addSong} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                            <input name="title" placeholder="Song Title" required style={{ padding: '0.5rem' }} />
                            <input name="artist" placeholder="Artist" required style={{ padding: '0.5rem' }} />
                            <button className="btn btn-primary" style={{ marginTop: '0.5rem' }}>Add Song</button>
                        </form>
                        <form action={clearSongs} style={{ marginTop: '1rem' }}>
                            <button className="btn" style={{ background: 'red', fontSize: '0.8rem', padding: '0.2rem 0.5rem' }}>Clear All Songs</button>
                        </form>
                    </div>

                    {/* Song List */}
                    <div style={{ flex: 1, maxHeight: '200px', overflowY: 'auto' }}>
                        {songs.map(song => (
                            <div key={song.id} style={{ padding: '0.2rem', borderBottom: '1px solid #333', fontSize: '0.9rem' }}>
                                <strong>{song.title}</strong> - {song.artist}
                            </div>
                        ))}
                        {songs.length === 0 && <p style={{ color: '#666' }}>No songs added yet.</p>}
                    </div>

                </div>
            </div>

            <div className="card">
                <h3>Bracket Management</h3>

                {matches.length === 0 ? (
                    <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <p>No active bracket.</p>
                        <form style={{ display: 'flex', gap: '0.5rem' }}>
                            <button formAction={generateBracket} name="size" value="8" className="btn btn-primary">Create 8-Song</button>
                            <button formAction={generateBracket} name="size" value="16" className="btn btn-primary">Create 16-Song</button>
                            <button formAction={generateBracket} name="size" value="32" className="btn btn-primary">Create 32-Song</button>
                        </form>
                    </div>
                ) : (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                            <p>Total Matches: {matches.length}</p>
                            <form action={deleteBracket}>
                                <button className="btn" style={{ background: 'red', fontSize: '0.8rem' }}>Delete Bracket</button>
                            </form>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                            {matches.map(match => (
                                <div key={match.id} style={{
                                    background: match.status === 'open' ? 'rgba(74, 222, 128, 0.1)' : '#334155',
                                    padding: '1rem',
                                    borderRadius: '0.5rem',
                                    border: match.status === 'open' ? '1px solid #4ade80' : 'none'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.5rem' }}>
                                        <span>{match.id} (R{match.round})</span>
                                        <span style={{ textTransform: 'uppercase', fontWeight: 'bold' }}>{match.status}</span>
                                    </div>

                                    {/* Contestants */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        <div style={{
                                            padding: '0.5rem',
                                            background: match.winnerId && match.winnerId === match.song1Id ? '#4ade80' : 'rgba(0,0,0,0.2)',
                                            color: match.winnerId && match.winnerId === match.song1Id ? 'black' : 'white',
                                            borderRadius: '4px'
                                        }}>
                                            {match.song1Title || 'TBD'}
                                        </div>
                                        <div style={{ textAlign: 'center', fontSize: '0.8rem', opacity: 0.5 }}>VS</div>
                                        <div style={{
                                            padding: '0.5rem',
                                            background: match.winnerId && match.winnerId === match.song2Id ? '#4ade80' : 'rgba(0,0,0,0.2)',
                                            color: match.winnerId && match.winnerId === match.song2Id ? 'black' : 'white',
                                            borderRadius: '4px'
                                        }}>
                                            {match.song2Title || 'TBD'}
                                        </div>
                                    </div>

                                    {/* Controls */}
                                    <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        {match.status === 'locked' && match.song1Id && match.song2Id && (
                                            <form action={openMatch}>
                                                <input type="hidden" name="matchId" value={match.id} />
                                                <button className="btn" style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem', background: '#eab308', color: 'black' }}>Open Voting</button>
                                            </form>
                                        )}

                                        {match.status === 'open' && (
                                            <>
                                                <form action={resolveMatch}>
                                                    <input type="hidden" name="matchId" value={match.id} />
                                                    <input type="hidden" name="winnerId" value={match.song1Id} />
                                                    <input type="hidden" name="winnerName" value={match.song1Title} />
                                                    <input type="hidden" name="nextMatchId" value={match.nextMatchId} />
                                                    <input type="hidden" name="nextMatchSlot" value={match.nextMatchSlot} />
                                                    <button className="btn" style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem', background: '#4ade80', color: 'black' }}>Win: {match.song1Title}</button>
                                                </form>
                                                <form action={resolveMatch}>
                                                    <input type="hidden" name="matchId" value={match.id} />
                                                    <input type="hidden" name="winnerId" value={match.song2Id} />
                                                    <input type="hidden" name="winnerName" value={match.song2Title} />
                                                    <input type="hidden" name="nextMatchId" value={match.nextMatchId} />
                                                    <input type="hidden" name="nextMatchSlot" value={match.nextMatchSlot} />
                                                    <button className="btn" style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem', background: '#4ade80', color: 'black' }}>Win: {match.song2Title}</button>
                                                </form>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
