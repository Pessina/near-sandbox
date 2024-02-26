import React from "react";

interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  children: React.ReactNode;
  className?: string;
}

const Link: React.FC<LinkProps> = ({ children, className, ...props }) => {
  return (
    <a
      className={`text-blue-500 hover:text-blue-700 underline ${className}`}
      {...props}
    >
      {children}
    </a>
  );
};

export default Link;
