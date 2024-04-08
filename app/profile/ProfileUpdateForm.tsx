"use client";
import { useEffect, useState } from 'react';
import { createClient } from "@/utils/supabase/client";
import { ButtonM, ParagraphM } from '@/components/atoms/Typography';
import SelectComponent, { OptionSelect } from '@/components/SelectComponent';

interface ProfileUpdateFormProps {
  userProfile: any;
  positionsData: any[];
  levelsData: any[]
}

const validate = (values: any) => {
  const errors: any = {}
}


const ProfileUpdateForm = ({
  userProfile, 
  positionsData, 
  levelsData}
  : ProfileUpdateFormProps
  ) => {
  const supabase = createClient();
  const [formData, setFormData] = useState({
    username: userProfile.username,
    level_id: userProfile.level_id,
  })

  const [positions, setPositions] = useState<OptionSelect[] | null>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const handleInputChange = (e: any) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };


   //Para  cargar las posiciones una vez que se haya montado el componente
  // useEffect(() => {
  //   if (props.positionsData && props.positionsData.length > 0) {
  //     const positionsDataOptions: OptionSelect[] = props.positionsData.map((position: any) => ({
  //       value: position.id,
  //       label: position.name
  //     }));
  //     setPositions(positionsDataOptions);
  //   }
  // }, [props.positionsData]); 


  
  //Update profile  data in the database using Supabase
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // const { data, error } = await supabase
    //   .from('profile')
    //   .update({ username: formData.username, level_id: formData.level_id })
    //   .eq('id', 24)
    //   .select()
  }


  return (
    <form className='flex flex-col space-y-8' onSubmit={handleSubmit}>
      <div className="flex flex-1 items-center justify-center space-x-4 md:justify-end">
        <button
          className="px-4 py-[0.60rem] bg-btnBg-light hover:bg-btnBg-dark hover:shadow text-white rounded-xl my-0 mx-2 flex justify-center items-center relative box-border"
          style={{ minWidth: "120px" }}
          disabled={isLoading}
        >
          {isLoading ? 
            <p className="">
               Cargando...
            </p> 
          : (
            <ButtonM color='text-white'>Guardar Cambios</ButtonM>
          )}
        </button>
      </div>
      <div className="sm:col-span-1 lg:col-span-6">
        <div className="flex justify-center items-center">
          <div className="md:p-6 rounded-md shadow-lg bg-white w-full xl:w-full mb-6"> 
            <div className="max-w-sm mt-2">
              <div className="p-6">
                <div className="mb-8">
                  <label htmlFor="username">
                    <ParagraphM fontWeight="semibold">
                      Crea un nombre
                    </ParagraphM>
                  </label>
                  <div className="relative mt-2">
                    <input
                      type="text"
                      name="username"
                      id="username"
                      value={formData.username}
                      onChange={handleInputChange}
                      className="p-2 rounded-xl w-full text-black leading-tight hover:outline-none placeholder:text-lightGray border border-[#54086F] focus:border-[#54086F] hover:border-[#54086F]"
                      placeholder="Ej. pelotera123"
                    />
                  </div>
                </div>

                <div className="mb-8">
                  <label htmlFor="positions">
                    <ParagraphM fontWeight="semibold">
                      ¿En qué posición prefieres jugar?
                    </ParagraphM>
                  </label>
                  <div className="relative mt-2">
                    <SelectComponent
                      options={positionsData.map((position: any) => ({
                        value: position.id, 
                        label: position.name
                      }))}
                      value={positions}
                      isMulti= {true}
                      onChange={(selected: any) => setPositions(selected)}
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label  htmlFor="level_id">
                    <ParagraphM fontWeight="semibold">
                      ¿Cuál es tu nivel?
                    </ParagraphM>
                  </label>
                  <div className="relative mt-2">
                    <select
                      id='level_id'
                      name="level_id"
                      value={formData.level_id}
                      onChange={handleInputChange}
                      className="p-2 rounded-xl w-full text-black leading-tight hover:outline-none placeholder:text-lightGray border border-[#54086F] focus:border-[#54086F] hover:border-[#54086F]"
                    >
                      {levelsData.map((item: any) => (
                        <option key={item.id} value={item.id} >{item.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  )
}
export default ProfileUpdateForm
