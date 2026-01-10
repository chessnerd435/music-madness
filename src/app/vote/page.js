import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import VoteMatchCard from './VoteMatchCard';

export const dynamic = 'force-dynamic';

export default async function VotePage() {
    // 1. Determine Bracket
    const bracketsSnap = await getDocs(query(collection(db, 'brackets'), where('isActive', '==', true)));
    const activeBracket = bracketsSnap.docs[0];
    const activeBracketId = activeBracket ? activeBracket.id : null;

    // 2. Fetch active matches (status == 'open')
    let matches = [];
    if (activeBracketId) {
        const matchesQ = query(collection(db, 'matches'), where('bracketId', '==', activeBracketId), where('status', '==', 'open'));
        const matchesSnap = await getDocs(matchesQ);
        matches = matchesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    } else {
        const bCheck = await getDocs(collection(db, 'brackets'));
        if (bCheck.empty) {
            // Legacy/No Bracket fallback
            const matchesQ = query(collection(db, 'matches'), where('status', '==', 'open'));
            const matchesSnap = await getDocs(matchesQ);
            matches = matchesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        }
    }

    // 2. Fetch classes
    const classesSnap = await getDocs(collection(db, 'classes'));
    let classes = classesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    // Sort classes internally
    // Sort classes by custom order
    classes = classes.sort((a, b) => (a.order || 0) - (b.order || 0));

    // 3. Fetch songs to get YouTube URLs
    const songsSnap = await getDocs(collection(db, 'songs'));
    const songsMap = {};
    songsSnap.forEach(doc => {
        songsMap[doc.id] = doc.data();
    });

    // 4. Fetch ALL votes (for open matches) to pass to client for validation state
    // We could optimize this by only fetching votes for open matches if the dataset is huge,
    // but fetching all votes is okay for this scale.
    // Actually, let's just fetch all votes.
    const votesSnap = await getDocs(collection(db, 'votes'));
    const votes = votesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

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
                        <VoteMatchCard
                            key={match.id}
                            match={match}
                            classes={classes}
                            votes={votes}
                            songsMap={songsMap}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
