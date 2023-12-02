import Link from 'next/link';

export default function PostItem({ ...props }) {
  const formatDate = (date: string) => {
    const dateObj = new Date(date);
    const day = dateObj.getDate();
    const month = dateObj.toLocaleString('default', { month: 'short' });
    const year = dateObj.getFullYear();
    const hour = dateObj.getHours();
    const minutes = dateObj.getMinutes();
    return `${day} ${month} ${year} ${hour}:${minutes}`;
  };
  return (
    <div
      className={`[&:nth-child(-n+12)]:-order-1 group ${
        !props.sticky && 'border-b border-gray-200'
      }`}
    >
      <div
        className={`px-4 py-6 ${props.sticky && 'bg-indigo-100 rounded-xl'}`}
      >
        <div className="sm:flex items-center space-y-3 sm:space-y-0 sm:space-x-5">
          <div className="flex-shrink-0 w-8"></div>
          <div className="grow lg:flex items-center justify-between space-y-5 lg:space-x-2 lg:space-y-0">
            <div>
              <div className="flex datas-start space-x-2">
                <div className="text-sm text-gray-800 font-semibold mb-1">
                  {props.created_by}
                </div>
                {props.sticky && (
                  <svg
                    className="w-3 h-3 shrink-0 fill-amber-400"
                    viewBox="0 0 12 12"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M11.143 5.143A4.29 4.29 0 0 1 6.857.857a.857.857 0 0 0-1.714 0A4.29 4.29 0 0 1 .857 5.143a.857.857 0 0 0 0 1.714 4.29 4.29 0 0 1 4.286 4.286.857.857 0 0 0 1.714 0 4.29 4.29 0 0 1 4.286-4.286.857.857 0 0 0 0-1.714Z" />
                  </svg>
                )}
              </div>
              <div className="mb-2">
                <Link
                  className="text-lg text-gray-800 font-bold"
                  href={`/partidos/${props.id}`}
                >
                  {props.title}
                </Link>
              </div>
              <div className="-m-1">
                <a
                  className={`text-xs text-gray-500 font-medium inline-flex px-2 py-0.5 hover:text-gray-600 rounded-md m-1 whitespace-nowrap transition duration-150 ease-in-out ${
                    props.sticky ? 'bg-indigo-50' : 'bg-gray-100'
                  }`}
                  href="#0"
                >
                  {props.start_time && formatDate(props.start_time)} -{' '}
                  {props.end_time && formatDate(props.end_time)}
                </a>
                <a
                  className={`text-xs text-gray-500 font-medium inline-flex px-2 py-0.5 hover:text-gray-600 rounded-md m-1 whitespace-nowrap transition duration-150 ease-in-out ${
                    props.sticky ? 'bg-indigo-50' : 'bg-gray-100'
                  }`}
                  href="#0"
                >
                  {' '}
                  Costo: S/{props.price}
                </a>
              </div>
            </div>
            <div className="min-w-[180px] flex items-center lg:justify-end space-x-3 lg:space-x-0">
              <div className="lg:hidden group-hover:lg:block">
                <Link
                  className="btn-sm py-1.5 px-3 text-white bg-indigo-500 hover:bg-indigo-600 group shadow-sm"
                  href={`/partidos/${props.id}`}
                >
                  Anotarme
                  <span className="tracking-normal text-indigo-200 group-hover:translate-x-0.5 transition-transform duration-150 ease-in-out ml-1">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="1.5"
                      stroke="currentColor"
                      className="w-6 h-6"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75"
                      />
                    </svg>
                  </span>
                </Link>
              </div>
              <div className="group-hover:lg:hidden text-sm italic text-gray-500">
                {props.date}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
