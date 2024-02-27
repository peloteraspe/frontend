import Image from "next/image";

interface UserImageProps {
  src: string | null | undefined;
}

const UserImage: React.FC<UserImageProps> = ({ src }) => {
  return ( 
    <Image 
      className="rounded-full" 
      height={40} 
      width={40} 
      alt="Imagen usuario" 
      src={src || '/placeholder.jpg'}
    />
   );
}
 
export default UserImage;