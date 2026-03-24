// global.d.ts
declare module '*.css';

declare module '*.png' {
  const content: import('next/image').StaticImageData;
  export default content;
}

declare module '*.jpg' {
  const content: import('next/image').StaticImageData;
  export default content;
}

declare module '*.jpeg' {
  const content: import('next/image').StaticImageData;
  export default content;
}

declare module '*.gif' {
  const content: import('next/image').StaticImageData;
  export default content;
}

declare module '*.webp' {
  const content: import('next/image').StaticImageData;
  export default content;
}

declare module '*.svg' {
  const content: string;
  export default content;
}

declare module 'next/dist/build/segment-config/app/app-segment-config.js' {
  export type InstantConfigForTypeCheckInternal = any;
  export type PrefetchForTypeCheckInternal = any;
}
