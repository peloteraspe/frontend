'use client';
import { createClient } from '@/utils/supabase/client';
import React, { useState } from 'react';

const UpdateProfile = ({ email }: any) => {
  const supabase = createClient();
  const [formData, setFormData] = useState({
    username: '',
    playerPosition: 'Portera', // Default value, you can set it based on your requirements
  });

  const handleInputChange = (e: any) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e: any) => {
    e.preventDefault();
    console.log('Form data submitted:', formData);
    // Update user metadata
    supabase.auth
      .updateUser({
        email,
        data: {
          username: formData.username,
          playerPosition: formData.playerPosition,
        },
      })
      .then((res) => {
        console.log('User metadata updated successfully:', res);
      })
      .catch((err) => {
        console.error('Error updating user metadata:', err);
      });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-8 divide-y divide-gray-200"
    >
      {/* ... rest of your form code */}
      <div className="col-span-1">
        <label htmlFor="username" className="block text-sm font-medium">
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
        <label htmlFor="playerPosition" className="block text-sm font-medium">
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
          Guardar
        </button>
      </div>
    </form>
  );
};

export default UpdateProfile;
