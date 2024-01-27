import { defaultSort, sorting } from '@/lib/constants';
import { getCollectionBySlugFromSupabase } from '@/lib/supabase';
import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export const runtime = 'edge';

export async function generateMetadata({
  params,
}: {
  params: { collection: string };
}): Promise<Metadata> {
  const collection = (await getCollectionBySlugFromSupabase(
    params.collection
  )) as any;

  if (!collection) return notFound();

  return {
    title: collection.seo?.title || collection.title,
    description:
      collection.seo?.description ||
      collection.description ||
      `${collection.title} products`,
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: { collection: string };
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const { sort } = searchParams as { [key: string]: string };
  const { sortKey, reverse } =
    sorting.find((item) => item.slug === sort) || defaultSort;
  const products = (await getCollectionBySlugFromSupabase(
    params.collection
  )) as any;

  console.log(products, 'products');

  return (
    <section>
      <h1 className="mb-4 text-2xl font-bold">{products.name}</h1>
      {products.description ? (
        <p className="mb-4 text-gray-600">{products.description}</p>
      ) : null}
      {products.products.length > 0 ? (
        <ul className="grid grid-cols-2 gap-4">
          {products.products.map((product: any) => (
            <li key={product.id}>
              <Link href={`/products/${product.slug}`}>
                <a className="block p-4 border border-gray-200 rounded hover:border-gray-300">
                  <h2 className="text-lg font-bold">{product.name}</h2>
                </a>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
