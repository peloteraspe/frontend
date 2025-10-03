"use client";
import Form, { FormField } from '@/components/organisms/Form';
import React from 'react';

const MyCustomForm: React.FC = () => {
  const formFields: FormField[] = [
    {
      type: 'text',
      name: 'firstName',
      label: 'First Name',
      placeholder: 'Enter your first name',
      validation: { required: 'First name is required' },
    },
    {
      type: 'text',
      name: 'lastName',
      label: 'Last Name',
      placeholder: 'Enter your last name',
      validation: { required: 'Last name is required' },
    },
    {
      type: 'select',
      name: 'favoriteColor',
      options: [
      ],
      isMulti: true,
      label: 'Favorite Color',
    },
  ];

  const onSubmit = (data: any) => {
    console.log(data);
  };

  return (
    <Form
      defaultValues={{ firstName: '', lastName: '', favoriteColor: null }}
      fields={formFields}
      onSubmit={onSubmit}
    />
  );
};

export default MyCustomForm;
