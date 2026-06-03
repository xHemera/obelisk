import { InputHTMLAttributes } from "react";
import Input from "@/components/atoms/Input";

type IconFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  iconClassName: string;
};

// Molecule: compose l'atom Input avec une icone a gauche pour les formulaires auth.
export default function IconField({ iconClassName, className, ...props }: IconFieldProps) {
  return (
    <div className="relative">
      <div className="absolute inset-y-0 left-0 flex items-center pl-4 pr-3 text-gray-400 pointer-events-none">
        <i className={iconClassName} />
      </div>
      <Input className={`!pl-10 ${className ?? ""}`.trim()} {...props} />
    </div>
  );
}
