import { createClient } from '@/utils/supabase/client';
import { log } from "'../../../src/shared/lib/logger'";

export const checkIfUserExists = async (email: string): Promise<boolean> => {
  console.log('checkIfUserExists started for:', email);
  const supabase = createClient();

  try {
    // Use a more reliable method - try to sign in with a dummy password
    // This will tell us if the user exists without needing a custom RPC
    console.log('Attempting auth check with dummy password...');

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: 'dummy-password-12345', // This will fail, but the error tells us if user exists
    });

    console.log('Auth check response:', { data, error });

    if (error) {
      const errorMsg = error.message?.toLowerCase() || '';
      console.log('Error message:', errorMsg);

      // If user exists but password is wrong, we get "Invalid login credentials"
      if (
        errorMsg.includes('invalid') ||
        errorMsg.includes('credentials') ||
        errorMsg.includes('wrong') ||
        errorMsg.includes('incorrect')
      ) {
        console.log('User exists (got invalid credentials error)');
        return true;
      }

      // If user doesn't exist, we might get "User not found" or "Email not confirmed"
      if (
        errorMsg.includes('not found') ||
        errorMsg.includes('user') ||
        errorMsg.includes('email')
      ) {
        console.log('User might not exist or email not confirmed');
        return false;
      }

      // For any other error, assume user doesn't exist
      console.log('Unknown error, assuming user does not exist');
      return false;
    }

    // If somehow we get here without error (shouldn't happen with dummy password)
    console.log('Unexpected success with dummy password');
    return true;
  } catch (err) {
    console.error('Unexpected error in checkIfUserExists:', err);
    log.error('Unexpected error checking user', 'LOGIN_UTILS', err, { email });

    // If there's a network error or similar, assume user doesn't exist
    return false;
  }
};
