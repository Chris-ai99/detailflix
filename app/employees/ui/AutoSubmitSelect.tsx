"use client";

import type { ReactNode, SelectHTMLAttributes } from "react";

type AutoSubmitSelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  children: ReactNode;
};

export default function AutoSubmitSelect({ children, ...props }: AutoSubmitSelectProps) {
  const { onChange, ...restProps } = props;
  return (
    <select
      {...restProps}
      onChange={(event) => {
        onChange?.(event);
        event.currentTarget.form?.requestSubmit();
      }}
    >
      {children}
    </select>
  );
}
