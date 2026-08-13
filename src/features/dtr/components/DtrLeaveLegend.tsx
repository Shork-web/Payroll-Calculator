"use client"

import { useMemo, useState } from "react"
import {
  Box,
  Card,
  CardContent,
  Chip,
  Grid,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Typography,
  useTheme,
} from "@mui/material"
import { Book as BookIcon, Search as SearchIcon } from "@mui/icons-material"
import { LEAVE_LEGEND_ITEMS, type LeaveLegendItem } from "../lib/dtrConstants"

type LeaveCategory = LeaveLegendItem["category"] | "all"

export function DtrLeaveLegend() {
  const theme = useTheme()
  const mode = theme.palette.mode
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<LeaveCategory>("all")

  const filteredLeaveItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return LEAVE_LEGEND_ITEMS.filter((item) => {
      const matchesCategory = selectedCategory === "all" || item.category === selectedCategory
      if (!matchesCategory) return false
      if (!query) return true
      return (
        item.code.toLowerCase().includes(query) ||
        item.name.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query)
      )
    })
  }, [searchQuery, selectedCategory])

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        borderRadius: 2.5,
        border: 1,
        borderColor: "divider",
        bgcolor: mode === "dark" ? "rgba(30,41,59,0.2)" : "background.paper",
        mt: 1,
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3, flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800, display: "flex", alignItems: "center", gap: 1 }}>
            <BookIcon color="primary" /> Leave Benefits & Privileges Legend
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Reference guide for Civil Service Commission (CSC) leave rules and Contract of Service (COS) privileges
          </Typography>
        </Box>
        <TextField
          size="small"
          placeholder="Search leaves..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
            },
          }}
          sx={{ width: { xs: "100%", sm: 260 } }}
        />
      </Box>

      <Stack direction="row" spacing={1} sx={{ mb: 3, flexWrap: "wrap", gap: 1 }}>
        {(
          [
            ["all", "All Leaves"],
            ["regular", "Permanent (VL/SL/SLP)"],
            ["family", "Family & Maternity"],
            ["special", "Special Benefits"],
            ["cos", "Contract of Service (C.O.S)"],
          ] as const
        ).map(([value, label]) => (
          <Chip
            key={value}
            label={label}
            onClick={() => setSelectedCategory(value)}
            color={selectedCategory === value ? "primary" : "default"}
            variant={selectedCategory === value ? "filled" : "outlined"}
            sx={{ fontWeight: 600 }}
          />
        ))}
      </Stack>

      <Grid container spacing={2}>
        {filteredLeaveItems.map((item) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={item.code}>
            <Card
              elevation={0}
              sx={{
                height: "100%",
                border: 1,
                borderColor: "divider",
                borderRadius: 2,
                transition: "all 0.2s ease-in-out",
                "&:hover": {
                  borderColor: "primary.main",
                  boxShadow: mode === "dark" ? "0 4px 20px rgba(99,102,241,0.1)" : "0 4px 20px rgba(99,102,241,0.05)",
                  transform: "translateY(-2px)",
                },
              }}
            >
              <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 1, mb: 1.5 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "text.primary", lineHeight: 1.3 }}>
                    {item.name}
                  </Typography>
                  <Chip
                    label={item.code}
                    size="small"
                    color={
                      item.category === "regular"
                        ? "primary"
                        : item.category === "family"
                          ? "success"
                          : item.category === "cos"
                            ? "warning"
                            : "secondary"
                    }
                    sx={{ fontWeight: 700, fontSize: "0.68rem", height: 20, borderRadius: 1 }}
                  />
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.82rem", lineHeight: 1.5 }}>
                  {item.description}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
        {filteredLeaveItems.length === 0 && (
          <Grid size={{ xs: 12 }}>
            <Box sx={{ py: 4, textAlign: "center", color: "text.secondary" }}>
              No leaves match your search criteria.
            </Box>
          </Grid>
        )}
      </Grid>
    </Paper>
  )
}
