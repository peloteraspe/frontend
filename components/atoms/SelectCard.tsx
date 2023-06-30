import { infoCircle } from '@/utils/constants/icons';
import { Icon } from './Icon';
import { Text } from './Text';

{
  /* <Controller
key={index}
control={control}
name={input.id}
render={({ field: { onChange, value } }) => (
  <SelectCard
    options={input.options}
    name={input.id}
    register={register}
    onChange={onChange}
    value={value}
  />
)}
/> */
}

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
  value: any;
}) => {
  return (
    <div className="flex flex-wrap justify-between gap-6">
      {options.map((option: any, index: any) => {
        return (
          <label
            key={index}
            className={`w-[calc(50%-1rem)] flex flex-col items-center justify-center rounded-xl p-4 cursor-pointer ${
              value === option.value
                ? 'bg-primary text-white'
                : 'bg-white text-black'
            }`}
          >
            <input
              type="radio"
              className="hidden"
              {...register(name)}
              onChange={onChange}
              value={option.value}
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

            <Text color={value === option.value ? 'white' : 'black'}>
              {option.title}
            </Text>
          </label>
        );
      })}
    </div>
  );
};

export default SelectCard;
