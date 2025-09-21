import { BulkProjectData } from '../entities/BulkProjectData'

export interface BulkCreateUpdateRequest {
    userId: string;
    projects: BulkProjectData[];
}