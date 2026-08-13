"use client"

import { useState } from "react"
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Menu,
  MenuItem,
  Stack,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material"
import {
  CloudDone as CloudSyncIcon,
  CloudOff as CloudOfflineIcon,
  KeyboardArrowDown as ArrowDownIcon,
  Login as LoginIcon,
  Logout as LogoutIcon,
} from "@mui/icons-material"
import type { User } from "firebase/auth"
import { ConfirmDialog } from "@/shared/components/ConfirmDialog"
import { ThemeToggle } from "@/shared/components/ThemeToggle"
import logo from "@/app/philfida-logo.png"

interface AppHeaderProps {
  user: User | null
  authLoading: boolean
  dbLoading: boolean
  isFirebaseConfigured: boolean
  hasUnsavedDraft?: boolean
  onSignIn: () => void
  onLogout: () => void
}

export function AppHeader({
  user,
  authLoading,
  dbLoading,
  isFirebaseConfigured,
  hasUnsavedDraft = false,
  onSignIn,
  onLogout,
}: AppHeaderProps) {
  const theme = useTheme()
  const mode = theme.palette.mode
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false)

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  const handleLogout = () => {
    handleMenuClose()
    setLogoutConfirmOpen(true)
  }

  const handleConfirmLogout = () => {
    setLogoutConfirmOpen(false)
    onLogout()
  }

  return (
    <Box
      component="header"
      sx={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        backgroundColor: mode === "dark" ? "rgba(15, 23, 42, 0.7)" : "rgba(255, 255, 255, 0.8)",
        borderBottom: 1,
        borderColor: mode === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(255, 255, 255, 0.5)",
        boxShadow: mode === "dark" ? "0 4px 20px rgba(0,0,0,0.2)" : "0 4px 20px rgba(0,0,0,0.03)",
      }}
    >
      <Container maxWidth="xl">
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            py: 1,
            gap: 2,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Box
              component="img"
              src={logo.src}
              alt="PhilFIDA Logo"
              sx={{
                height: 40,
                width: "auto",
                maxWidth: 120,
                objectFit: "contain",
                display: "block",
              }}
            />
            <Box>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "text.primary", letterSpacing: -0.3 }}>
                  PHILFIDA Payroll
                </Typography>
                <Chip
                  label="COS Calculator"
                  size="small"
                  sx={{
                    height: 18,
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    bgcolor: mode === "dark" ? "rgba(52, 211, 153, 0.15)" : "rgba(5, 150, 105, 0.1)",
                    color: mode === "dark" ? "#6ee7b7" : "#047857",
                    border: 1,
                    borderColor: mode === "dark" ? "rgba(52, 211, 153, 0.3)" : "rgba(5, 150, 105, 0.2)",
                  }}
                />
              </Stack>
              <Typography
                variant="caption"
                sx={{ color: "text.secondary", display: { xs: "none", sm: "block" }, fontSize: "0.75rem" }}
              >
                Philippine Fiber Industry Development Authority • Contract of Service Engine
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            {isFirebaseConfigured && (
              <Tooltip
                title={
                  user
                    ? "All data is securely synced to your cloud account"
                    : "Running locally as guest. Log in to persist data."
                }
              >
                <Chip
                  icon={
                    user ? (
                      <CloudSyncIcon style={{ color: "#34d399" }} />
                    ) : (
                      <CloudOfflineIcon style={{ color: "#94a3b8" }} />
                    )
                  }
                  label={dbLoading ? "Syncing..." : user ? "Cloud Synced" : "Guest Mode (Local)"}
                  size="small"
                  sx={{
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    bgcolor: user
                      ? mode === "dark"
                        ? "rgba(52, 211, 153, 0.1)"
                        : "rgba(5, 150, 105, 0.05)"
                      : mode === "dark"
                        ? "rgba(255, 255, 255, 0.05)"
                        : "rgba(0, 0, 0, 0.03)",
                    color: user ? (mode === "dark" ? "#34d399" : "#059669") : "text.secondary",
                    border: 1,
                    borderColor: user
                      ? mode === "dark"
                        ? "rgba(52, 211, 153, 0.2)"
                        : "rgba(5, 150, 105, 0.15)"
                      : mode === "dark"
                        ? "rgba(255, 255, 255, 0.1)"
                        : "rgba(0, 0, 0, 0.08)",
                    "& .MuiChip-icon": {
                      marginLeft: "6px",
                      marginRight: "-4px",
                    },
                  }}
                />
              </Tooltip>
            )}

            {authLoading ? (
              <CircularProgress size={20} sx={{ color: mode === "dark" ? "#34d399" : "#059669" }} />
            ) : user ? (
              <>
                <Button
                  onClick={handleMenuOpen}
                  size="small"
                  variant="text"
                  endIcon={<ArrowDownIcon />}
                  sx={{
                    color: "text.primary",
                    fontWeight: 700,
                    fontSize: "0.8rem",
                    borderRadius: 2,
                    px: 1.5,
                    py: 0.5,
                    border: 1,
                    borderColor: mode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
                    bgcolor: mode === "dark" ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)",
                    "&:hover": {
                      bgcolor: mode === "dark" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
                    },
                  }}
                >
                  <Avatar
                    sx={{
                      width: 20,
                      height: 20,
                      fontSize: "0.65rem",
                      mr: 1,
                      bgcolor: mode === "dark" ? "#047857" : "#10b981",
                      color: "white",
                      fontWeight: 800,
                    }}
                  >
                    {user.email?.charAt(0).toUpperCase()}
                  </Avatar>
                  <span style={{ maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {user.email}
                  </span>
                </Button>
                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleMenuClose}
                  disableScrollLock
                  slotProps={{
                    paper: {
                      sx: {
                        mt: 1,
                        minWidth: 180,
                        borderRadius: 2,
                        border: 1,
                        borderColor: mode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
                        boxShadow:
                          mode === "dark"
                            ? "0 10px 15px -3px rgba(0, 0, 0, 0.3)"
                            : "0 10px 15px -3px rgba(0, 0, 0, 0.05)",
                      },
                    },
                  }}
                >
                  <Box sx={{ px: 2, py: 1, borderBottom: 1, borderColor: "divider", mb: 1 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                      Logged in as
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, fontSize: "0.825rem", wordBreak: "break-all" }}>
                      {user.email}
                    </Typography>
                  </Box>
                  <MenuItem
                    onClick={handleLogout}
                    sx={{ color: "error.main", fontWeight: 600, fontSize: "0.85rem", gap: 1 }}
                  >
                    <LogoutIcon fontSize="small" />
                    Sign Out
                  </MenuItem>
                </Menu>
              </>
            ) : (
              <Button
                onClick={onSignIn}
                size="small"
                variant="outlined"
                startIcon={<LoginIcon />}
                sx={{
                  fontWeight: 700,
                  fontSize: "0.8rem",
                  borderRadius: 2,
                  borderColor: mode === "dark" ? "rgba(52, 211, 153, 0.4)" : "rgba(5, 150, 105, 0.3)",
                  color: mode === "dark" ? "#6ee7b7" : "#059669",
                  "&:hover": {
                    borderColor: mode === "dark" ? "#34d399" : "#047857",
                    backgroundColor: mode === "dark" ? "rgba(52, 211, 153, 0.05)" : "rgba(5, 150, 105, 0.04)",
                  },
                }}
              >
                Sign In
              </Button>
            )}
            <ThemeToggle />
          </Box>
        </Box>
      </Container>

      <ConfirmDialog
        open={logoutConfirmOpen}
        title="Sign out?"
        message={
          hasUnsavedDraft
            ? "You have an unsaved payroll computation in the form. Your sheet data will be cached locally, but this draft will be cleared. Sign out anyway?"
            : "Are you sure you want to sign out? Your data will be cached locally in this browser."
        }
        confirmLabel="Sign Out"
        confirmColor="warning"
        onConfirm={handleConfirmLogout}
        onCancel={() => setLogoutConfirmOpen(false)}
      />
    </Box>
  )
}
