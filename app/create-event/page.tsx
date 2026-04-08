import { redirect } from 'next/navigation';
import CreateEventActivationGateway from '@modules/events/ui/createEvent/CreateEventActivationGateway';
import { resolveCreateEventEntryState } from '@modules/events/lib/createEventEntry.server';

export const dynamic = 'force-dynamic';
export default async function CreateEventPage() {
  const state = await resolveCreateEventEntryState();

  if (state.kind === 'redirect') {
    redirect(state.destination);
  }

  if (state.kind === 'activation_required') {
    return (
      <CreateEventActivationGateway
        initialPhone={state.initialPhone}
        profileName={state.profileName}
      />
    );
  }

  redirect('/admin/events/new');
}
