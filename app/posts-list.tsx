import { cookies } from 'next/headers';
import PostItem from './post-item';
import { createClient } from '@/utils/supabase/server';

interface Post {
  id: number;
  title: string;
  locationText: string;
  image: string;
  start_time: string;
  end_time: string;
  price: string;
  created_by: string;
  description: string;
}

export default async function PostsList() {
  // Await the cookies() promise to get the actual cookies object.
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: postsData, error } = await supabase.from('event').select('*');
  const posts = postsData; // no need to await postsData if it's not a promise

  return (
    <div className="pb-8 md:pb-16">
      <h2 className="text-3xl font-bold font-inter mb-10">Últimos partidos</h2>
      {/* List container */}
      <div className="flex flex-col">
        {posts?.map((post: Post) => (
          <PostItem key={post.id} {...post} />
        ))}
        {/* Newletter CTA */}
        {/* <div className="py-8 border-b border-gray-200 -order-1">
          <Newsletter />
        </div> */}
      </div>
    </div>
  );
}