import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateDispatchPlanDto } from './create-dispatch-plan.dto';

export class UpdateDispatchPlanDto extends PartialType(
    OmitType(CreateDispatchPlanDto, ['items'] as const)
) { }
