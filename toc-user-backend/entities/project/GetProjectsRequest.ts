import ProjectData from "./ProjectData"

export default interface GetProjectsRequest {
    userId: string;
    projectId?: string;
    projectData?: ProjectData;
}