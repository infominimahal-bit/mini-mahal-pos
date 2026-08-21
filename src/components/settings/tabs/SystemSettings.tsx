import { DatabaseTools } from '../DatabaseTools';
import { LedgerHealth } from './LedgerHealth';

export function SystemSettings() {
  return (
    <section className="space-y-8">
      <DatabaseTools />
      <LedgerHealth />
    </section>
  );
}
