import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createTocProject, fetchUserProjects } from "../services/api";
import "../style/Project.css";

type TOCData = { projectTitle: string; status: string };
type Project = { userId: string; projectId: string; tocData: TOCData };

const ProjectsPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [newProjectTitle, setNewProjectTitle] = useState("");
  const [showForm, setShowForm] = useState(false);
  const navigate = useNavigate();

  const userId = localStorage.getItem("userId") || "1234";

  // Load all projects for this user
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const res = await fetchUserProjects(userId);
        console.log("Projects response:", res);
        if (res.success && res.data?.projects) {
          setProjects(res.data.projects);
        } else {
          setProjects([]);
        }
      } catch (err) {
        console.error("Failed to load projects", err);
      }
    };
    loadProjects();
  }, [userId]);

  // Create a new project
  // When creating a new project
const handleCreateProject = async () => {
  if (!newProjectTitle.trim()) return;

  try {
    const res = await createTocProject({
      userId,
      projectTitle: newProjectTitle,
      status: "draft",
    });

    if (res.success && res.data) {
      const newProj: Project = res.data;

      // Store userId + projectId in localStorage
      localStorage.setItem("userId", newProj.userId);
      localStorage.setItem("projectId", newProj.projectId);

      // Update local state
      setProjects([newProj, ...projects]);
      setNewProjectTitle("");
      setShowForm(false);

      // Navigate to the form page for this project
      navigate(`/projects/${newProj.projectId}`);
    } else {
      alert(res.message || "Failed to create project");
    }
  } catch (err) {
    console.error("Error creating project", err);
    alert("Error creating project");
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
            <h3>{p.tocData.projectTitle}</h3>
            <button
              onClick={() => {
                localStorage.setItem("projectId", p.projectId); // Store for App.tsx
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
