import { z } from "zod";

export const loginSchema = z.object({
  email: z.email({message: 'Please enter a valid email'}).trim(),
  password: z.string().min(8, {message: 'Password must be atleast 8 letters long'}).max(15, { message: 'Password cannot exceed 15 characters'}),
  phone: z.string().optional(),
});

export type LoginSchema = z.infer<typeof loginSchema>;

// Form validation schema for circulars - supports multiple schools
export const circularFormSchema = z.object({
  title: z.string().min(1, 'Circular title is required'),
  description: z.string().optional(),
  issued_by: z.string().min(1, 'Issued by is required'),
  issued_date: z.string().min(1, 'Issued date is required'),
  effective_date: z.string().optional(),
  district_id: z.string().optional(),
  school_ids: z.array(z.string()).optional(), // Multiple schools support
});

export type CircularFormSchema = z.infer<typeof circularFormSchema>;