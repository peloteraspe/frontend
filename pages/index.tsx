import type { NextPage } from 'next';
import { Form } from '@/components/organisms';
import { loginForm } from '@/utils/constants/forms';
import { useForm } from 'react-hook-form';
import { Button, Icon } from '@/components/atoms';
import { useRouter } from 'next/navigation';
import { User } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

const Home: NextPage = () => {
  const [isAuthed, setAuthStatus] = useState(false);

  const router = useRouter();
  useEffect(() => {
    fetch('./api/getUser')
      .then((response) => response.json())
      .then((result) => {
        console.log(result);
        setAuthStatus(result.user && result.user.role === 'authenticated');
      });
  }, []);

  if (isAuthed) {
    router.push('/dashboard');
  }

  return <Button text="Ingresar" onClick={() => router.push('/signIn')} />;
};

export default Home;
