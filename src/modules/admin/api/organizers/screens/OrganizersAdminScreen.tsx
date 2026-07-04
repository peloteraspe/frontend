import { revalidatePath } from 'next/cache';
import {
  createOrganizerFromPartnerLead,
  getOrganizersAdminData,
  updateOrganizerBasics,
  updateOrganizerFeatureFlag,
} from '@modules/admin/api/organizers/organizers.service';
import OrganizersAdminManager from '@modules/admin/ui/organizers/OrganizersAdminManager';

type ActionResult = {
  ok: boolean;
  message: string;
};

function parseLeadId(value: FormDataEntryValue | null) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error('Postulacion invalida.');
  }
  return parsed;
}

function toActionResult(error: unknown): ActionResult {
  return {
    ok: false,
    message: error instanceof Error ? error.message : 'No se pudo completar la accion.',
  };
}

export default async function OrganizersAdminScreen() {
  const data = await getOrganizersAdminData();

  async function handleCreateOrganizer(formData: FormData): Promise<ActionResult> {
    'use server';

    try {
      await createOrganizerFromPartnerLead(parseLeadId(formData.get('leadId')));
      revalidatePath('/admin/organizers');
      return { ok: true, message: 'Organizadora piloto creada.' };
    } catch (error) {
      return toActionResult(error);
    }
  }

  async function handleUpdateOrganizer(formData: FormData): Promise<ActionResult> {
    'use server';

    try {
      await updateOrganizerBasics(
        String(formData.get('organizerId') || ''),
        String(formData.get('status') || ''),
        String(formData.get('internalNotes') || '')
      );
      revalidatePath('/admin/organizers');
      return { ok: true, message: 'Organizadora actualizada.' };
    } catch (error) {
      return toActionResult(error);
    }
  }

  async function handleToggleFlag(formData: FormData): Promise<ActionResult> {
    'use server';

    try {
      await updateOrganizerFeatureFlag(
        String(formData.get('userId') || ''),
        String(formData.get('flagKey') || ''),
        String(formData.get('enabled') || '') === 'true'
      );
      revalidatePath('/admin/organizers');
      return { ok: true, message: 'Funcion actualizada.' };
    } catch (error) {
      return toActionResult(error);
    }
  }

  return (
    <OrganizersAdminManager
      organizers={data.organizers}
      partnerLeads={data.partnerLeads}
      onCreateOrganizer={handleCreateOrganizer}
      onUpdateOrganizer={handleUpdateOrganizer}
      onToggleFlag={handleToggleFlag}
    />
  );
}
