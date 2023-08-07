import React, { forwardRef } from "react";

interface Props
  extends Omit<
    React.DetailedHTMLProps<React.SVGAttributes<SVGSVGElement>, SVGSVGElement>,
    "disabled"
  > {
  fill?: string;
  paths: string[] | { path: string; fill: string }[];
  width?: number;
  height?: number;
  viewBox?: string;
}

export const Icon = forwardRef<SVGSVGElement, Props>(function Icon(props, ref) {
  const { fill, paths, width, height, viewBox, ...rest } = props;

  return (
    <svg
      ref={ref}
      {...rest}
      width={width ?? "24"}
      height={height ?? "24"}
      viewBox={
        viewBox ? viewBox : width ? `0 0 ${width} ${width}` : "0 0 24 24"
      }
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {paths.map((path: string | { path: string; fill: string }, index) => {
        if (typeof path === "object") {
          return <path key={index} d={path.path} fill={path.fill ?? fill} />;
        } else {
          return <path key={index} d={path} fill={fill} />;
        }
      })}
    </svg>
  );
});
