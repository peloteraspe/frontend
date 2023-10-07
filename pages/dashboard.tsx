import { supabase } from '@/supabase';
import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/atoms';
import { useSessionContext } from '@supabase/auth-helpers-react';
import { resetUser } from '@/api/user';
import { Form } from '@/components/organisms';
import { useForm } from 'react-hook-form';

const Dashboard = () => {
  const router = useRouter();
  const form = useForm();
  const { session } = useSessionContext();

  useMemo(() => {
    if (session === null) {
      router.push('/signIn');
    } else {
      if (Object.keys(session.user.user_metadata).length === 0) {
        router.push('/signUp');
      }
    }
  }, [session]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <div>
      <h1>Hola, {session?.user.user_metadata.username}! </h1>
      <Form
        formInputs={[
          {
            id: 'tags',
            name: 'tags',
            label: 'Tags',
            addTag: true,
            tags: [
              {
                text: 'Música',
                icon: '/assets/characteristics/musica.svg',
              },
              {
                text: 'Botiquín',
                icon: '/assets/characteristics/botiquin.svg',
              },
              {
                text: 'Estacionamiento',
                icon: '/assets/characteristics/estacionamiento.svg',
              },
              {
                text: 'Chaleco deportivo',
                icon: '/assets/characteristics/chaleco.svg',
              },
              {
                text: 'Arbitraje',
                icon: '/assets/characteristics/arbitraje.svg',
              },
              {
                text: 'Bebidas',
                icon: '/assets/characteristics/bebidas.svg',
              },
            ],
            labelTags: 'Escoge al menos 3 características',
          },
        ]}
        {...form}
      />
      <Button onClick={() => resetUser(session, router)}>Reset userData</Button>
      <Button onClick={() => handleLogout()}>Cerrar Sesión</Button>
    </div>
  );
};

export default Dashboard;
