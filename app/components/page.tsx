import Link from 'next/link';
import { ParagraphS } from '@/components/atoms/Typography';
import React from 'react';

const ComponentsPage = () => {
  return (
    <div>
      <Link href="/components/Typography">
        <ParagraphS underline>Typography</ParagraphS>
      </Link>

      <Link href="/components/Badge">
        <ParagraphS underline>Badge</ParagraphS>
      </Link>

      <div className="mt-3">
        <Link href="/components/NavBar">
          <ParagraphS underline>Navbar</ParagraphS>
        </Link>
      </div>

      <div className="mb-3">
        <Link href="/components/SelectComponent">
          <ParagraphS underline>SelectComponent</ParagraphS>
        </Link>
      </div>

      <div className="mb-3">
        <Link href="/components/CardEvent">
          <ParagraphS underline>CardEvent</ParagraphS>
        </Link>
      </div>

      <div className="mb-3">
        <Link href="/components/Form">
          <ParagraphS underline>Form</ParagraphS>
        </Link>
      </div>

      <div className="mb-3">
        <Link href="/components/events">
          <ParagraphS underline>filters</ParagraphS>
        </Link>
      </div>
    </div>
  );
};

export default ComponentsPage;
