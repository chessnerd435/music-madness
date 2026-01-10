import { db } from '@/lib/firebase';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const matchesSnap = await getDocs(collection(db, 'matches'));
  let matches = matchesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  // Group by round
  // 32 teams -> 5 rounds. R1(16), R2(8), R3(4), R4(2), R5(1)
  const rounds = {};
  matches.forEach(m => {
    // Robustly handle round number
    const roundNum = m.round || parseInt(m.id.split('-')[0].replace('r', '')) || 0;
    if (!rounds[roundNum]) rounds[roundNum] = [];
    rounds[roundNum].push(m);
  });

  // Sort matches within rounds? 
  // We need to order them by display order? 
  // For a simple view, we just list them. For a proper tree connectivity, we need order.
  // The recursive generation assigned IDs like r1-m1, r1-m2... which are reasonably ordered.
  // Sort rounds 1..N
  const roundKeys = Object.keys(rounds).sort((a, b) => parseInt(a) - parseInt(b));

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '2.5rem', background: 'linear-gradient(to right, #c084fc, #ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Tournament Bracket
        </h2>
        <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <Link href="/vote" className="btn btn-primary">Go to Voting Page 🗳️</Link>
          <Link href="/admin" className="btn" style={{ background: '#334155' }}>Admin Login 🔒</Link>
        </div>
      </div>

      {matches.length === 0 ? (
        <div className="card text-center">
          <p>Bracket has not been generated yet.</p>
        </div>
      ) : (
        <div className="card bracket-container">
          {roundKeys.map((r) => (
            <div key={r} className="bracket-round">
              <div className="round-title">Round {r}</div>
              {/* Sort by ID to keep order vertically? e.g r1-m1, r1-m2 */}
              {rounds[r].sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true })).map(match => (
                <div key={match.id} className={`bracket-match ${match.status === 'open' ? 'active' : ''}`}>
                  <p className={match.winnerId === match.song1Id ? 'winner' : ''}>
                    {match.song1Title || 'TBD'}
                  </p>
                  <div style={{ height: '1px', background: '#475569', margin: '2px 0' }}></div>
                  <p className={match.winnerId === match.song2Id ? 'winner' : ''}>
                    {match.song2Title || 'TBD'}
                  </p>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
