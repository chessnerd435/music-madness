'use server'

import { cookies } from 'next/headers';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, doc, updateDoc, writeBatch, query, where, deleteDoc, getDoc, setDoc } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'musicmom';

export async function login(formData) {
    const password = formData.get('password');
    if (password === ADMIN_PASSWORD) {
        const cookieStore = await cookies();
        cookieStore.set('admin_session', 'true', { httpOnly: true, secure: process.env.NODE_ENV === 'production' });
        return { success: true };
    }
    return { success: false, error: 'Invalid password' };
}

export async function logout() {
    const cookieStore = await cookies();
    cookieStore.delete('admin_session');
}

export async function addSong(formData) {
    const title = formData.get('title');
    const artist = formData.get('artist');

    if (!title || !artist) return { error: 'Missing fields' };

    const cookieStore = await cookies();
    const bracketId = cookieStore.get('admin_bracket_id')?.value;

    try {
        await addDoc(collection(db, 'songs'), {
            title,
            artist,
            youtubeUrl: formData.get('youtubeUrl') || '',
            seed: 0,
            order: Date.now(),
            deleted: false,
            bracketId: bracketId || null
        });
        revalidatePath('/admin');
        return { success: true };
    } catch (e) {
        return { error: 'Failed to add song' };
    }
}

export async function deleteSong(formData) {
    const id = formData.get('id');
    await updateDoc(doc(db, 'songs', id), {
        deleted: true
    });
    revalidatePath('/admin');
}

export async function restoreSong(formData) {
    const id = formData.get('id');
    await updateDoc(doc(db, 'songs', id), {
        deleted: false
    });
    revalidatePath('/admin');
}

export async function swapSongOrder(formData) {
    const id1 = formData.get('id1');
    const order1 = parseInt(formData.get('order1'));
    const id2 = formData.get('id2');
    const order2 = parseInt(formData.get('order2'));

    // Fix: If orders are same, spread them out first
    // But for now, just swapping the values should work if they are distinct.
    // If they are exactly the same, swap logic does nothing actually helpful unless we act on indices.
    // However, if we trust the UI passed us the sorted list's adjacent items, we can force a swap.

    // Better logic: slightly nudge if equal? 
    // Or just swap.

    let newOrder1 = order2;
    let newOrder2 = order1;

    if (newOrder1 === newOrder2) {
        newOrder1 = newOrder1 - 1; // Move first one up (numerically lower is usually higher in list, but code sorted by order asc? actions.js says sort(a,b) => a.order - b.order)
        // Wait, Admin Page sorts: sort((a, b) => (a.order || 0) - (b.order || 0))
        // So smaller is higher up.
        // logic: 
        // Item A (order 100), Item B (order 100). 
        // Swap -> Item A becomes 100, Item B becomes 100. No change.
        // We need to nudge one.
        newOrder2 = newOrder2 + 1;
    }

    const batch = writeBatch(db);
    batch.update(doc(db, 'songs', id1), { order: newOrder1 });
    batch.update(doc(db, 'songs', id2), { order: newOrder2 });
    await batch.commit();
    revalidatePath('/admin');
    await batch.commit();
    revalidatePath('/admin');
}

export async function swapClassOrder(formData) {
    const id1 = formData.get('id1');
    const order1 = parseInt(formData.get('order1') || 0);
    const id2 = formData.get('id2');
    const order2 = parseInt(formData.get('order2') || 0);

    let newOrder1 = order2;
    let newOrder2 = order1;

    // Handle initial case where orders might be 0 or equal
    if (newOrder1 === newOrder2) {
        newOrder2 = newOrder2 + 1;
    }

    const batch = writeBatch(db);
    batch.update(doc(db, 'classes', id1), { order: newOrder1 });
    batch.update(doc(db, 'classes', id2), { order: newOrder2 });
    await batch.commit();
    revalidatePath('/admin');
    revalidatePath('/vote');
}

export async function clearSongs() {
    const cookieStore = await cookies();
    const bracketId = cookieStore.get('admin_bracket_id')?.value;

    // Only delete songs in current bracket
    // Note: If no bracketId, we might delete orphans or legacy. Let's assume we want to be safe and only delete if bracketId matches, or if bracketId is null delete nulls.
    // Simplifying: query by bracketId
    const q = await getDocs(query(collection(db, 'songs'), where('bracketId', '==', bracketId || null)));

    const batch = writeBatch(db);
    q.forEach((doc) => {
        batch.delete(doc.ref);
    });
    await batch.commit();
    revalidatePath('/admin');
}

export async function addClass(formData) {
    const name = formData.get('name');
    if (!name) return { error: 'Missing Name' };
    await addDoc(collection(db, 'classes'), {
        name,
        order: Date.now(),
        deleted: false
    });
    revalidatePath('/admin');
    revalidatePath('/vote');
}

export async function deleteClass(formData) {
    const id = formData.get('id');
    await updateDoc(doc(db, 'classes', id), {
        deleted: true
    });
    revalidatePath('/admin');
}

export async function restoreClass(formData) {
    const id = formData.get('id');
    await updateDoc(doc(db, 'classes', id), {
        deleted: false
    });
    revalidatePath('/admin');
}

