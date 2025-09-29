import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createTocProject, fetchUserTocs } from "../services/api";
import "../style/Project.css";

type Project = { projectId: string; projectName: string };

const ProjectsPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [newProjectTitle, setNewProjectTitle] = useState("");
  const [showForm, setShowForm] = useState(false);
  const navigate = useNavigate();

  const userId = localStorage.getItem("userId") || "";

  // Load user projects
  useEffect(() => {
  const loadProjects = async () => {
    try {
      const res = await fetchUserTocs(); // token in headers identifies the user
      if (res.success && res.data?.projects) {
        setProjects(res.data.projects);
      } else {
        setProjects([]);
      }
    } catch (err: any) {
      console.error("Failed to load projects", err);
      alert(err.message || "Failed to load projects");
    }
  };

  loadProjects();
}, []); // run once on mount


  // Create new project
  const handleCreateProject = async () => {
    if (!newProjectTitle.trim()) return;

    try {
      const res = await createTocProject({
        userId,
        projectTitle: newProjectTitle,
        status: "draft",
      });

      if (res.success && res.data) {
        const newProj: Project = {
          projectId: res.data.projectId,
          projectName: res.data.tocData.projectTitle,
        };

        localStorage.setItem("projectId", newProj.projectId);
        setProjects([newProj, ...projects]);
        setNewProjectTitle("");
        setShowForm(false);
        navigate(`/projects/${newProj.projectId}`);
      } else {
        alert(res.message || "Failed to create project");
      }
    } catch (err: any) {
      alert(err.message); // e.g., duplicate project title
    }
  };

  return (
    <div className="projects-container">
      <h1>Workspace</h1>

      {!showForm ? (
        <button className="create-btn" onClick={() => setShowForm(true)}>
          Create Project +
        </button>
      ) : (
        <div className="create-form">
          <input
            value={newProjectTitle}
            onChange={(e) => setNewProjectTitle(e.target.value)}
            placeholder="Project Name"
          />
          <div className="form-actions">
            <button onClick={handleCreateProject}>Save</button>
            <button onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      <ul className="projects-list">
        {projects.map((p) => (
          <li key={p.projectId} className="project-card">
            <h3>{p.projectName}</h3>
            <button
              className="open-btn"
              onClick={() => {
                localStorage.setItem("projectId", p.projectId);
                navigate(`/projects/${p.projectId}`);
              }}
            >
              Open
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ProjectsPage;
