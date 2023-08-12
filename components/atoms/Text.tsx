import { FC, ReactNode } from "react";
import { Sizes } from "@/utils/constants/constants";

interface Props {
  children: ReactNode;
  color?: string;
  weight?: string;
  variant: Sizes | string;
  readonly?: boolean;
  underline?: boolean;
}

const COLORS_MAP: Record<string, string> = {
  black: "text-black",
  white: "text-white",
  red: "text-red",
  green: "text-green",
  alternative: "text-alternative",
  primary: "text-primary",
  secondary: "text-secondary",
  lightGray: "text-lightGray",
};

const getVariantClass = (variant: string) => {
  const base = {
    [Sizes.XS]: "text-xs",
    [Sizes.S]: "text-sm",
    [Sizes.SM]: "text-base",
    [Sizes.M]: "text-lg",
    [Sizes.XL]: "text-xl",
    [Sizes.XL2]: "text-2xl",
    [Sizes.XL3]: "text-3xl",
    [Sizes.XL4]: "text-4xl",
    [Sizes.XL5]: "sm:text-5xl text-2xl",
  };

  return base[variant] || "text-base";
};

const buildClass = (
  variant: string,
  color: string = "black",
  weight: string = "normal"
): string => {
  let classes = [getVariantClass(variant)];

  if (variant === "md" || variant === "sm") {
    classes.push(COLORS_MAP[color] || "text-black", `font-${weight || "bold"}`);
  } else {
    classes.push(COLORS_MAP[color] || "", weight ? `font-${weight}` : "");
  }

  return classes.join(" ").trim();
};

export const Text: FC<Props> = ({
  children,
  color,
  weight,
  variant,
  readonly,
  underline,
}) => {
  const underlineClass = underline ? "underline cursor-pointer font-bold" : "";

  switch (variant) {
    case Sizes.XXS:
      return (
        <p className={`font-medium text-[9px] ${COLORS_MAP[color] || ""}`}>
          {children}
        </p>
      );

    case Sizes.XS:
      const readonlyClass = readonly
        ? `text-[9px] ${COLORS_MAP[color] || "text-white"} font-semibold`
        : `text-xs mb-2.5 ${COLORS_MAP[color] || ""} font-medium`;
      return <p className={`${readonlyClass} ${underlineClass}`}>{children}</p>;

    case Sizes.SM:
      return (
        <h2
          className={`${buildClass(variant, color, weight)} ${underlineClass}`}
        >
          {children}
        </h2>
      );

    case Sizes.M:
      return (
        <h1
          className={`${buildClass(variant, color, weight)} ${underlineClass}`}
        >
          {children}
        </h1>
      );

    default:
      return (
        <p
          className={`${buildClass(variant, color, weight)} ${underlineClass}`}
        >
          {children}
        </p>
      );
  }
};
