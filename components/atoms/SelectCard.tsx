import { infoCircle } from "@/utils/constants/icons";
import { Icon } from "./Icon";
import { Text } from "./Text";
const SelectCard = ({
  options,
  name,
  register,
  onChange,
  value,
  labelText,
}: {
  options: any;
  name: string;
  register: any;
  onChange: any;
  value: any[];
  labelText: string;
}) => {
  const handleChange = (optionValue: string) => {
    const newValue = value?.includes(optionValue)
      ? value.filter((v) => v !== optionValue)
      : [...value, optionValue];
    onChange(newValue);
  };

  return (
    <div className="">
      {labelText && (
        <div className="mb-1 flex">
          <Text variant="sm" color="white">
            {labelText}
          </Text>
        </div>
      )}
      <div className="flex flex-wrap justify-between gap-6">
        {options.map((option: any, index: any) => {
          return (
            <label
              key={index}
              className={`w-[calc(50%-1rem)] flex flex-col items-center justify-center rounded-xl p-4 cursor-pointer border border-green ${
                value?.includes(option.value)
                  ? "shadow-[0_0_20px_#4CDB86]"
                  : "shadow-none"
              }`}
            >
              <input
                type="checkbox"
                className="hidden"
                {...register(name)}
                checked={value?.includes(option.value)}
                value={option.value}
                onChange={() => handleChange(option.value)}
              />
              <div className="flex justify-end w-full">
                <Icon
                  paths={infoCircle}
                  stroke={`${
                    value?.includes(option.value) ? "green" : "white"
                  }`}
                  width={21}
                  height={21}
                  viewBox="0 0 21 21"
                ></Icon>
              </div>

              <img
                className="mt-3 w-16 h-16"
                src={`/assets/positionOptions/${option.value}.png`}
                alt={option.title}
              />

              <Text
                variant="sm"
                color={value?.includes(option.value) ? "green" : "white"}
              >
                {option.title}
              </Text>
            </label>
          );
        })}
      </div>
    </div>
  );
};

export default SelectCard;
