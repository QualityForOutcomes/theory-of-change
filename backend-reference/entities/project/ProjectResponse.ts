import ProjectData from "./ProjectData"

export default interface ProjectResponse {
    userId: string;
    projects: ProjectData[];
    pagination?: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}