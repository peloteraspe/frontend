import { notFound } from 'next/navigation';
import { getPublicCheckinBySlug } from '@modules/checkins/api/services/checkins.service';
import CheckinPublicPage from '@modules/checkins/ui/public/CheckinPublicPage';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const checkin = await getPublicCheckinBySlug(slug);
  if (!checkin) {
    notFound();
  }

  return <CheckinPublicPage checkin={checkin} />;
}
