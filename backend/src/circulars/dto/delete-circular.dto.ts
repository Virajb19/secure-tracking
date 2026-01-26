import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const DeleteCircularSchema = z.object({
//   circular_id: z.uuid(),
  reason: z.string().min(3).optional(), // optional but useful for audit
});

export class DeleteCircularDto extends createZodDto(DeleteCircularSchema) {}
