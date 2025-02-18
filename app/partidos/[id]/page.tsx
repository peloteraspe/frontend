import MainPageDetails from '../mainPageDetails';

type Props = {
  params: { id: string };
};

export default async function SinglePost(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;

  return (
    <section>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <MainPageDetails id={params.id} />
      </div>
    </section>
  );
}
