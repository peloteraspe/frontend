"use client";

import React, { useEffect, useState } from "react";
import SelectComponent, { OptionSelect } from "@/components/SelectComponent";

import { createClient } from "@/utils/supabase/client";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { ParagraphM, Title2XL } from "@/components/atoms/Typography";
import Input from "@/components/Input";
import { ButtonWrapper } from "@/components/Button";
import { ProfileRequestBody } from "@/utils/interfaces";
import { createProfile } from "../_actions/profile";
import { levelFormatted, playerPositionsFormatted } from "@/utils/data";

const UpdateProfile = ({ user }: any) => {
  const supabase = createClient();
  const router = useRouter();
  const [selectedMultiOptions, setSelectedMultiOptions] = useState<
    OptionSelect[]
  >([]);

  const [buttonText, setButtonText] = useState("Crear cuenta");

  const [loading, setLoading] = useState(false);
  const [posiciones, setPosiciones] = useState<OptionSelect[]>([]);
  const [levelOption, setLevelOption] = useState<OptionSelect[]>([]);
  const [selectedLevelOptions, setSelectedLevelOptions] =
    useState<OptionSelect>();

  const [usernameRes, setUsername] = useState("");

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    const reqProfile: ProfileRequestBody = {
      user: user.id,
      username: usernameRes,
      level_id: selectedLevelOptions
        ? levelFormatted(selectedLevelOptions)
        : -1,
      player_position: playerPositionsFormatted(selectedMultiOptions),
    };
    console.log(reqProfile);

    // await createProfile(formData);
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUsername(e.target.value);
    console.log(e.target.value);
  };

  useEffect(() => {
    // obtengo las posiciones y se las agrego a mi estado local para poder pasarselo al select multiple.
    const fetchPosiciones = async () => {
      try {
        const { data, error } = await supabase
          .from("player_position")
          .select("id, name");

        if (error) {
          console.error("Error fetching positions:", error);
        } else {
          const positionOptions = data.map((position: any) => ({
            key: position.id,
            value: position.id,
            label: position.name,
          }));
          setPosiciones(positionOptions);
        }
      } catch (error) {
        console.error("Error fetching positions:", error);
      }
    };
    const fetchLevels = async () => {
      try {
        const { data, error } = await supabase.from("level").select("id, name");

        if (error) {
          console.error("Error fetching levels:", error);
        } else {
          const lvlOptions = data.map((level: any) => ({
            key: level.id,
            value: level.id,
            label: level.name,
          }));
          setLevelOption(lvlOptions);
        }
      } catch (error) {
        console.error("Error fetching levels:", error);
      }
    };
    fetchPosiciones();
    fetchLevels();
  }, []);

  return (
    <div className="flex flex-col justify-center items-center w-full gap-8 h-[calc(100vh-6rem)]">
      <div className="flex flex-col items-center">
        <Title2XL>Bienvenida a</Title2XL>
        <Title2XL color="text-mulberry">Peloteras</Title2XL>
      </div>
      <div className="flex flex-col items-center">
        <form className="flex flex-col gap-4 w-full" onSubmit={handleSubmit}>
          <Input
            className="form-input w-full ring-secondary focus:ring-secondary-dark"
            labelText="Crea un nombre"
            type="text"
            name="username"
            placeholderText="ejm: pelotera123"
            value={usernameRes}
            onChange={handleUsernameChange}
            // onErrorChange={handleEmailErrorChange}
            errorText="Debes ingresar un nombre "
            // error={emailError}
            // onChange={handleEmailChange}
            required
          />
          <label className="w-full">
            <div className="mb-1">
              <ParagraphM fontWeight="semibold">
                ¿En qué posición prefieres jugar?
                <span className="text-red-500"> *</span>
              </ParagraphM>
            </div>

            <SelectComponent
              options={posiciones}
              onChange={(value: any) => setSelectedMultiOptions(value)}
              isMulti={true}
              value={selectedMultiOptions}
            />
          </label>

          <label className="w-full">
            <div className="mb-1">
              <ParagraphM fontWeight="semibold">
                Nivel de juego
                <span className="text-red-500"> *</span>
              </ParagraphM>
            </div>

            <SelectComponent
              options={levelOption}
              onChange={(value: any) => setSelectedLevelOptions(value)}
              value={selectedLevelOptions}
            />
          </label>
          <div className="flex flex-col items-center w-80">
            <ButtonWrapper width={"full"}>{buttonText}</ButtonWrapper>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UpdateProfile;
