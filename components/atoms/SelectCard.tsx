import { infoCircle } from '@/utils/constants/icons';
import { Icon } from './Icon';
import { Text } from './Text';
const SelectCard = ({
  options,
  name,
  register,
  onChange,
  value,
}: {
  options: any;
  name: string;
  register: any;
  onChange: any;
  value: any[];
}) => {
  const handleChange = (optionValue: string) => {
    const newValue = value?.includes(optionValue)
      ? value.filter((v) => v !== optionValue)
      : [...value, optionValue];
    onChange(newValue);
  };

  return (
    <div className="flex flex-wrap justify-between gap-6">
      {options.map((option: any, index: any) => {
        return (
          <label
            key={index}
            className={`w-[calc(50%-1rem)] flex flex-col items-center justify-center rounded-xl p-4 cursor-pointer border border-green ${
              value?.includes(option.value)
                ? 'shadow-[0_0_20px_#4CDB86]'
                : 'shadow-none'
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
            <Icon
              paths={infoCircle}
              fill="#4CDB86"
              width={21}
              height={21}
              viewBox="0 0 21 21"
            ></Icon>
            <img
              className="mt-3 w-16 h-16"
              src={`/assets/positionOptions/${option.value}.png`}
              alt={option.title}
            />

            <Text color={value?.includes(option.value) ? 'white' : 'black'}>
              {option.title}
            </Text>
          </label>
        );
      })}
    </div>
  );
};

export default SelectCard;