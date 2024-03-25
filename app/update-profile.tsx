"use client";

import React, { useEffect, useState } from "react";
import SelectComponent, { OptionSelect } from "@/components/SelectComponent";

import { createClient } from "@/utils/supabase/client";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

const UpdateProfile = ({ user }: any) => {
  const supabase = createClient();
  const router = useRouter();
  const [selectedMultiOptions, setSelectedMultiOptions] = useState<
    OptionSelect[] | null
  >(null);
  const [formData, setFormData] = useState({
    username: "",
  });
  const [loading, setLoading] = useState(false);
  const [posiciones, setPosiciones] = useState<OptionSelect[]>([]);

  const handleInputChange = (e: any) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();

    //instertamos los datos pero como upsert nos devuelve null en la data procedemos a que si no hay fallos hacer una consulta con ese usuario recien creado.
    const { error: profileError } = await supabase.from("profile").upsert(
      {
        user: user.id,
        username: formData.username,
      },
      {
        // Specify conflict handling options here if needed
        // For example, specify the column to detect conflicts on:
        // onConflict: 'id'
      }
    );
    if (profileError) {
      console.error("Error creating profile:", profileError);
    } else {
      // Ahora si buscamos a ese usuario recien creado y si no hay ningun error procedemos con la asignacion de posiciones
      const { data: profileData, error: profileDataError } = await supabase
        .from("profile")
        .select("*")
        .eq("username", formData.username)
        .single();
      if (profileDataError) {
        console.error("Error fetching updated profile:", profileDataError);
      }
      if (profileData !== null && profileData.id) {
        const profileId = profileData?.id;
        // obtenemos el id del usuario y insertamos en la tabla intermedia la relacion del usuario creado y las posiciones seleccionadas
        const positionsIds = selectedMultiOptions?.map((e) => ({
          profile_id: profileId,
          position_id: e.value,
        }));

        const { error: positionError } = await supabase
          .from("profile_position")
          .upsert(positionsIds);

        if (positionError) {
          console.error("Error updating positions:", positionError);
        } else {
          setLoading(true);
          setTimeout(() => {
            toast.success("Perfil creado");
            router.refresh();
            setLoading(false);
          }, 5000);
        }
      }
    }
  };

  useEffect(() => {
    // obtengo las posiciones y se las agrego a mi estado local para poder pasarselo al select multiple.
    const fetchPosiciones = async () => {
      try {
        const { data, error } = await supabase
          .from("player_position")
          .select("id, name");

        if (error) {
          console.error("Error fetching positions:", error);
        } else {
          const positionOptions = data.map((position: any) => ({
            value: position.id,
            label: position.name,
          }));
          setPosiciones(positionOptions);
        }
      } catch (error) {
        console.error("Error fetching positions:", error);
      }
    };
    fetchPosiciones();
  }, []);

  return (
    <section>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="py-8">
          <div className="md:flex md:justify-between" data-sticky-container>
            {/* Main content */}
            <div className="md:grow">
              <div className="max-w-6xl mx-auto px-4 sm:px-6">
                <div
                  className="md:flex md:justify-between"
                  data-sticky-container
                >
                  <div className="md:grow">
                    <div className="max-w-3xl mx-auto">
                      <div className="text-center">
                        <h1 className="text-4xl font-bold">
                          ¡Bienvenida a Peloteras!
                        </h1>
                        <p className="mt-4 text-md">
                          Para poder continuar, necesitamos que completes tu
                          perfil.
                        </p>
                      </div>
                      <form
                        onSubmit={handleSubmit}
                        className="space-y-8 divide-y divide-gray-200"
                      >
                        {/* ... rest of your form code */}
                        <div className="col-span-1">
                          <label
                            htmlFor="username"
                            className="block text-sm font-medium"
                          >
                            Nombre de usuario
                          </label>
                          <div className="mt-1">
                            <input
                              type="text"
                              name="username"
                              id="username"
                              value={formData.username}
                              onChange={handleInputChange}
                              className="shadow-sm focus:ring-primary focus:border-primary block w-full sm:text-sm border-gray-300 rounded-md"
                              placeholder="Ej. pelotera123"
                            />
                          </div>
                        </div>
                        <div className="col-span-1">
                          <label
                            htmlFor="playerPosition"
                            className="block text-sm font-medium"
                          >
                            Posición
                          </label>
                          <div className="mt-1">
                            <SelectComponent
                              options={posiciones}
                              onChange={(value: any) =>
                                setSelectedMultiOptions(value)
                              }
                              isMulti={true}
                              value={selectedMultiOptions}
                            />
                          </div>
                        </div>
                        <div className="mt-8">
                          <button
                            type="submit"
                            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                          >
                            {loading ? "Cargando..." : "Actualizar perfil"}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default UpdateProfile;
