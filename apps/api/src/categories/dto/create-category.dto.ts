import type { LocalizedText } from '../../common/types/localized-text.interface';
import { CategoryStatus } from '../../common/enums/category-status.enum';

export class CreateCategoryDto {
  name!: LocalizedText;
  description?: LocalizedText | null;
  image?: string | null;
  icon?: string | null;
  status?: CategoryStatus;
  template?: Record<string, unknown> | null;
}
