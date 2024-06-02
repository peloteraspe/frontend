import MainPageDetails from "../mainPageDetails";

export default async function SinglePost({
  params,
}: {
  params: { id: number };
}) {
  return (
    <section>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <MainPageDetails id={params.id.toString()} />
      </div>
    </section>
  );
}
