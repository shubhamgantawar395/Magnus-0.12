export type ExecutionType = 'inhouse' | 'outsourced';

export interface Machine {
    id: string;
    organizationId: string;
    machineCode: string;
    machineName: string;
    machineType: string;
    department?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CreateMachineDto {
    machineCode: string;
    machineName: string;
    machineType: string;
    department?: string;
}

export interface UpdateMachineDto extends Partial<CreateMachineDto> {
    isActive?: boolean;
}
