import Link from 'next/link';

export default function Header() {
  return (
    <div className="max-w-5xl text-center md:text-left">
      {/* Copy */}
      <h1 className="h1 font-poppins mb-6">
        Donde las mujeres dominamos la cancha
      </h1>
      <div className="text-lg mb-8 text-secondary-dark">
        <p>
          {' '}
          Como organizadora de partidos, desata tu pasión creando experiencias
          únicas en el campo.
        </p>{' '}
        <p className="mt-2">
          Como jugadora, regístrate para descubrir y unirte a eventos
          emocionantes, conectarte con compañeras apasionadas y vivir la
          verdadera esencia del fútbol femenino.
        </p>
        <p className="mt-2">
          En Peloteras, cada clic es un paso hacia la revolución del fútbol,
          donde todas tenemos un lugar para brillar y dominar la cancha juntas.
        </p>
      </div>
      {/* Button + Avatars */}
      <div className="sm:flex sm:items-center sm:justify-center md:justify-start space-y-6 sm:space-y-0 sm:space-x-5">
        <div>
          <Link
            className="btn text-white bg-primary hover:bg-primary-dark shadow-sm"
            href="#main-content"
          >
            Únete a un partido
          </Link>
        </div>
        {/* <div className="sm:flex sm:items-center sm:justify-center space-y-2 sm:space-y-0 sm:space-x-3">
          <div className="inline-flex -space-x-3 -ml-0.5"></div>
          <div className="text-sm text-gray-500 font-medium">
            Únete a <span className="text-indigo-500">100K+</span> Mujeres
          </div>
        </div> */}
      </div>
    </div>
  );
}
