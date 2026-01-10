'use server'

import { cookies } from 'next/headers';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, doc, updateDoc, writeBatch, query, where, deleteDoc } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'musicmom';

export async function login(formData) {
    const password = formData.get('password');
    if (password === ADMIN_PASSWORD) {
        cookies().set('admin_session', 'true', { httpOnly: true, secure: process.env.NODE_ENV === 'production' });
        return { success: true };
    }
    return { success: false, error: 'Invalid password' };
}

export async function logout() {
    cookies().delete('admin_session');
}

export async function addSong(formData) {
    const title = formData.get('title');
    const artist = formData.get('artist');

    if (!title || !artist) return { error: 'Missing fields' };

    try {
        await addDoc(collection(db, 'songs'), {
            title,
            artist,
            seed: 0 // Will assign later or auto-increment
        });
        revalidatePath('/admin');
        return { success: true };
    } catch (e) {
        return { error: 'Failed to add song' };
    }
}

export async function clearSongs() {
    // Only for development/reset
    const q = await getDocs(collection(db, 'songs'));
    const batch = writeBatch(db);
    q.forEach((doc) => {
        batch.delete(doc.ref);
    });
    await batch.commit();
    revalidatePath('/admin');
}

export async function generateBracket(formData) {
    const size = parseInt(formData.get('size'));
    // 1. Fetch all songs
    const songsSnap = await getDocs(collection(db, 'songs'));
    let songs = songsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    if (songs.length < size) {
        return { error: `Not enough songs! Need ${size}, have ${songs.length}` };
    }

    // Shuffle songs
    songs = songs.sort(() => Math.random() - 0.5);

    // 2. Create Matches
    // We need to create a tree structure. 
    // For simplicity, we'll just create Round 1 matches now, and "TBD" matches for future rounds?
    // Or just create Round 1, and create future rounds as winners emerge?
    // Let's create ALL matches upfront so we can visualize the full empty bracket.

    const batch = writeBatch(db);
    const matchesRef = collection(db, 'matches');

    // Helper to create a match
    const createMatch = (id, round, s1, s2, nextMatchId, nextMatchSlot) => {
        const ref = doc(matchesRef, id);
        batch.set(ref, {
            round,
            song1: s1 || null,
            song2: s2 || null,
            winner: null,
            nextMatchId, // ID of the match the winner goes to
            nextMatchSlot, // 'song1' or 'song2'
            status: 'locked', // locked, open, closed
            day: null
        });
    };

    // Logic: 
    // R1: size/2 matches. 
    // R2: size/4 matches.
    // ...
    // This is tricky to do flat. 
    // Let's do it recursively from the final back to start?
    // Or just iterative layers.

    let matchCount = 1;
    const matchMap = {}; // id -> nextMatchId

    // Example for 8 songs (3 rounds):
    // Round 3 (Finals): 1 match (m7)
    // Round 2 (Semis): 2 matches (m5, m6) -> m7
    // Round 1 (Quarters): 4 matches (m1..m4) -> m5, m6

    // Generic Tree Builder
    // We'll build "Match Nodes" and then saving them.
    // Structure: { id, round, next, slot }

    let rounds = Math.log2(size);
    let totalMatches = size - 1;

    // We will assign recursive IDs: 
    // r{round}-m{index}
    // e.g. R4 (Final) -> r4-m1
    // R3 -> r3-m1, r3-m2

    // Implementation:
    // We start with the Final (Round = rounds)
    // Then split backwards

    let currentRoundMatches = [{ id: `r${rounds}-m1`, round: rounds, next: null, slot: null }];
    const allMatches = [...currentRoundMatches];

    // Work backwards from Final down to R2
    for (let r = rounds; r > 1; r--) {
        const nextRoundMatches = [];
        currentRoundMatches.forEach(m => {
            // Each match needs 2 feeders from the previous round (r-1)
            // Feeder 1
            const feed1 = {
                id: `r${r - 1}-m${nextRoundMatches.length + 1}`,
                round: r - 1,
                next: m.id,
                slot: 'song1'
            };
            // Feeder 2
            const feed2 = {
                id: `r${r - 1}-m${nextRoundMatches.length + 2}`,
                round: r - 1,
                next: m.id,
                slot: 'song2'
            };
            nextRoundMatches.push(feed1, feed2);
            allMatches.push(feed1, feed2);
        });
        currentRoundMatches = nextRoundMatches;
    }

    // currentRoundMatches is now Round 1. We need to populate these with Songs.
    // We have 'size' songs. 'currentRoundMatches' length is size/2. Perfect.

    currentRoundMatches.forEach((m, i) => {
        // Song 1 index = i * 2
        // Song 2 index = i * 2 + 1
        m.song1 = songs[i * 2];
        m.song2 = songs[i * 2 + 1];
    });

    // Commit all to DB
    allMatches.forEach(m => {
        batch.set(doc(matchesRef, m.id), {
            round: m.round,
            song1Id: m.song1 ? m.song1.id : null,
            song1Title: m.song1 ? m.song1.title : 'TBD',
            song2Id: m.song2 ? m.song2.id : null,
            song2Title: m.song2 ? m.song2.title : 'TBD',
            winnerId: null,
            nextMatchId: m.next,
            nextMatchSlot: m.slot,
            status: 'locked',
            day: null
        });
    });

    await batch.commit();
    revalidatePath('/admin');
    return { success: true };
}

export async function deleteBracket() {
    const q = await getDocs(collection(db, 'matches'));
    const batch = writeBatch(db);
    q.forEach((doc) => {
        batch.delete(doc.ref);
    });
    await batch.commit();
    revalidatePath('/admin');
}
