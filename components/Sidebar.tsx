'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import Select from 'react-select';

export default function Sidebar() {
  const form = useForm();
  const options = [
    { value: 'Cercado de Lima', label: 'Cercado Lima' },
    { value: 'Rímac', label: 'Rímac' },
    { value: 'Jesús María', label: 'Jesús María' },
    { value: 'San Miguel', label: 'San Miguel' },
    { value: 'San Isidro', label: 'San Isidro' },
    { value: 'Magdalena', label: 'Magdalena' },
    { value: 'San Borja', label: 'San Borja' },
    { value: 'Surco', label: 'Surco' },
    { value: 'Surquillo', label: 'Surquillo' },
    { value: 'San Luis', label: 'San Luis' },
    { value: 'La Molina', label: 'La Molina' },
    { value: 'Ate', label: 'Ate' },
    { value: 'Callao', label: 'Callao' },
    { value: 'San Martín de Porres', label: 'San Martín de Porres' },
    { value: 'Los Olivos', label: 'Los Olivos' },
    { value: 'Independencia', label: 'Independencia' },
    { value: 'Comas', label: 'Comas' },
    { value: 'Carabayllo', label: 'Carabayllo' },
    { value: 'Chorrillos', label: 'Chorrillos' },
    { value: 'Pueblo Libre', label: 'Pueblo Libre' },
    { value: 'Barranco', label: 'Barranco' },
    { value: 'La Victoria', label: 'La Victoria' },
    { value: 'El Agustino', label: 'El Agustino' },
    { value: 'San Juan de Miraflores', label: 'San Juan de Miraflores' },
    { value: 'Villa María del Triunfo', label: 'Villa María del Triunfo' },
    { value: 'Villa El Salvador', label: 'Villa El Salvador' },
    { value: 'San Juan de Miraflores', label: 'San Juan de Miraflores' },
  ];

  return (
    <aside className="mb-8 md:mb-0 md:w-64 lg:w-72 md:ml-12 lg:ml-20 md:shrink-0 md:order-1">
      <div
        data-sticky=""
        data-margin-top="32"
        data-sticky-for="768"
        data-sticky-wrap=""
      >
        <div className="relative bg-gray-50 rounded-xl border border-gray-200 p-5">
          <div className="absolute top-5 right-5 leading-none">
            <button className="text-sm font-medium text-indigo-500 hover:underline">
              Limpiar filtros
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-1 gap-6">
            {/* Group 1 */}
            <div>
              <div className="text-sm text-gray-800 font-semibold mb-3">
                Tipo de juego
              </div>
              <ul className="space-y-2">
                <li>
                  <label className="flex items-center">
                    <input type="checkbox" className="form-checkbox" />
                    <span className="text-sm text-gray-600 ml-2">
                      Pichanga libre
                    </span>
                  </label>
                </li>
                <li>
                  <label className="flex items-center">
                    <input type="checkbox" className="form-checkbox" />
                    <span className="text-sm text-gray-600 ml-2">
                      Versus de equipos
                    </span>
                  </label>
                </li>
              </ul>
            </div>
            {/* Group 2 */}
            <div>
              <div className="text-sm text-gray-800 font-semibold mb-3">
                Fecha
              </div>
              <ul className="space-y-2">
                <li>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="form-checkbox"
                      defaultChecked
                    />
                    <span className="text-sm text-gray-600 ml-2">Hoy</span>
                  </label>
                </li>
                <li>
                  <label className="flex items-center">
                    <input type="checkbox" className="form-checkbox" />
                    <span className="text-sm text-gray-600 ml-2">Mañana</span>
                  </label>
                </li>
              </ul>
            </div>
            {/* Group 3 */}
            <div>
              <div className="text-sm text-gray-800 font-semibold mb-3">
                Costo
              </div>
              <ul className="space-y-2">
                <li>
                  <label className="flex items-center">
                    <input type="checkbox" className="form-checkbox" />
                    <span className="text-sm text-gray-600 ml-2">
                      S/0 - S/10
                    </span>
                  </label>
                </li>
                <li>
                  <label className="flex items-center">
                    <input type="checkbox" className="form-checkbox" />
                    <span className="text-sm text-gray-600 ml-2">
                      S/10 - S/15
                    </span>
                  </label>
                </li>
                <li>
                  <label className="flex items-center">
                    <input type="checkbox" className="form-checkbox" />
                    <span className="text-sm text-gray-600 ml-2">
                      &gt; S/15
                    </span>
                  </label>
                </li>
              </ul>
            </div>
            {/* Group 4 */}
            <div>
              <div className="text-sm text-gray-800 font-semibold mb-3">
                Distrito
              </div>
              <label className="sr-only">Ubicación</label>
              <Select options={options} isMulti placeholder="Ubicación" />
            </div>
            {/* Group 5 */}
            <div>
              <div className="text-sm text-gray-800 font-semibold mb-3">
                Extras
              </div>
              <ul className="space-y-2">
                <li>
                  <label className="flex items-center">
                    <input type="checkbox" className="form-checkbox" />
                    <span className="text-sm text-gray-600 ml-2">
                      Estacionamiento
                    </span>
                  </label>
                </li>
                <li>
                  <label className="flex items-center">
                    <input type="checkbox" className="form-checkbox" />
                    <span className="text-sm text-gray-600 ml-2">Chalecos</span>
                  </label>
                </li>
                <li>
                  <label className="flex items-center">
                    <input type="checkbox" className="form-checkbox" />
                    <span className="text-sm text-gray-600 ml-2">Música</span>
                  </label>
                </li>
                <li>
                  <label className="flex items-center">
                    <input type="checkbox" className="form-checkbox" />
                    <span className="text-sm text-gray-600 ml-2">
                      Arbitraje
                    </span>
                  </label>
                </li>
              </ul>
            </div>
            {/* Group 6 */}
            <div>
              <div className="text-sm text-gray-800 font-semibold mb-3">
                Duración
              </div>
              <ul className="space-y-2">
                <li>
                  <label className="flex items-center">
                    <input type="checkbox" className="form-checkbox" />
                    <span className="text-sm text-gray-600 ml-2">1 hora</span>
                  </label>
                </li>
                <li>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="form-checkbox"
                      defaultChecked
                    />
                    <span className="text-sm text-gray-600 ml-2">2 horas</span>
                  </label>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
