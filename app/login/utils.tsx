import { createClient } from '@/utils/supabase/client';

export const checkIfUserExists = async (email: string): Promise<boolean> => {
  const supabase = createClient();

  try {
    const { data, error } = await supabase.rpc('check_user_exists', {
      p_email: email,
    });

    if (error) {
      console.error('Error RPC check_user_exists:', error);
      return false;
    }

    return Boolean(data);
  } catch (err) {
    console.error('Unexpected error checking user:', err);
    return false;
  }
};
