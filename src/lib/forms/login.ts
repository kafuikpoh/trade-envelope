import { z } from "zod";
export const LoginForm = z.object({
  email: z.string().trim().min(1, "Required").email("Enter a valid email"),
  password: z.string().min(1, "Required"),
});
