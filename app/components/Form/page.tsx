'use client';
import React from 'react';
import Form, { type FormField } from '@/components/organisms/Form';

type MyFormValues = {
  firstName: string;
  lastName: string;
  favoriteColor: { value: string; label: string }[];
};

export default function MyCustomForm() {
  const fields: FormField<MyFormValues>[] = [
    {
      type: 'text',
      name: 'firstName',
      label: 'First Name',
      placeholder: 'Enter your first name',
      validation: { required: 'First name is required', maxLength: 50 },
    },
    {
      type: 'text',
      name: 'lastName',
      label: 'Last Name',
      placeholder: 'Enter your last name',
      validation: { required: 'Last name is required', maxLength: 50 },
    },
    {
      type: 'select',
      name: 'favoriteColor',
      label: 'Favorite Color',
      isMulti: true,
      options: [
        { value: 'red', label: 'Red' },
        { value: 'green', label: 'Green' },
        { value: 'blue', label: 'Blue' },
      ],
    },
  ];

  return (
    <Form<MyFormValues>
      defaultValues={{ firstName: '', lastName: '', favoriteColor: [] }} // [] para isMulti
      fields={fields}
      onSubmit={(data) => console.log(data)}
      submitLabel="Guardar"
      className="flex flex-col gap-4 w-full"
    />
  );
}
