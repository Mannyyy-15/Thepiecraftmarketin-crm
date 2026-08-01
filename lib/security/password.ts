import { z } from "zod";

export const PASSWORD_MAX_LENGTH = 128;

// Passwords are opaque credentials: never trim or otherwise normalize them.
export const loginPasswordSchema = z.string().min(1).max(PASSWORD_MAX_LENGTH);
export const memberAccountPasswordSchema = loginPasswordSchema;
export const adminAccountPasswordSchema = z
  .string()
  .min(12)
  .max(PASSWORD_MAX_LENGTH);
