import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateChallanDto } from './create-challan.dto';

export class UpdateChallanDto extends PartialType(
    OmitType(CreateChallanDto, ['items'] as const)
) { }
