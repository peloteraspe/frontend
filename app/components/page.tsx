import { ParagraphS } from '@/components/atoms/Typography';
import Link from 'next/link';
import React from 'react';

const ComponentsPage = () => {
  return (
    <div>
      <Link href="/components/Typography">
        <ParagraphS underline>Typography</ParagraphS>
      </Link>
    </div>
  );
};

export default ComponentsPage;
