import { defaultSort, sorting } from "@/lib/constants";
import { getCollectionsFromSupabase } from "@/lib/supabase";
import Link from "next/link";

export const runtime = 'edge';

export const metadata = {
  title: 'Search',
  description: 'Search for products in the store.'
};

export default async function SearchPage({
  searchParams
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const { sort, q: searchValue } = searchParams as { [key: string]: string };
  const { sortKey, reverse } = sorting.find((item) => item.slug === sort) || defaultSort;

  const products = await getCollectionsFromSupabase({
    searchValue,
    sortKey,
    reverse
  });
  const resultsText = products.length > 1 ? 'results' : 'result';

  return (
    <>
      {searchValue ? (
        <p className="mb-4">
          {products.length === 0
            ? 'There are no products that match '
            : `Showing ${products.length} ${resultsText} for `}
          <span className="font-bold">&quot;{searchValue}&quot;</span>
        </p>
      ) : null}
      {products.length > 0 ? (
        <ul className="grid grid-cols-2 gap-4">
          {products.map((product) => (
            <li key={product.id}>
              <Link href={`/products/${product.title}`}>
                <a className="block p-4 border border-gray-200 rounded hover:border-gray-300">
                  <h2 className="text-lg font-bold">{product.title}</h2>
                </a>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}
