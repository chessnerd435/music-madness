'use server'

import { db } from '@/lib/firebase';
import { collection, addDoc, doc, getDoc, updateDoc, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';

export async function submitVote(formData) {
    const matchId = formData.get('matchId');
    const classId = formData.get('classId');
    const votedForId = formData.get('votedForId');

    // Validate
    if (!matchId || !classId || !votedForId) {
        return { error: 'Missing information' };
    }

    // Check if match is open? (Optional security)
    const matchRef = doc(db, 'matches', matchId);
    const matchSnap = await getDoc(matchRef);
    if (!matchSnap.exists() || matchSnap.data().status !== 'open') {
        return { error: 'Match is not open for voting' };
    }

    // Check if class has already voted
    const existingVoteQ = query(
        collection(db, 'votes'),
        where('matchId', '==', matchId),
        where('classId', '==', classId)
    );
    const existingVoteSnap = await getDocs(existingVoteQ);
    if (!existingVoteSnap.empty) {
        return { error: 'Your class has already voted!' };
    }

    try {
        await addDoc(collection(db, 'votes'), {
            matchId,
            classId,
            votedForId,
            timestamp: new Date()
        });
        revalidatePath('/vote');
        revalidatePath('/admin');
        return { success: true };
    } catch (e) {
        return { error: 'Failed to submit vote' };
    }
}

export async function deleteVote(matchId, classId) {
    if (!matchId || !classId) return { error: 'Missing info' };

    const existingVoteQ = query(
        collection(db, 'votes'),
        where('matchId', '==', matchId),
        where('classId', '==', classId)
    );
    const snap = await getDocs(existingVoteQ);

    if (snap.empty) return { success: true }; // Already gone

    try {
        // Should only be one, but delete all if duplicates
        const promises = snap.docs.map(d => deleteDoc(d.ref));
        await Promise.all(promises);
        revalidatePath('/vote');
        revalidatePath('/admin');
        return { success: true };
    } catch (e) {
        return { error: 'Failed to remove vote' };
    }
}
