import { createZodDto } from 'nestjs-zod';
import { CreateContactSchema } from './create-contact.dto';

export class UpdateContactDto extends createZodDto(CreateContactSchema.partial()) {}
