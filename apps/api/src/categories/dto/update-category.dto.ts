import type { LocalizedText } from '../../common/types/localized-text.interface';

export class UpdateCategoryDto {
  name?: LocalizedText;
  description?: LocalizedText | null;
  image?: string | null;
  icon?: string | null;
  template?: Record<string, unknown> | null;
}
