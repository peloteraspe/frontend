import { fetchPlayersPosition } from "@/app/profile/fetchData";
import { OptionSelect } from "@/components/SelectComponent";

export interface StateOption {
  key: number;
  value: string;
  label: string;
}

export const options: StateOption[] = [
  { key: 1, value: "AL", label: "Alabama" },
  { key: 2, value: "AK", label: "Alaska" },
  { key: 3, value: "AS", label: "American Samoa" },
  { key: 4, value: "AZ", label: "Arizona" },
  { key: 5, value: "AR", label: "Arkansas" },
  { key: 6, value: "CA", label: "California" },
  { key: 7, value: "CO", label: "Colorado" },
  { key: 8, value: "CT", label: "Connecticut" },
  { key: 9, value: "DE", label: "Delaware" },
  { key: 10, value: "DC", label: "District Of Columbia" },
  { key: 11, value: "FM", label: "Federated States Of Micronesia" },
  { key: 12, value: "FL", label: "Florida" },
  { key: 13, value: "GA", label: "Georgia" },
  { key: 14, value: "GU", label: "Guam" },
  { key: 15, value: "HI", label: "Hawaii" },
  { key: 16, value: "ID", label: "Idaho" },
  { key: 17, value: "IL", label: "Illinois" },
  { key: 18, value: "IN", label: "Indiana" },
  { key: 19, value: "IA", label: "Iowa" },
  { key: 20, value: "KS", label: "Kansas" },
  { key: 21, value: "KY", label: "Kentucky" },
  { key: 22, value: "LA", label: "Louisiana" },
  { key: 23, value: "ME", label: "Maine" },
  { key: 24, value: "MH", label: "Marshall Islands" },
  { key: 25, value: "MD", label: "Maryland" },
  { key: 26, value: "MA", label: "Massachusetts" },
  { key: 27, value: "MI", label: "Michigan" },
  { key: 28, value: "MN", label: "Minnesota" },
  { key: 29, value: "MS", label: "Mississippi" },
  { key: 30, value: "MO", label: "Missouri" },
  { key: 31, value: "MT", label: "Montana" },
  { key: 32, value: "NE", label: "Nebraska" },
  { key: 33, value: "NV", label: "Nevada" },
  { key: 34, value: "NH", label: "New Hampshire" },
  { key: 35, value: "NJ", label: "New Jersey" },
  { key: 36, value: "NM", label: "New Mexico" },
  { key: 37, value: "NY", label: "New York" },
  { key: 38, value: "NC", label: "North Carolina" },
  { key: 39, value: "ND", label: "North Dakota" },
  { key: 40, value: "MP", label: "Northern Mariana Islands" },
  { key: 41, value: "OH", label: "Ohio" },
  { key: 42, value: "OK", label: "Oklahoma" },
  { key: 43, value: "OR", label: "Oregon" },
  { key: 44, value: "PW", label: "Palau" },
  { key: 45, value: "PA", label: "Pennsylvania" },
  { key: 46, value: "PR", label: "Puerto Rico" },
  { key: 47, value: "RI", label: "Rhode Island" },
  { key: 48, value: "SC", label: "South Carolina" },
  { key: 49, value: "SD", label: "South Dakota" },
  { key: 50, value: "TN", label: "Tennessee" },
  { key: 51, value: "TX", label: "Texas" },
  { key: 52, value: "UT", label: "Utah" },
  { key: 53, value: "VT", label: "Vermont" },
  { key: 54, value: "VI", label: "Virgin Islands" },
  { key: 55, value: "VA", label: "Virginia" },
  { key: 56, value: "WA", label: "Washington" },
  { key: 57, value: "WV", label: "West Virginia" },
  { key: 58, value: "WI", label: "Wisconsin" },
  { key: 59, value: "WY", label: "Wyoming" },
];
export const playerPositionsFormatted = (options: OptionSelect[]) => {
  const res: number[] = options
    .filter((value: OptionSelect) => typeof value.key === "number")
    .map((value: OptionSelect) => value.key);
  return res;
};

export const levelFormatted = (options: OptionSelect) => {
  return options.key;
};
