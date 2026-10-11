import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/security';
import Workbench from '@/components/workbench';
export const dynamic = 'force-dynamic';
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) redirect('/login');
  return <Workbench email={user.email} initialPartId={(await params).id} />;
}
