export const ANNUAL_EXEMPTION = 250_000
export const HOURS_PER_DAY = 8
export const PREMIUM_RATE = 0.2
export const TAX_RATE = 0.05

export const round = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

export const roundUp = (n: number) => {
  if (n === 0 || Object.is(n, -0)) {
    return 0
  }
  return Math.ceil(n * 100 - 1e-9) / 100
}

export const SEMI_MONTHLY_EXEMPTION = roundUp(ANNUAL_EXEMPTION / 12 / 2)
