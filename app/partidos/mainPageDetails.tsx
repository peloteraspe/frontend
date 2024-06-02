"use client";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import React, { useEffect, useState } from "react";
import Map from "@/components/Map";
import Collapse from "@/components/Collapse";
import { ButtonWrapper } from "@/components/Button";
import arrowAnotarse from "@/app/assets/arrow-anotarse.svg";
import Calendar from "@/app/assets/images/calendar.png";
import { getEventById } from "@/app/_actions/event";

interface MainPageDetailsProps {
  id: string;
}

const MainPageDetails: React.FC<MainPageDetailsProps> = ({ id }) => {
  // Add your component logic here
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchEventData() {
      try {
        const data = await getEventById(id);
        console.log(data, "data");
        if (data) {
          setPost(data);
          setLoading(false);
        } else {
          notFound();
        }
      } catch (err) {
        console.error("Failed to fetch event:", err);
        setError(err.message || "An error occurred");
        setLoading(false);
      }
    }

    fetchEventData();
  }, [id]);
  if (loading) return <div>Cargando...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!post) return <div>No se encuentra el evento</div>;
  return (
    // JSX code for your component's UI goes here
    <div className="md:flex md:justify-between" data-sticky-container>
      {/* Sidebar */}
      <div className="mb-4 sm:hidden">
        <Link className="text-[#54086F] font-medium" href="/">
          <span className="tracking-normal flex gap-2 items-center text-sm text-gray-600 hover:text-[#54086F] transition duration-150 ease-in-out">
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
                d="M19.5 12h-15m0 0l6.75 6.75M4.5 12l6.75-6.75"
              />
            </svg>
            Todos los partidos
          </span>{" "}
        </Link>
      </div>{" "}
      <h1 className="text-4xl font-extrabold font-inter mb-10 sm:hidden">
        {post.event.title}
      </h1>
      <aside className="mb-8 md:mb-0 md:w-64 lg:w-72 md:ml-12 lg:ml-20 md:shrink-0 md:order-1">
        <div
          data-sticky
          data-margin-top="32"
          data-sticky-for="768"
          data-sticky-wrap
        >
          <div className="relative bg-gray-50 rounded-xl border border-gray-200 p-5">
            <div className="text-center mb-6">
              {/* <Image
  className="inline-flex mb-2"
  src={post.image}
  width={72}
  height={72}
  alt={post.title}
  /> */}
              <div className="text-[#54086F] font-bold mb-4">
                {" "}
                por {post.event.created_by}
              </div>
            </div>

            <div className="flex justify-center md:justify-start mb-5">
              <ul className="inline-flex flex-col space-y-2">
                <li className="flex items-center">
                  <Image
                    className="mr-3"
                    src={Calendar}
                    alt="calendar"
                    width={15}
                  />
                  <span className="text-sm text-[#54086F]">
                    {new Date(post.event.start_time).toLocaleString("es-PE", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true,
                    })}
                  </span>
                </li>
                <li className="flex items-center">
                  <svg
                    className="shrink-0 fill-[#54086F] mr-3"
                    width="14"
                    height="16"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <circle cx="7" cy="7" r="2" />
                    <path d="M6.3 15.7c-.1-.1-4.2-3.7-4.2-3.8C.7 10.7 0 8.9 0 7c0-3.9 3.1-7 7-7s7 3.1 7 7c0 1.9-.7 3.7-2.1 5-.1.1-4.1 3.7-4.2 3.8-.4.3-1 .3-1.4-.1Zm-2.7-5 3.4 3 3.4-3c1-1 1.6-2.2 1.6-3.6 0-2.8-2.2-5-5-5S2 4.2 2 7c0 1.4.6 2.7 1.6 3.7 0-.1 0-.1 0 0Z" />
                  </svg>
                  <span className="text-sm text-[#54086F]">
                    {post.event.location_text}
                  </span>
                </li>
                <li className="flex items-center">
                  <svg
                    className="shrink-0 fill-[#54086F] mr-3"
                    width="16"
                    height="12"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M15 0H1C.4 0 0 .4 0 1v10c0 .6.4 1 1 1h14c.6 0 1-.4 1-1V1c0-.6-.4-1-1-1Zm-1 10H2V2h12v8Z" />
                    <circle cx="8" cy="6" r="2" />
                  </svg>
                  <span className="text-sm text-[#54086F]">
                    S/ {post.event.price}
                  </span>
                </li>
              </ul>
            </div>

            <ButtonWrapper
              navigateTo={`/pago/${post.event.id}`}
              icon={
                <Image src={arrowAnotarse} alt="arrow" width={24} height={24} />
              }
              children={"Anotarme"}
            />
          </div>

          <Collapse
            title="Participantes"
            content={post.assistants.map((assistant: any) => {
              return (
                <>
                  <ol style={{ listStyleType: "decimal" }}>
                    <li>{assistant.username}</li>
                  </ol>
                </>
              );
            })}
          />
        </div>
      </aside>
      {/* Main content */}
      <div className="md:grow">
        {/* Job description */}
        <div className="pb-8">
          <div className="mb-4 hidden sm:block">
            <Link className="text-[#54086F] font-medium" href="/">
              <span className="tracking-normal flex gap-2 items-center text-sm text-gray-600 hover:text-[#54086F] transition duration-150 ease-in-out">
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
                    d="M19.5 12h-15m0 0l6.75 6.75M4.5 12l6.75-6.75"
                  />
                </svg>
                Todos los partidos
              </span>{" "}
            </Link>
          </div>
          <h1 className="text-4xl font-extrabold font-inter mb-10  hidden sm:block">
            {post.event.description.title}
          </h1>
          {/* Job description */}
          <div className="space-y-8 mb-8">
            <Collapse
              title="Descripción"
              content={post.event.description.description}
            />
            <Collapse title="Extras" content={""} />
          </div>
          <div className="mb-8">
            <h3 className="text-xl font-bold text-gray-800 mb-3">Ubicación</h3>
            <Map lat={post.event.location.lat} lng={post.event.location.long} />
          </div>
          {/* Social share */}
          <div className="flex items-center justify-end space-x-4">
            <div className="text-xl font-nycd text-gray-400">
              Compartir partido
            </div>
            <ul className="inline-flex space-x-3">
              <li>
                <a
                  className="flex justify-center items-center text-[#54086F] bg-indigo-100 hover:text-white hover:bg-[#54086F] rounded-full transition duration-150 ease-in-out"
                  href="#0"
                  aria-label="Twitter"
                >
                  <svg
                    className="w-8 h-8 fill-current"
                    viewBox="0 0 32 32"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="m13.063 9 3.495 4.475L20.601 9h2.454l-5.359 5.931L24 23h-4.938l-3.866-4.893L10.771 23H8.316l5.735-6.342L8 9h5.063Zm-.74 1.347h-1.457l8.875 11.232h1.36l-8.778-11.232Z" />
                  </svg>
                </a>
              </li>
              <li>
                <a
                  className="flex justify-center items-center text-[#54086F] bg-indigo-100 hover:text-white hover:bg-[#54086F] rounded-full transition duration-150 ease-in-out"
                  href="#0"
                  aria-label="Facebook"
                >
                  <svg
                    className="w-8 h-8 fill-current"
                    viewBox="0 0 32 32"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M14.023 24 14 17h-3v-3h3v-2c0-2.7 1.672-4 4.08-4 1.153 0 2.144.086 2.433.124v2.821h-1.67c-1.31 0-1.563.623-1.563 1.536V14H21l-1 3h-2.72v7h-3.257Z" />
                  </svg>
                </a>
              </li>
              <li>
                <a
                  className="flex justify-center items-center text-[#54086F] bg-indigo-100 hover:text-white hover:bg-[#54086F] rounded-full transition duration-150 ease-in-out"
                  href="#0"
                  aria-label="Telegram"
                >
                  <svg
                    className="w-8 h-8 fill-current"
                    viewBox="0 0 32 32"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M22.968 10.276a.338.338 0 0 0-.232-.253 1.192 1.192 0 0 0-.63.045s-14.019 5.038-14.82 5.596c-.172.121-.23.19-.259.272-.138.4.293.573.293.573l3.613 1.177a.388.388 0 0 0 .183-.011c.822-.519 8.27-5.222 8.7-5.38.068-.02.118 0 .1.049-.172.6-6.606 6.319-6.64 6.354a.138.138 0 0 0-.05.118l-.337 3.528s-.142 1.1.956 0a30.66 30.66 0 0 1 1.9-1.738c1.242.858 2.58 1.806 3.156 2.3a1 1 0 0 0 .732.283.825.825 0 0 0 .7-.622s2.561-10.275 2.646-11.658c.008-.135.021-.217.021-.317a1.177 1.177 0 0 0-.032-.316Z" />
                  </svg>
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div>{/* <Newsletter /> */}</div>
      </div>
    </div>
  );
};

export default MainPageDetails;
