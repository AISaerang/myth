"use client";

import { useId, useState } from "react";

interface PasswordFieldProps {
  id?: string;
  name: string;
  label: string;
  autoComplete?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  helper?: string;
  disabled?: boolean;
  placeholder?: string;
  defaultValue?: string;
}

// Show/hide control for every password input. The button is type="button"
// so it never submits the surrounding form, and the hit target stays 44px
// for mobile.
export function PasswordField({
  id,
  name,
  label,
  autoComplete,
  required,
  minLength,
  maxLength,
  helper,
  disabled,
  placeholder,
  defaultValue,
}: PasswordFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const helperId = helper ? `${inputId}-bantuan` : undefined;
  const [visible, setVisible] = useState(false);

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className="text-sm font-medium">
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          required={required}
          minLength={minLength}
          maxLength={maxLength}
          disabled={disabled}
          placeholder={placeholder}
          defaultValue={defaultValue}
          aria-describedby={helperId}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          className="h-11 w-full rounded-lg border border-zinc-300 bg-white py-2 pr-12 pl-3 text-base disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 [&::-ms-clear]:hidden [&::-ms-reveal]:hidden"
        />
        <button
          type="button"
          aria-label={visible ? "Sembunyikan password" : "Tampilkan password"}
          aria-pressed={visible}
          aria-controls={inputId}
          disabled={disabled}
          onClick={() => setVisible((current) => !current)}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-zinc-600 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:cursor-not-allowed disabled:opacity-50 dark:text-zinc-300 dark:hover:text-white dark:focus-visible:outline-zinc-100"
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
      {helper ? (
        <p id={helperId} className="text-xs text-zinc-500 dark:text-zinc-400">
          {helper}
        </p>
      ) : null}
    </div>
  );
}

function EyeIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" />
      <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" />
      <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" />
      <path d="m2 2 20 20" />
    </svg>
  );
}
