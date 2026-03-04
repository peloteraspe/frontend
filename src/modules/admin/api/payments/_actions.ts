'use server';

import { revalidatePath } from 'next/cache';
import { getServerSupabase } from '@core/api/supabase.server';
import { log } from '@core/lib/logger';
import { ensureTicketForAssistant } from '@modules/tickets/api/services/tickets.service';

export async function approveAssistant(id: string) {
  try {
    const supabase = await getServerSupabase();
    const assistantId = Number(id);

    const { error } = await supabase.from('assistants').update({ state: 'approved' }).eq('id', id);

    if (error) {
      log.database('UPDATE approve assistant', 'assistants', error, { id });
      throw new Error('Failed to approve assistant');
    }

    if (Number.isFinite(assistantId)) {
      try {
        const result = await ensureTicketForAssistant(supabase, assistantId);
        if (result.reason === 'ticket_table_missing') {
          log.warn('Ticket table missing while approving assistant', 'ADMIN_PAYMENTS', {
            assistantId,
          });
        }
      } catch (ticketError: any) {
        log.warn('Ticket sync failed after assistant approval', 'ADMIN_PAYMENTS', {
          assistantId,
          message: ticketError?.message,
        });
      }
    }

    log.info('Assistant approved', 'ADMIN_PAYMENTS', { assistantId: id });
    revalidatePath('/admin/payments');

    return { success: true };
  } catch (error) {
    log.error('Error approving assistant', 'ADMIN_PAYMENTS', error, { id });
    throw error;
  }
}

export async function rejectAssistant(id: string) {
  try {
    const supabase = await getServerSupabase();
    const assistantId = Number(id);

    const { error } = await supabase.from('assistants').update({ state: 'rejected' }).eq('id', id);

    if (error) {
      log.database('UPDATE reject assistant', 'assistants', error, { id });
      throw new Error('Failed to reject assistant');
    }

    if (Number.isFinite(assistantId)) {
      try {
        const result = await ensureTicketForAssistant(supabase, assistantId);
        if (result.reason === 'ticket_table_missing') {
          log.warn('Ticket table missing while rejecting assistant', 'ADMIN_PAYMENTS', {
            assistantId,
          });
        }
      } catch (ticketError: any) {
        log.warn('Ticket sync failed after assistant rejection', 'ADMIN_PAYMENTS', {
          assistantId,
          message: ticketError?.message,
        });
      }
    }

    log.info('Assistant rejected', 'ADMIN_PAYMENTS', { assistantId: id });
    revalidatePath('/admin/payments');

    return { success: true };
  } catch (error) {
    log.error('Error rejecting assistant', 'ADMIN_PAYMENTS', error, { id });
    throw error;
  }
}
