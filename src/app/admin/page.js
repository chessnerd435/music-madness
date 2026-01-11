export const dynamic = 'force-dynamic';

import { cookies } from 'next/headers';
import Link from 'next/link';
import { login, logout, addSong, clearSongs, generateBracket, deleteBracket, openMatch, resolveMatch, addClass, deleteClass, restoreClass, deleteSong, restoreSong, swapSongOrder, swapClassOrder, deleteVote, updateVote, unopenMatch, createBracket, switchAdminBracket, setBracketActive, migrateToMultiBracket } from './actions';
import { db } from '@/lib/firebase';
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';

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
    const bracketsSnap = await getDocs(collection(db, 'brackets'));
    const brackets = bracketsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const adminBracketId = cookieStore.get('admin_bracket_id')?.value;
    const currentBracket = brackets.find(b => b.id === adminBracketId)
        || brackets.find(b => b.isActive)
        || brackets[0]
        || null;
    const currentBracketId = currentBracket ? currentBracket.id : null;

    let songsQuery = collection(db, 'songs');
    if (brackets.length > 0) {
        songsQuery = query(collection(db, 'songs'), where('bracketId', '==', currentBracketId || 'unknown'));
    }
    const songsSnap = await getDocs(songsQuery);
    const songs = songsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const classesSnap = await getDocs(collection(db, 'classes'));
    const classes = classesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    let matchesQuery = collection(db, 'matches');
    if (brackets.length > 0) {
        matchesQuery = query(collection(db, 'matches'), where('bracketId', '==', currentBracketId || 'unknown'));
    }
    const matchesSnap = await getDocs(matchesQuery);
    let matches = matchesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    matches.sort((a, b) => a.round - b.round);

    const votesSnap = await getDocs(collection(db, 'votes'));
    const votes = votesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Calculate vote counts per match per song
    const voteCounts = {};
    votes.forEach(v => {
        if (!voteCounts[v.matchId]) voteCounts[v.matchId] = {};
        if (voteCounts[v.matchId][v.votedForId] === undefined) voteCounts[v.matchId][v.votedForId] = 0;
        voteCounts[v.matchId][v.votedForId]++;
    });

    console.log('Brackets:', brackets.length);
    console.log('Songs:', songs.length);
    console.log('Matches:', matches.length);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1>Admin Dashboard (Diagnostic)</h1>
                <form action={logout}>
                    <button className="btn" style={{ background: '#334155', color: 'white' }}>Logout</button>
                </form>
            </div>

            <div>
                <Link href="/" style={{ color: '#4ade80', textDecoration: 'none' }}>&larr; Back to Main Page</Link>
            </div>

            <div className="card">
                <h3>Stats</h3>
                <p>Brackets Found: {brackets.length}</p>
                <p>Current Bracket ID: {String(currentBracketId)}</p>
                <p>Songs Found: {songs.length}</p>
                <p>Matches Found: {matches.length}</p>
                <p>Classes Found: {classes.length}</p>
            </div>

            {/* If this renders, we know the issue is in the lists below */}
        </div>
    );
}
