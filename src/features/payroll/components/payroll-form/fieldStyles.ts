import type { TextFieldProps } from "@mui/material"

const inputSx = {
  fontSize: "0.8125rem",
  "& input": {
    py: 1,
    px: 1.25,
    textOverflow: "ellipsis",
  },
  "& .MuiSelect-select": {
    py: 1,
    pl: 1.25,
    pr: "2rem !important",
    textOverflow: "ellipsis",
    overflow: "hidden",
    whiteSpace: "nowrap",
    display: "block",
  },
} as const

const labelSx = {
  fontSize: "0.8125rem",
  maxWidth: "calc(100% - 1.5rem)",
} as const

/** Consistent padding and ellipsis for compact payroll inputs. */
export const payrollFieldSlotProps = {
  input: { sx: inputSx },
  inputLabel: { sx: labelSx },
} satisfies TextFieldProps["slotProps"]

export function mergeFieldSlotProps(
  slotProps?: TextFieldProps["slotProps"],
): TextFieldProps["slotProps"] {
  return {
    ...payrollFieldSlotProps,
    ...slotProps,
    input: {
      ...(payrollFieldSlotProps?.input as object),
      ...(typeof slotProps?.input === "object" ? slotProps.input : {}),
      sx: inputSx,
    },
    inputLabel: {
      ...(payrollFieldSlotProps?.inputLabel as object),
      ...(typeof slotProps?.inputLabel === "object" ? slotProps.inputLabel : {}),
      sx: labelSx,
    },
  }
}
