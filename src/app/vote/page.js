import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { submitVote } from './actions';

export default async function VotePage() {
    // 1. Fetch active matches (status == 'open')
    // We can also filter by day if we want to be strict, but status='open' is simpler for now.
    const matchesQ = query(collection(db, 'matches'), where('status', '==', 'open'));
    const matchesSnap = await getDocs(matchesQ);
    const matches = matchesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // 2. Fetch classes
    const classesSnap = await getDocs(collection(db, 'classes'));
    let classes = classesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    // Sort classes internally
    classes = classes.sort((a, b) => a.name.localeCompare(b.name));

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h1 className="text-center" style={{ marginBottom: '2rem' }}>Cast Your Votes! 🗳️</h1>

            {matches.length === 0 ? (
                <div className="card text-center" style={{ textAlign: 'center', padding: '3rem' }}>
                    <h2>No Voting Today</h2>
                    <p style={{ marginTop: '1rem', color: '#94a3b8' }}>Check back later for the next round of matches!</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    {matches.map(match => (
                        <div key={match.id} className="card">
                            <h3 style={{ textAlign: 'center', marginBottom: '1.5rem', opacity: 0.8 }}>Round {match.round} Matchup</h3>

                            <form action={submitVote} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <input type="hidden" name="matchId" value={match.id} />

                                {/* Songs Selection */}
                                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                                    <label style={{
                                        flex: 1,
                                        padding: '1.5rem',
                                        background: '#334155',
                                        borderRadius: '0.5rem',
                                        cursor: 'pointer',
                                        textAlign: 'center',
                                        border: '2px solid transparent'
                                    }}>
                                        <input type="radio" name="votedForId" value={match.song1Id} required style={{ display: 'block', margin: '0 auto 1rem' }} />
                                        <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{match.song1Title}</div>
                                    </label>

                                    <div style={{ display: 'flex', alignItems: 'center' }}>VS</div>

                                    <label style={{
                                        flex: 1,
                                        padding: '1.5rem',
                                        background: '#334155',
                                        borderRadius: '0.5rem',
                                        cursor: 'pointer',
                                        textAlign: 'center',
                                        border: '2px solid transparent'
                                    }}>
                                        <input type="radio" name="votedForId" value={match.song2Id} required style={{ display: 'block', margin: '0 auto 1rem' }} />
                                        <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{match.song2Title}</div>
                                    </label>
                                </div>

                                {/* Class Dropdown */}
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>Select Your Class:</label>
                                    <select name="classId" required style={{ width: '100%', padding: '0.8rem', borderRadius: '0.5rem', background: '#1e293b', color: 'white', border: '1px solid #475569' }}>
                                        <option value="">-- Choose Class --</option>
                                        {classes.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <button className="btn btn-primary" style={{ marginTop: '1rem' }}>Submit Vote</button>
                            </form>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
