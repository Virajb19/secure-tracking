import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

/**
 * Zod schema for toggling user active status.
 */
export const ToggleUserStatusSchema = z.object({
  /**
   * New active status for the user.
   */
  is_active: z.boolean(),
});

export class ToggleUserStatusDto extends createZodDto(ToggleUserStatusSchema) {}