export async function generateBracket(formData) {
    let size = parseInt(formData.get('size'));
    if (isNaN(size)) {
        // Fallback or error
        console.error('Invalid size received:', formData.get('size'));
        return { error: 'Invalid bracket size' };
    }

    const cookieStore = await cookies();
    const bracketId = cookieStore.get('admin_bracket_id')?.value;

    const songsSnap = await getDocs(query(collection(db, 'songs'), where('bracketId', '==', bracketId || null)));
    let songs = songsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    if (songs.length < size) {
        return { error: `Not enough songs! Need ${size}, have ${songs.length}` };
    }

    // Filter out deleted songs and sort them by order
    songs = songs.filter(s => !s.deleted).sort((a, b) => a.order - b.order);

    // DON'T random shuffle if we respect manual ordering
    // songs = songs.sort(() => Math.random() - 0.5); 

    const batch = writeBatch(db);
    const matchesRef = collection(db, 'matches');

    let rounds = Math.log2(size);
    let currentRoundMatches = [{ id: `r${rounds}-m1`, round: rounds, next: null, slot: null }];
    const allMatches = [...currentRoundMatches];

    for (let r = rounds; r > 1; r--) {
        const nextRoundMatches = [];
        currentRoundMatches.forEach(m => {
            const feed1 = {
                id: `r${r - 1}-m${nextRoundMatches.length + 1}`,
                round: r - 1,
                next: m.id,
                slot: 'song1'
            };
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

    currentRoundMatches.forEach((m, i) => {
        m.song1 = songs[i * 2];
        m.song2 = songs[i * 2 + 1];
    });

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
            status: 'locked',
            day: null,
            bracketId: bracketId || null
        });
    });

    await batch.commit();
    revalidatePath('/admin');
    return { success: true };
}

export async function deleteBracket() {
    const cookieStore = await cookies();
    const bracketId = cookieStore.get('admin_bracket_id')?.value;

    const q = await getDocs(query(collection(db, 'matches'), where('bracketId', '==', bracketId || null)));
    const batch = writeBatch(db);
    q.forEach((doc) => {
        batch.delete(doc.ref);
    });
    await batch.commit();
    revalidatePath('/admin');
}

export async function openMatch(formData) {
    const matchId = formData.get('matchId');
    await updateDoc(doc(db, 'matches', matchId), {
        status: 'open',
        day: new Date().toISOString().split('T')[0]
    });
    revalidatePath('/admin');
    revalidatePath('/vote');
}

export async function unopenMatch(formData) {
    const matchId = formData.get('matchId');
    await updateDoc(doc(db, 'matches', matchId), {
        status: 'locked',
        day: null
    });
    revalidatePath('/admin');
    revalidatePath('/vote');
}

export async function resolveMatch(formData) {
    const matchId = formData.get('matchId');
    const winnerId = formData.get('winnerId');
    const nextMatchId = formData.get('nextMatchId');
    const nextMatchSlot = formData.get('nextMatchSlot');
    const winnerName = formData.get('winnerName');

    const batch = writeBatch(db);

    batch.update(doc(db, 'matches', matchId), {
        status: 'closed',
        winnerId: winnerId
    });

    if (nextMatchId) {
        batch.update(doc(db, 'matches', nextMatchId), {
            [`${nextMatchSlot}Id`]: winnerId,
            [`${nextMatchSlot}Title`]: winnerName
        });
    }

    await batch.commit();
    revalidatePath('/admin');
    revalidatePath('/vote');
}

export async function deleteVote(formData) {
    const voteId = formData.get('voteId');
    await deleteDoc(doc(db, 'votes', voteId));
    revalidatePath('/admin');
}

export async function updateVote(formData) {
    const voteId = formData.get('voteId');
    const newSongId = formData.get('newSongId');

    // We update the votedForId
    await updateDoc(doc(db, 'votes', voteId), {
        votedForId: newSongId
    });
    revalidatePath('/admin');
}

export async function createBracket(formData) {
    const name = formData.get('name');
    if (!name) return;
    const ref = await addDoc(collection(db, 'brackets'), {
        name,
        isActive: false,
        createdAt: new Date().toISOString()
    });
    const cookieStore = await cookies();
    cookieStore.set('admin_bracket_id', ref.id);
    revalidatePath('/admin');
}

export async function switchAdminBracket(formData) {
    const id = formData.get('bracketId');
    const cookieStore = await cookies();
    cookieStore.set('admin_bracket_id', id);
    revalidatePath('/admin');
}

export async function setBracketActive(formData) {
    const id = formData.get('bracketId');
    const q = await getDocs(collection(db, 'brackets'));
    const batch = writeBatch(db);
    q.forEach(d => {
        batch.update(doc(db, 'brackets', d.id), { isActive: d.id === id });
    });
    await batch.commit();

    const cookieStore = await cookies();
    cookieStore.set('admin_bracket_id', id);

    revalidatePath('/admin');
    revalidatePath('/');
    revalidatePath('/vote');
}

export async function migrateToMultiBracket() {
    // Check if any brackets exist
    const bSnap = await getDocs(collection(db, 'brackets'));
    if (!bSnap.empty) return; // Already migrated

    // Create Default Bracket
    const bracketRef = await addDoc(collection(db, 'brackets'), {
        name: '2024 Tournament',
        isActive: true,
        createdAt: new Date().toISOString()
    });
    const bracketId = bracketRef.id;

    const batch = writeBatch(db);
    let count = 0;

    // Update Songs
    const songsSnap = await getDocs(collection(db, 'songs'));
    songsSnap.forEach(d => {
        if (!d.data().bracketId) {
            batch.update(d.ref, { bracketId });
            count++;
        }
    });

    // Update Matches
    const matchesSnap = await getDocs(collection(db, 'matches'));
    matchesSnap.forEach(d => {
        if (!d.data().bracketId) {
            batch.update(d.ref, { bracketId });
            count++;
        }
    });

    if (count > 0) await batch.commit();

    const cookieStore = await cookies();
    cookieStore.set('admin_bracket_id', bracketId);
    revalidatePath('/admin');
}
