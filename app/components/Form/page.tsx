'use client';
import Form, { FormField } from '@/components/organisms/Form';
import React from 'react';
import { useForm } from 'react-hook-form';

const MyCustomForm: React.FC = () => {
  const form = useForm();
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
        { value: 'red', label: 'Red' },
        { value: 'green', label: 'Green' },
        { value: 'blue', label: 'Blue' },
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
      form={form}
    />
  );
};

export default MyCustomForm;
