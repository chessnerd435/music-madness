'use client';

import { useState } from 'react';
import { submitVote, deleteVote } from './actions';

import { useRouter } from 'next/navigation';

export default function VoteMatchCard({ match, classes, votes, songsMap }) {
    const router = useRouter();
    const [selectedClassId, setSelectedClassId] = useState('');
    const [optimisticVote, setOptimisticVote] = useState(undefined);

    // use optimisticVote if it's set (meaning we just acted), otherwise fallback to server data
    const currentVote = optimisticVote !== undefined ? optimisticVote : existingVote;

    const handleVote = async (formData) => {
        setIsSubmitting(true);
        setFeedback(null);

        // Client-side validation
        if (!selectedClassId) {
            setFeedback({ type: 'error', msg: 'Please select a class first!' });
            setIsSubmitting(false);
            return;
        }

        // Add classId manually
        formData.append('classId', selectedClassId);

        // Optimistic update
        const songId = formData.get('votedForId');
        setOptimisticVote({
            votedForId: songId,
            classId: selectedClassId
        });

        const res = await submitVote(formData);
        if (res?.error) {
            setFeedback({ type: 'error', msg: res.error });
            setOptimisticVote(undefined); // Revert on error
        } else {
            setFeedback({ type: 'success', msg: 'Vote Confirmed! 🎉' });
            router.refresh();
        }
        setIsSubmitting(false);
    };

    const handleUndo = async () => {
        if (!confirm('Are you sure you want to change your vote?')) return;
        setIsSubmitting(true);

        // Optimistic update
        setOptimisticVote(null);

        const res = await deleteVote(match.id, selectedClassId);
        if (res?.error) {
            setFeedback({ type: 'error', msg: res.error });
            setOptimisticVote(undefined); // Revert
        } else {
            setFeedback(null);
            router.refresh();
        }
        setIsSubmitting(false);
    };

    return (
        <div className="card">
            <h3 style={{ textAlign: 'center', marginBottom: '1.5rem', opacity: 0.8 }}>Round {match.round} Matchup</h3>

            {/* Class Dropdown - Global for this card */}
            <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Select Your Class:</label>
                <select
                    value={selectedClassId}
                    onChange={(e) => {
                        setSelectedClassId(e.target.value);
                        setFeedback(null);
                        setOptimisticVote(undefined); // Reset optimistic state on class switch
                    }}
                    disabled={isSubmitting}
                    style={{ width: '100%', padding: '0.8rem', borderRadius: '0.5rem', background: '#1e293b', color: 'white', border: '1px solid #475569' }}
                >
                    <option value="">-- Choose Class --</option>
                    {classes.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
            </div>

            {feedback && (
                <div style={{
                    padding: '1rem',
                    borderRadius: '0.5rem',
                    marginBottom: '1rem',
                    background: feedback.type === 'error' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(74, 222, 128, 0.2)',
                    color: feedback.type === 'error' ? '#fca5a5' : '#86efac',
                    textAlign: 'center',
                    border: feedback.type === 'error' ? '1px solid #ef4444' : '1px solid #4ade80'
                }}>
                    {feedback.msg}
                </div>
            )}

            {selectedClassId && currentVote ? (
                <div style={{ textAlign: 'center', padding: '2rem', background: '#334155', borderRadius: '0.5rem' }}>
                    <h3 style={{ color: '#4ade80', marginBottom: '1rem' }}>Vote Registered!</h3>
                    <p style={{ marginBottom: '1.5rem' }}>
                        Class <strong>{classes.find(c => c.id === selectedClassId)?.name}</strong> voted for:<br />
                        <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'white' }}>
                            {currentVote.votedForId === match.song1Id ? match.song1Title : match.song2Title}
                        </span>
                    </p>
                    <button
                        onClick={handleUndo}
                        disabled={isSubmitting}
                        className="btn"
                        style={{ background: '#ef4444', fontSize: '0.9rem' }}
                    >
                        {isSubmitting ? 'Updating...' : 'Change Vote'}
                    </button>
                </div>
            ) : (
                <form action={handleVote} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <input type="hidden" name="matchId" value={match.id} />

                    {/* Songs Selection */}
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', opacity: (!selectedClassId || isSubmitting) ? 0.5 : 1, transition: 'opacity 0.2s' }}>

                        {/* Option 1 */}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <label style={{
                                flex: 1,
                                padding: '1.5rem',
                                background: '#334155',
                                borderRadius: '0.5rem',
                                cursor: (!selectedClassId || isSubmitting) ? 'not-allowed' : 'pointer',
                                textAlign: 'center',
                                border: '2px solid transparent',
                                display: 'block'
                            }}>
                                <input
                                    type="radio"
                                    name="votedForId"
                                    value={match.song1Id}
                                    required
                                    disabled={!selectedClassId || isSubmitting}
                                    style={{ display: 'block', margin: '0 auto 1rem' }}
                                />
                                <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{match.song1Title}</div>
                            </label>
                            {songsMap[match.song1Id]?.youtubeUrl && (
                                <div style={{ borderRadius: '0.5rem', overflow: 'hidden', height: '200px' }}>
                                    <iframe
                                        width="100%"
                                        height="100%"
                                        src={`https://www.youtube.com/embed/${getYoutubeId(songsMap[match.song1Id].youtubeUrl)}`}
                                        title="YouTube video player"
                                        frameBorder="0"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                    ></iframe>
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center' }}>VS</div>

                        {/* Option 2 */}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <label style={{
                                flex: 1,
                                padding: '1.5rem',
                                background: '#334155',
                                borderRadius: '0.5rem',
                                cursor: (!selectedClassId || isSubmitting) ? 'not-allowed' : 'pointer',
                                textAlign: 'center',
                                border: '2px solid transparent',
                                display: 'block'
                            }}>
                                <input
                                    type="radio"
                                    name="votedForId"
                                    value={match.song2Id}
                                    required
                                    disabled={!selectedClassId || isSubmitting}
                                    style={{ display: 'block', margin: '0 auto 1rem' }}
                                />
                                <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{match.song2Title}</div>
                            </label>
                            {songsMap[match.song2Id]?.youtubeUrl && (
                                <div style={{ borderRadius: '0.5rem', overflow: 'hidden', height: '200px' }}>
                                    <iframe
                                        width="100%"
                                        height="100%"
                                        src={`https://www.youtube.com/embed/${getYoutubeId(songsMap[match.song2Id].youtubeUrl)}`}
                                        title="YouTube video player"
                                        frameBorder="0"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                    ></iframe>
                                </div>
                            )}
                        </div>
                    </div>

                    <button
                        className="btn btn-primary"
                        style={{ marginTop: '1rem' }}
                        disabled={!selectedClassId || isSubmitting}
                    >
                        {isSubmitting ? 'Submitting...' : (selectedClassId ? 'Submit Vote' : 'Select Class to Vote')}
                    </button>
                </form>
            )}
        </div>
    );
}
