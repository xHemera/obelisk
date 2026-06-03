import { InputHTMLAttributes, forwardRef } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement>;

const joinClasses = (...values: Array<string | undefined | false>) => values.filter(Boolean).join(" ");

// Atom: champ texte standard pour garantir le meme style de focus et de contraste.
const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={joinClasses(
        "w-full rounded-xl border border-[#3c3650] bg-[#242033] py-2.5 px-3 text-gray-200 placeholder-gray-400 transition focus:border-[var(--accent-color)] focus:outline-none sm:py-3 sm:px-4",
        className,
      )}
      {...props}
    />
  );
});

export default Input;
