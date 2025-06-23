import { type TextareaHTMLAttributes, forwardRef } from "react";

interface TypingAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  text: string;
  input: string;
  disabled?: boolean;
  onInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}

const TypingArea = forwardRef<HTMLTextAreaElement, TypingAreaProps>(
  ({ text, input, disabled = false, onInputChange, onKeyDown, className = "", ...props }, ref) => {
    return (
      <div className="w-full">
        <div className="rounded-lg bg-gray-50 p-4 text-lg mb-6 min-h-[70px]">
          <span className="font-mono">
            {text.split("").map((char, i) => (
              <span
                key={i}
                className={
                  i < input.length
                    ? input[i] === char
                      ? "text-blue-600"
                      : "text-red-500"
                    : "text-gray-700"
                }
              >
                {char}
              </span>
            ))}
          </span>
        </div>

        <textarea
          ref={ref}
          value={input}
          onChange={onInputChange}
          onKeyDown={onKeyDown}
          disabled={disabled}
          className={`
            w-full rounded border p-4 mb-6 min-h-[80px] resize-none 
            focus:outline-none focus:ring-2 focus:ring-blue-200
            disabled:bg-gray-100 disabled:cursor-not-allowed
            ${className}
          `.trim()}
          placeholder="Start typing here..."
          {...props}
        />
      </div>
    );
  }
);

TypingArea.displayName = "TypingArea";

export { TypingArea }; 