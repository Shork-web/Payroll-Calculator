import { useFormContext, type FieldPath, type RegisterOptions } from "react-hook-form"
import { TextField, type TextFieldProps } from "@mui/material"
import type { PayrollFormInput } from "@/features/payroll/lib/schema"
import { mergeFieldSlotProps } from "./fieldStyles"

type FormTextFieldProps = Omit<TextFieldProps, "name"> & {
  name: FieldPath<PayrollFormInput>
  registerOptions?: RegisterOptions<PayrollFormInput, FieldPath<PayrollFormInput>>
}

function getNestedError(errors: object, path: string): string | undefined {
  const parts = path.split(".")
  let current: unknown = errors
  for (const part of parts) {
    if (!current || typeof current !== "object" || !(part in current)) return undefined
    current = (current as Record<string, unknown>)[part]
  }
  if (current && typeof current === "object" && "message" in current) {
    const msg = (current as { message?: unknown }).message
    return typeof msg === "string" ? msg : undefined
  }
  return undefined
}

/** TextField wired to react-hook-form with correct floating-label shrink when pre-filled. */
export function FormTextField({ name, registerOptions, slotProps, error, helperText, ...props }: FormTextFieldProps) {
  const { register, watch, formState: { errors } } = useFormContext<PayrollFormInput>()

  const value = watch(name)
  const hasValue = value !== undefined && value !== null && String(value).trim().length > 0
  const message = getNestedError(errors, name)

  const { ref, ...reg } = register(name, registerOptions)

  const inputLabelSlot =
    typeof slotProps?.inputLabel === "object" && slotProps.inputLabel !== null
      ? slotProps.inputLabel
      : {}

  return (
    <TextField
      size="small"
      fullWidth
      {...reg}
      {...props}
      inputRef={ref}
      error={error ?? Boolean(message)}
      helperText={helperText ?? message}
      slotProps={mergeFieldSlotProps({
        ...slotProps,
        inputLabel: {
          ...inputLabelSlot,
          ...(hasValue ? { shrink: true } : {}),
        },
      })}
    />
  )
}
