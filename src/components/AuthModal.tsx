"use client"

import React, { useState } from "react"
import {
  Dialog,
  DialogContent,
  Tabs,
  Tab,
  Box,
  TextField,
  Button,
  Typography,
  IconButton,
  Alert,
  CircularProgress,
  Divider,
  Stack,
  useTheme,
} from "@mui/material"
import {
  Close as CloseIcon,
  Email as EmailIcon,
  Lock as LockIcon,
} from "@mui/icons-material"
import { useAuth } from "@/context/AuthContext"

// Google Icon SVG component for clean rendering
function GoogleLogoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.87-2.6-2.86-4.53-5.29-4.53z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

interface AuthModalProps {
  open: boolean
  onClose: () => void
}

export function AuthModal({ open, onClose }: AuthModalProps) {
  const theme = useTheme()
  const mode = theme.palette.mode
  const { signIn, signUp, signInWithGoogle, isFirebaseConfigured } = useAuth()

  const [tab, setTab] = useState(0) // 0: Sign In, 1: Sign Up
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTab(newValue)
    setError(null)
    setEmail("")
    setPassword("")
    setConfirmPassword("")
  }

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password.trim()) {
      setError("Please fill in all fields.")
      return
    }

    if (tab === 1 && password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.")
      return
    }

    setLoading(true)
    setError(null)

    try {
      if (tab === 0) {
        await signIn(email, password)
      } else {
        await signUp(email, password)
      }
      onClose()
    } catch (err) {
      console.error(err)
      const firebaseError = err as { code?: string; message?: string }
      let message = firebaseError.message || "An authentication error occurred."
      if (
        firebaseError.code === "auth/user-not-found" ||
        firebaseError.code === "auth/wrong-password" ||
        firebaseError.code === "auth/invalid-credential"
      ) {
        message = "Invalid email or password."
      } else if (firebaseError.code === "auth/email-already-in-use") {
        message = "This email is already registered."
      } else if (firebaseError.code === "auth/weak-password") {
        message = "Password is too weak."
      } else if (firebaseError.code === "auth/invalid-email") {
        message = "Please enter a valid email address."
      }
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleAuth = async () => {
    setLoading(true)
    setError(null)
    try {
      await signInWithGoogle()
      onClose()
    } catch (err) {
      console.error(err)
      const firebaseError = err as { code?: string; message?: string }
      if (firebaseError.code !== "auth/popup-closed-by-user") {
        setError(firebaseError.message || "Failed to sign in with Google.")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      maxWidth="xs"
      fullWidth
      slotProps={{
        backdrop: {
          style: {
            backdropFilter: "blur(8px)",
            backgroundColor: mode === "dark" ? "rgba(15, 23, 42, 0.4)" : "rgba(15, 23, 42, 0.2)",
          },
        },
        paper: {
          sx: {
            borderRadius: 4,
            p: 1.5,
            border: 1,
            borderColor: mode === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)",
            bgcolor: mode === "dark" ? "rgba(30, 41, 59, 0.95)" : "rgba(255, 255, 255, 0.98)",
            boxShadow: mode === "dark"
              ? "0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.4)"
              : "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
          },
        },
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", px: 2, pt: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 800, color: mode === "dark" ? "#6ee7b7" : "#047857", letterSpacing: -0.5 }}>
          {tab === 0 ? "Welcome Back" : "Create Account"}
        </Typography>
        <IconButton onClick={onClose} disabled={loading} size="small" sx={{ color: "text.secondary" }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      <DialogContent sx={{ pt: 1.5, pb: 2 }}>
        {!isFirebaseConfigured ? (
          <Stack spacing={2} sx={{ py: 1 }}>
            <Alert severity="warning" variant="outlined" sx={{ borderRadius: 2 }}>
              Firebase environment credentials are not configured in this environment.
            </Alert>
            <Typography variant="body2" color="text.secondary">
              To utilize database persistence, please copy <code>.env.local.example</code> to <code>.env.local</code> and input your actual Firebase keys.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              You can close this modal and continue using the calculator freely in <strong>Guest Mode</strong> (data will be saved locally in-memory).
            </Typography>
            <Button
              variant="contained"
              fullWidth
              onClick={onClose}
              sx={{
                py: 1,
                mt: 1,
                background: "linear-gradient(135deg, #059669 0%, #10b981 100%)",
              }}
            >
              Continue as Guest
            </Button>
          </Stack>
        ) : (
          <Box>
            <Tabs
              value={tab}
              onChange={handleTabChange}
              variant="fullWidth"
              sx={{
                mb: 2.5,
                borderBottom: 1,
                borderColor: "divider",
                "& .MuiTabs-indicator": {
                  backgroundColor: mode === "dark" ? "#34d399" : "#059669",
                  height: 3,
                  borderRadius: "3px 3px 0 0",
                },
                "& .MuiTab-root": {
                  fontWeight: 700,
                  fontSize: "0.875rem",
                  color: "text.secondary",
                  pb: 1.5,
                  "&.Mui-selected": {
                    color: mode === "dark" ? "#34d399" : "#059669",
                  },
                },
              }}
            >
              <Tab label="Sign In" />
              <Tab label="Sign Up" />
            </Tabs>

            {error && (
              <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            <form onSubmit={handleEmailAuth}>
              <Stack spacing={2}>
                <TextField
                  id="auth-email"
                  label="Email Address"
                  type="email"
                  fullWidth
                  required
                  disabled={loading}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <EmailIcon sx={{ mr: 1, color: "text.secondary", fontSize: 20 }} />
                      ),
                    },
                  }}
                />

                <TextField
                  id="auth-password"
                  label="Password"
                  type="password"
                  fullWidth
                  required
                  disabled={loading}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <LockIcon sx={{ mr: 1, color: "text.secondary", fontSize: 20 }} />
                      ),
                    },
                  }}
                />

                {tab === 1 && (
                  <TextField
                    id="auth-confirm-password"
                    label="Confirm Password"
                    type="password"
                    fullWidth
                    required
                    disabled={loading}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    slotProps={{
                      input: {
                        startAdornment: (
                          <LockIcon sx={{ mr: 1, color: "text.secondary", fontSize: 20 }} />
                        ),
                      },
                    }}
                  />
                )}

                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  disabled={loading}
                  sx={{
                    py: 1.2,
                    fontSize: "0.95rem",
                    fontWeight: 700,
                    borderRadius: 2,
                    background: "linear-gradient(135deg, #059669 0%, #10b981 100%)",
                    boxShadow: "0 4px 14px 0 rgba(16, 185, 129, 0.3)",
                    "&:hover": {
                      background: "linear-gradient(135deg, #047857 0%, #059669 100%)",
                    },
                  }}
                >
                  {loading ? (
                    <CircularProgress size={24} sx={{ color: "white" }} />
                  ) : tab === 0 ? (
                    "Sign In"
                  ) : (
                    "Sign Up"
                  )}
                </Button>
              </Stack>
            </form>

            <Box sx={{ my: 2.5, display: "flex", alignItems: "center" }}>
              <Divider sx={{ flexGrow: 1 }} />
              <Typography variant="caption" sx={{ px: 1.5, color: "text.secondary", fontWeight: 600 }}>
                OR
              </Typography>
              <Divider sx={{ flexGrow: 1 }} />
            </Box>

            <Button
              variant="outlined"
              fullWidth
              onClick={handleGoogleAuth}
              disabled={loading}
              startIcon={<GoogleLogoIcon />}
              sx={{
                py: 1.2,
                borderRadius: 2,
                borderWidth: "1.5px",
                borderColor: mode === "dark" ? "rgba(255, 255, 255, 0.15)" : "rgba(0, 0, 0, 0.15)",
                color: "text.primary",
                fontWeight: 700,
                backgroundColor: mode === "dark" ? "rgba(255, 255, 255, 0.03)" : "rgba(0, 0, 0, 0.02)",
                "&:hover": {
                  borderWidth: "1.5px",
                  borderColor: mode === "dark" ? "#34d399" : "#059669",
                  backgroundColor: mode === "dark" ? "rgba(52, 211, 153, 0.05)" : "rgba(5, 150, 105, 0.04)",
                },
              }}
            >
              Sign In with Google
            </Button>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  )
}
