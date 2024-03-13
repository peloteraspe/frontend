'use client';

import React, { useEffect, useState } from 'react';
import SelectComponent, { OptionSelect } from '@/components/SelectComponent';

import { createClient } from '@/utils/supabase/client';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import {
  SubtitleM,
  Title2XL,
  TitleL,
  TitleXL,
} from '@/components/atoms/Typography';
import Form from '@/components/organisms/Form';
import { useForm } from 'react-hook-form';
import { ButtonWrapper } from '@/components/Button';

const UpdateProfile = ({ user }: any) => {
  const form = useForm();
  const supabase = createClient();
  const router = useRouter();
  const [selectedMultiOptions, setSelectedMultiOptions] = useState<
    OptionSelect[] | null
  >(null);
  const [formData, setFormData] = useState({
    username: '',
  });
  const [loading, setLoading] = useState(false);
  const [posiciones, setPosiciones] = useState<OptionSelect[]>([]);

  const handleInputChange = (e: any) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // const handleSubmit = async (e: any) => {
  //   e.preventDefault();

  //   //instertamos los datos pero como upsert nos devuelve null en la data procedemos a que si no hay fallos hacer una consulta con ese usuario recien creado.
  //   const { error: profileError } = await supabase.from('profile').upsert(
  //     {
  //       user: user.id,
  //       username: formData.username,
  //     },
  //     {
  //       // Specify conflict handling options here if needed
  //       // For example, specify the column to detect conflicts on:
  //       // onConflict: 'id'
  //     }
  //   );
  //   if (profileError) {
  //     console.error('Error creating profile:', profileError);
  //   } else {
  //     // Ahora si buscamos a ese usuario recien creado y si no hay ningun error procedemos con la asignacion de posiciones
  //     const { data: profileData, error: profileDataError } = await supabase
  //       .from('profile')
  //       .select('*')
  //       .eq('username', formData.username)
  //       .single();
  //     if (profileDataError) {
  //       console.error('Error fetching updated profile:', profileDataError);
  //     }
  //     if (profileData !== null && profileData.id) {
  //       const profileId = profileData?.id;
  //       // obtenemos el id del usuario y insertamos en la tabla intermedia la relacion del usuario creado y las posiciones seleccionadas
  //       const positionsIds = selectedMultiOptions?.map((e) => ({
  //         profile_id: profileId,
  //         position_id: e.value,
  //       }));

  //       const { error: positionError } = await supabase
  //         .from('profile_position')
  //         .upsert(positionsIds);

  //       if (positionError) {
  //         console.error('Error updating positions:', positionError);
  //       } else {
  //         setLoading(true);
  //         setTimeout(() => {
  //           toast.success('Perfil creado');
  //           router.refresh();
  //           setLoading(false);
  //         }, 5000);
  //       }
  //     }
  //   }
  // };

  const handleSubmit = form.handleSubmit(async (data: any) => {
    const { username, positions, level } = data;
    const { error: profileError } = await supabase.from('profile').upsert({
      user: user.id,
      
      level: level.value,
    });
    if (profileError) {
      console.error('Error creating profile:', profileError);
    } else {
      const { data: profileData, error: profileDataError } = await supabase
        .from('profile')
        .select('*')
        .eq('username', username)
        .single();
      if (profileDataError) {
        console.error('Error fetching updated profile:', profileDataError);
      }
      if (profileData !== null && profileData.id) {
        const profileId = profileData?.id;
        const positionsIds = positions.map((position: OptionSelect) => ({
          profile_id: profileId,
          position_id: position.value,
        }));
        const { error: positionError } = await supabase
          .from('profile_position')
          .upsert(positionsIds);
        if (positionError) {
          console.error('Error updating positions:', positionError);
        } else {
          setLoading(true);
          setTimeout(() => {
            toast.success('Perfil creado');
            router.refresh();
            setLoading(false);
          }, 5000);
        }
      }
    }
  });

  useEffect(() => {
    // obtengo las posiciones y se las agrego a mi estado local para poder pasarselo al select multiple.
    const fetchPosiciones = async () => {
      try {
        const { data, error } = await supabase
          .from('player_position')
          .select('id, name');

        if (error) {
          console.error('Error fetching positions:', error);
        } else {
          const positionOptions = data.map((position: any) => ({
            value: position.id,
            label: position.name,
          }));
          setPosiciones(positionOptions);
        }
      } catch (error) {
        console.error('Error fetching positions:', error);
      }
    };
    fetchPosiciones();
  }, []);

  const fields = [
    {
      name: 'username',
      label: 'Nombre de usuario',
      type: 'text',
      placeholder: 'Nombre de usuario',
    },
    {
      name: 'positions',
      label: 'Posiciones',
      type: 'select',
      placeholder: 'Selecciona las posiciones en las que juegas',
      options: posiciones,
      isMulti: true,
    },
    {
      name: 'level',
      label: 'Nivel',
      type: 'select',
      placeholder: 'Selecciona tu nivel',
      options: [
        { value: 1, label: 'Principiante' },
        { value: 2, label: 'Intermedio' },
        { value: 3, label: 'Avanzado' },
      ],
    },
  ];

  return (
    <section>
      <div className="sm:max-w-3xl mx-auto max-w-md p-4 h-full py-12">
        <div className="text-center">
          <Title2XL>Bienvenida a</Title2XL>
          <Title2XL color="text-primary">Peloteras</Title2XL>
          <div className="mt-4 max-w-xl">
            <SubtitleM>
              Completa tus datos por primera vez para que tengas una experiencia
              personalizada
            </SubtitleM>
          </div>
        </div>
        <div className="max-w-md mx-auto mt-4">
          <Form
            fields={fields}
            defaultValues={{
              username: '',
              positions: null,
              level: '',
            }}
            form={form}
          />
          <div className="flex justify-center mt-4">
            <ButtonWrapper
              width={100}
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? 'Cargando...' : 'Crear cuenta'}
            </ButtonWrapper>
          </div>
        </div>
      </div>
    </section>
  );
};

export default UpdateProfile;
