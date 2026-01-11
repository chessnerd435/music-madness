export const dynamic = 'force-dynamic';

import { cookies } from 'next/headers';
import Link from 'next/link';
import { login } from './actions';

export default async function AdminPage() {
    return (
        <div>
            <h1>Admin Debug Mode</h1>
            <p>If you see this, the layout and routing are fine.</p>
            <Link href="/">Back</Link>
        </div>
    );
}
