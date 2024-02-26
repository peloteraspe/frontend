import Link from "next/link";
import { ParagraphS } from "@/components/atoms/Typography";
import React from "react";

const ComponentsPage = () => {
  return (
    <div>
      <Link href="/components/Typography">
        <ParagraphS underline>Typography</ParagraphS>
      </Link>
      <Link href="/components/Badge">
        <ParagraphS underline>Badge</ParagraphS>
      </Link>
    </div>
  );
};

export default ComponentsPage;
