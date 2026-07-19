import type { Metadata } from 'next';
import OperationsConsole from './OperationsConsole';

export const metadata: Metadata = {
  title: 'Command Console',
  description:
    'The forensic operating console — a live policy-decision stream, the action-proposal lifecycle, an approvals queue with step-up, and a hash-chained audit stream.',
};

export default function ConsolePage() {
  return <OperationsConsole />;
}
