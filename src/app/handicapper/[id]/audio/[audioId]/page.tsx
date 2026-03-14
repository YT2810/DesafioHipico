import { Metadata } from 'next';
import AudioPlayerClient from './AudioPlayerClient';

export const metadata: Metadata = {
  title: 'Audio del Experto | Desafío Hípico',
};

export default async function AudioPage({
  params,
}: {
  params: Promise<{ id: string; audioId: string }>;
}) {
  const { id, audioId } = await params;
  return <AudioPlayerClient handicapperId={id} audioId={audioId} />;
}
