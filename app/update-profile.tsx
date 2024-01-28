"use client";
import { createClient } from "@/utils/supabase/client";
import React, { useState } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

const UpdateProfile = ({ user }: any) => {
  const supabase = createClient();
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: "",
    playerPosition: "Portera", // Default value, you can set it based on your requirements
  });
  const [supabaseData, setSupabaseData] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e: any) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();

    // Update or insert into the 'profiles' table
    const { data, error } = await supabase.from("profile").upsert(
      {
        user: user.id,
        username: formData.username,
        playerPosition: formData.playerPosition,
      },
      {
        // Specify conflict handling options here if needed
        // For example, specify the column to detect conflicts on:
        // onConflict: 'id'
      }
    );

    if (error) {
      console.error("Error updating profile:", error);
    } else {
      setSupabaseData(data);
      setLoading(true);
      setTimeout(() => {
        toast.success("Perfil actualizado");
        router.refresh();
        setLoading(false);
      }, 5000);
    }
  };

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
                            <select
                              id="playerPosition"
                              name="playerPosition"
                              value={formData.playerPosition}
                              onChange={handleInputChange}
                              className="shadow-sm focus:ring-primary focus:border-primary block w-full sm:text-sm border-gray-300 rounded-md cursor-pointer"
                            >
                              <option>Portera</option>
                              <option>Defensa</option>
                              <option>Mediocampista</option>
                              <option>Delantera</option>
                            </select>
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
