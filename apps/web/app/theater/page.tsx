import type { Metadata } from 'next';
import OperationsTheater from './OperationsTheater';

export const metadata: Metadata = {
  title: 'Operations Theater',
  description:
    'A live global field — personnel and autonomous units coordinating in real time under one verified command layer.',
};

export default function TheaterPage() {
  return <OperationsTheater />;
}
