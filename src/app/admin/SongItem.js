'use client';
import { useState, useEffect, useRef } from 'react';
import { deleteSong } from './actions';

export default function SongItem({ song }) {
    const [showMenu, setShowMenu] = useState(false);
    const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
    const menuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setShowMenu(false);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    const handleContextMenu = (e) => {
        e.preventDefault();
        setMenuPos({ x: e.pageX, y: e.pageY });
        setShowMenu(true);
    };

    return (
        <div
            onContextMenu={handleContextMenu}
            style={{
                padding: '0.2rem',
                borderBottom: '1px solid #333',
                fontSize: '0.9rem',
                cursor: 'context-menu',
                position: 'relative'
            }}
        >
            {song.title} - {song.artist}

            {showMenu && (
                <div
                    ref={menuRef}
                    style={{
                        position: 'fixed',
                        top: menuPos.y,
                        left: menuPos.x,
                        background: '#1e293b',
                        border: '1px solid #475569',
                        borderRadius: '4px',
                        padding: '0.5rem',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)',
                        zIndex: 50
                    }}
                >
                    <form action={deleteSong}>
                        <input type="hidden" name="id" value={song.id} />
                        <button style={{
                            background: 'none',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            padding: '0.2rem 0.5rem',
                            fontSize: '0.9rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}>
                            🗑️ Delete Song
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}
