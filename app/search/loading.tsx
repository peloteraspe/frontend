
export default function Loading() {
  return (
    <div className="flex-1 w-full flex flex-col gap-20 items-center">
        <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16">
            <div className="w-full max-w-5xl flex justify-between items-center p-3 text-sm">
            {/* <Image
                src="/logo.png"
                width={32}
                height={32}
                alt="Peloteras logo"
            /> */}
            {/* <AuthButton
                username={user.user_metadata?.username}
                isLogged={true}
            /> */}
            </div>
        </nav>
    
        <section>
            <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="py-8">
                <div className="md:flex md:justify-between" data-sticky-container>
                {/* Main content */}
                <div className="md:grow">
                    <div className="max-w-6xl mx-auto px-4 sm:px-6">
                    <div
                        className="md:flex md:justify-between"
                        data-sticky-container
                    >
                        <div className="md:grow">
                        <div className="max-w-3xl mx-auto">
                            <div className="text-center">
                            <h1 className="text-4xl font-bold">
                                ¡Bienvenida a Peloteras!
                            </h1>
                            <p className="mt-4 text-md">
                                Para poder continuar, necesitamos que completes tu
                                perfil.
                            </p>
                            </div>
                            {/* <UpdateProfile email={user.email} /> */}
                        </div>
                        </div>
                    </div>
                    </div>
                </div>
                </div>
            </div>
    
            {/* <div className="flex flex-col gap-8">
                <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold">Pichangas</h1>
                <p className="text-lg">Encuentra pichangas cerca de ti</p>
                </div>
                <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold">Partidos</h1>
                <p className="text-lg">Encuentra partidos cerca de ti</p>
                </div>
            </div> */}
            </div>
        </section>
    </div>
  );
}
