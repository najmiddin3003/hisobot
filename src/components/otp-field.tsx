"use client";

import { REGEXP_ONLY_DIGITS } from "input-otp";
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from "@/components/ui/input-otp";

/** Google Authenticator'dagi 6 xonali kod; to'lganda onComplete chaqiriladi */
export function OtpField({
  value,
  onChange,
  onComplete,
  disabled,
  invalid,
}: {
  value: string;
  onChange: (value: string) => void;
  onComplete?: () => void;
  disabled?: boolean;
  invalid?: boolean;
}) {
  return (
    <InputOTP
      name="code"
      maxLength={6}
      pattern={REGEXP_ONLY_DIGITS}
      inputMode="numeric"
      autoComplete="one-time-code"
      autoFocus
      value={value}
      onChange={onChange}
      onComplete={onComplete}
      disabled={disabled}
      containerClassName="justify-center"
      aria-label="6 xonali kod"
    >
      {[0, 3].map((start, group) => (
        <div key={start} className="contents">
          {group > 0 && <InputOTPSeparator />}
          <InputOTPGroup>
            {[0, 1, 2].map((i) => (
              <InputOTPSlot
                key={i}
                index={start + i}
                aria-invalid={invalid || undefined}
                className="size-11 text-lg font-semibold"
              />
            ))}
          </InputOTPGroup>
        </div>
      ))}
    </InputOTP>
  );
}
