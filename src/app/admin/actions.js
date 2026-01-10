'use server'

import { cookies } from 'next/headers';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, doc, updateDoc, writeBatch, query, where, deleteDoc, getDoc } from 'firebase/firestore';
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

    try {
        await addDoc(collection(db, 'songs'), {
            title,
            artist,
            seed: 0,
            order: Date.now(), // Use timestamp for easy initial sorting
            deleted: false
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

    const batch = writeBatch(db);
    batch.update(doc(db, 'songs', id1), { order: order2 });
    batch.update(doc(db, 'songs', id2), { order: order1 });
    await batch.commit();
    revalidatePath('/admin');
}

export async function clearSongs() {
    const q = await getDocs(collection(db, 'songs'));
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
    await addDoc(collection(db, 'classes'), { name });
    revalidatePath('/admin');
}

export async function deleteClass(formData) {
    const id = formData.get('id');
    await deleteDoc(doc(db, 'classes', id));
    revalidatePath('/admin');
}

export async function generateBracket(formData) {
    let size = parseInt(formData.get('size'));
    if (isNaN(size)) {
        // Fallback or error
        console.error('Invalid size received:', formData.get('size'));
        return { error: 'Invalid bracket size' };
    }

    const songsSnap = await getDocs(collection(db, 'songs'));
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

export async function openMatch(formData) {
    const matchId = formData.get('matchId');
    await updateDoc(doc(db, 'matches', matchId), {
        status: 'open',
        day: new Date().toISOString().split('T')[0]
    });
    revalidatePath('/admin');
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
}
