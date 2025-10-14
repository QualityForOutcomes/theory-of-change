import { ProjectListItem } from './ProjectListItem';

export interface ProjectListResponse {
    projects: ProjectListItem[];
    count: number;
}