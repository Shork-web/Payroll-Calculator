"use client"

import { Box, Container, Tab, Tabs, useTheme } from "@mui/material"
import type { AppTab } from "@/shared/types/app"

interface AppTabsProps {
  activeTab: AppTab
  onTabChange: (tab: AppTab) => void
}

export function AppTabs({ activeTab, onTabChange }: AppTabsProps) {
  const theme = useTheme()
  const mode = theme.palette.mode

  return (
    <Box
      sx={{
        borderBottom: 1,
        borderColor: "divider",
        bgcolor: mode === "dark" ? "rgba(30,41,59,0.3)" : "rgba(255,255,255,0.5)",
      }}
    >
      <Container maxWidth="xl">
        <Tabs
          value={activeTab}
          onChange={(_e, value: AppTab) => onTabChange(value)}
          sx={{
            "& .MuiTabs-indicator": {
              backgroundColor: mode === "dark" ? "#34d399" : "#059669",
            },
            "& .MuiTab-root": {
              fontWeight: 700,
              fontSize: "0.85rem",
              textTransform: "none",
              minHeight: 48,
              color: "text.secondary",
              "&.Mui-selected": {
                color: mode === "dark" ? "#34d399" : "#059669",
              },
            },
          }}
        >
          <Tab value="calculator" label="Payroll Calculator" />
          <Tab value="records" label="Employee Records & Payslips" />
          <Tab value="dtr" label="DTR Creator (Form 48)" />
        </Tabs>
      </Container>
    </Box>
  )
}
