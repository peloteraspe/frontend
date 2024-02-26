import Badge from "@/components/Badge";

const page = () => {
  return (
    <div className="grid grid-cols-3 gap-3">
      <Badge badgeType="Primary" text="Badge text" icon={false} />
      <Badge badgeType="Secondary" text="Badge text" icon={false} />
      <Badge badgeType="Third" text="Badge text" icon={false} />
      <Badge badgeType="Primary" text="Badge text" icon={true} />
      <Badge badgeType="Secondary" text="Badge text" icon={true} />
      <Badge badgeType="Third" text="Badge text" icon={true} />
    </div>
  );
};

export default page;
