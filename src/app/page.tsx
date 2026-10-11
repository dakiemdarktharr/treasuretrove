import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/security';
import Workbench from '@/components/workbench';
export const dynamic = 'force-dynamic';
export default async function Page() {
  const user = await currentUser();
  if (!user) redirect('/login');
  return <Workbench email={user.email} />;
}
