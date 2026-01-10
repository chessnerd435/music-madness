import { cookies } from 'next/headers';
import { login, logout, addSong, clearSongs, generateBracket, deleteBracket, openMatch, resolveMatch, addClass, deleteClass, restoreClass, deleteSong, restoreSong, swapSongOrder } from './actions';
import { db } from '@/lib/firebase';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';

export default async function AdminPage() {
    const cookieStore = await cookies();
    const isLoggedIn = cookieStore.get('admin_session')?.value === 'true';

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

    const classesSnap = await getDocs(collection(db, 'classes'));
    const classes = classesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const matchesSnap = await getDocs(collection(db, 'matches'));
    let matches = matchesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    matches.sort((a, b) => a.round - b.round);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1>Admin Dashboard</h1>
                <form action={logout}>
                    <button className="btn" style={{ background: '#334155', color: 'white' }}>Logout</button>
                </form>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                {/* Songs */}
                <div className="card">
                    <h3>Manage Songs ({songs.length})</h3>
                    <div style={{ marginTop: '1rem' }}>
                        <form action={addSong} style={{ display: 'flex', gap: '0.5rem' }}>
                            <input name="title" placeholder="Title" required style={{ padding: '0.5rem', flex: 1 }} />
                            <input name="artist" placeholder="Artist" required style={{ padding: '0.5rem', flex: 1 }} />
                            <input name="youtubeUrl" placeholder="YouTube URL (Optional)" style={{ padding: '0.5rem', flex: 1 }} />
                            <button className="btn btn-primary">Add</button>
                        </form>
                        <div style={{ maxHeight: '150px', overflowY: 'auto', marginTop: '1rem' }}>
                            {songs.filter(s => !s.deleted).sort((a, b) => (a.order || 0) - (b.order || 0)).map((song, index, arr) => (
                                <div key={song.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.2rem', borderBottom: '1px solid #333', fontSize: '0.9rem' }}>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            {index > 0 && (
                                                <form action={swapSongOrder}>
                                                    <input type="hidden" name="id1" value={song.id} />
                                                    <input type="hidden" name="order1" value={song.order || 0} />
                                                    <input type="hidden" name="id2" value={arr[index - 1].id} />
                                                    <input type="hidden" name="order2" value={arr[index - 1].order || 0} />
                                                    <button style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.7rem' }}>▲</button>
                                                </form>
                                            )}
                                            {index < arr.length - 1 && (
                                                <form action={swapSongOrder}>
                                                    <input type="hidden" name="id1" value={song.id} />
                                                    <input type="hidden" name="order1" value={song.order || 0} />
                                                    <input type="hidden" name="id2" value={arr[index + 1].id} />
                                                    <input type="hidden" name="order2" value={arr[index + 1].order || 0} />
                                                    <button style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.7rem' }}>▼</button>
                                                </form>
                                            )}
                                        </div>
                                        <span>{song.title} - {song.artist}</span>
                                    </div>

                                    <form action={deleteSong}>
                                        <input type="hidden" name="id" value={song.id} />
                                        <button style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>×</button>
                                    </form>
                                </div>
                            ))}
                        </div>
                        {songs.length > 0 && (
                            <form action={clearSongs} style={{ marginTop: '1rem' }}>
                                <button className="btn" style={{ width: '100%', background: '#ef4444', fontSize: '0.8rem', padding: '0.5rem' }}>Clear ALL Songs (Permanent)</button>
                            </form>
                        )}

                        {songs.some(s => s.deleted) && (
                            <div style={{ marginTop: '2rem', borderTop: '1px solid #333', paddingTop: '1rem' }}>
                                <h4 style={{ fontSize: '0.9rem', color: '#94a3b8', marginBottom: '0.5rem' }}>Deleted Songs (Hidden)</h4>
                                <div style={{ maxHeight: '100px', overflowY: 'auto' }}>
                                    {songs.filter(s => s.deleted).map(song => (
                                        <div key={song.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.2rem', fontSize: '0.8rem', opacity: 0.7 }}>
                                            <span>{song.title} - {song.artist}</span>
                                            <form action={restoreSong}>
                                                <input type="hidden" name="id" value={song.id} />
                                                <button style={{ background: 'none', border: 'none', color: '#4ade80', cursor: 'pointer' }}>Restore ↺</button>
                                            </form>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Classes */}
                <div className="card">
                    <h3>Manage Classes ({classes.length})</h3>
                    <div style={{ marginTop: '1rem' }}>
                        <form action={addClass} style={{ display: 'flex', gap: '0.5rem' }}>
                            <input name="name" placeholder="Class Name (e.g. 5B Smith)" required style={{ padding: '0.5rem', flex: 1 }} />
                            <button className="btn btn-primary">Add</button>
                        </form>
                        <div style={{ maxHeight: '150px', overflowY: 'auto', marginTop: '1rem' }}>
                            {classes.filter(c => !c.deleted).map(c => (
                                <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.2rem', borderBottom: '1px solid #333', fontSize: '0.9rem' }}>
                                    <span>{c.name}</span>
                                    <form action={deleteClass}>
                                        <input type="hidden" name="id" value={c.id} />
                                        <button style={{ background: 'none', border: 'none', color: 'red', cursor: 'pointer' }}>×</button>
                                    </form>
                                </div>
                            ))}
                        </div>

                        {classes.some(c => c.deleted) && (
                            <div style={{ marginTop: '2rem', borderTop: '1px solid #333', paddingTop: '1rem' }}>
                                <h4 style={{ fontSize: '0.9rem', color: '#94a3b8', marginBottom: '0.5rem' }}>Deleted Classes (Hidden)</h4>
                                <div style={{ maxHeight: '100px', overflowY: 'auto' }}>
                                    {classes.filter(c => c.deleted).map(c => (
                                        <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.2rem', fontSize: '0.8rem', opacity: 0.7 }}>
                                            <span>{c.name}</span>
                                            <form action={restoreClass}>
                                                <input type="hidden" name="id" value={c.id} />
                                                <button style={{ background: 'none', border: 'none', color: '#4ade80', cursor: 'pointer' }}>Restore ↺</button>
                                            </form>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="card">
                <h3>Bracket Management</h3>

                {matches.length === 0 ? (
                    <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <p>No active bracket.</p>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <form action={generateBracket}>
                                <input type="hidden" name="size" value="8" />
                                <button className="btn btn-primary">Create 8</button>
                            </form>
                            <form action={generateBracket}>
                                <input type="hidden" name="size" value="16" />
                                <button className="btn btn-primary">Create 16</button>
                            </form>
                            <form action={generateBracket}>
                                <input type="hidden" name="size" value="32" />
                                <button className="btn btn-primary">Create 32</button>
                            </form>
                        </div>
                    </div>
                ) : (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                            <p>Matches: {matches.length}</p>
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

                                    <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        {match.status === 'locked' && match.song1Id && match.song2Id && (
                                            <form action={openMatch}>
                                                <input type="hidden" name="matchId" value={match.id} />
                                                <button className="btn" style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem', background: '#eab308', color: 'black' }}>Opn Vote</button>
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
                                                    <button className="btn" style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem', background: '#4ade80', color: 'black' }}>Win: {match.song1Title?.substring(0, 10)}</button>
                                                </form>
                                                <form action={resolveMatch}>
                                                    <input type="hidden" name="matchId" value={match.id} />
                                                    <input type="hidden" name="winnerId" value={match.song2Id} />
                                                    <input type="hidden" name="winnerName" value={match.song2Title} />
                                                    <input type="hidden" name="nextMatchId" value={match.nextMatchId} />
                                                    <input type="hidden" name="nextMatchSlot" value={match.nextMatchSlot} />
                                                    <button className="btn" style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem', background: '#4ade80', color: 'black' }}>Win: {match.song2Title?.substring(0, 10)}</button>
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
