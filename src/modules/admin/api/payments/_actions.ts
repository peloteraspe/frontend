'use server';

import { revalidatePath } from 'next/cache';
import { getServerSupabase } from '@core/api/supabase.server';
import { log } from '@core/lib/logger';

export async function approveAssistant(id: string) {
  try {
    const supabase = await getServerSupabase();

    const { error } = await supabase.from('assistants').update({ state: 'approved' }).eq('id', id);

    if (error) {
      log.database('UPDATE approve assistant', 'assistants', error, { id });
      throw new Error('Failed to approve assistant');
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

    const { error } = await supabase.from('assistants').update({ state: 'rejected' }).eq('id', id);

    if (error) {
      log.database('UPDATE reject assistant', 'assistants', error, { id });
      throw new Error('Failed to reject assistant');
    }

    log.info('Assistant rejected', 'ADMIN_PAYMENTS', { assistantId: id });
    revalidatePath('/admin/payments');

    return { success: true };
  } catch (error) {
    log.error('Error rejecting assistant', 'ADMIN_PAYMENTS', error, { id });
    throw error;
  }
}
