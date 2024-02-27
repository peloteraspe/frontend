import { ParagraphS } from '@/components/atoms/Typography';
import Link from 'next/link';
import React from 'react';

const ComponentsPage = () => {
  return (
    <div>
      <Link href="/components/Typography">
        <ParagraphS underline>Typography</ParagraphS>
      </Link>

      <div className="mb-3">
        <Link href="/components/NavBar">
            <ParagraphS underline>Navbar</ParagraphS>
        </Link>
      </div>
    </div>
  );
};

export default ComponentsPage;
