import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createTocProject, fetchUserTocs } from "../services/api";
import "../style/Project.css";

type Project = { projectId: string; projectName: string };

const ProjectsPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [newProjectTitle, setNewProjectTitle] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string>("");
  const [validationError, setValidationError] = useState<string>("");
  const navigate = useNavigate();

  const userId = localStorage.getItem("userId") || "";

  // Load user projects
  useEffect(() => {
    const loadProjects = async () => {
      setIsLoading(true);
      setError("");
      try {
        const res = await fetchUserTocs();
        if (res.success && res.data?.projects) {
          setProjects(res.data.projects);
        } else {
          setProjects([]);
          setError(res.message || "No projects found");
        }
      } catch (err: any) {
        console.error("Failed to load projects", err);
        setError(err.response?.data?.message || err.message || "Failed to load projects");
      } finally {
        setIsLoading(false);
      }
    };

    loadProjects();
  }, []);

  // Validate project title
  const validateProjectTitle = (title: string): boolean => {
    setValidationError("");
    
    // Trim and check if empty
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setValidationError("Project name cannot be empty");
      return false;
    }

    // Check minimum length
    if (trimmedTitle.length < 3) {
      setValidationError("Project name must be at least 3 characters");
      return false;
    }

    // Check maximum length
    if (trimmedTitle.length > 100) {
      setValidationError("Project name must be less than 100 characters");
      return false;
    }

    // Check for special characters (optional)
    const validNamePattern = /^[a-zA-Z0-9\s\-_'.]+$/;
    if (!validNamePattern.test(trimmedTitle)) {
      setValidationError("Project name contains invalid characters");
      return false;
    }

    // Check for duplicate names
    const isDuplicate = projects.some(
      (p) => p.projectName.toLowerCase() === trimmedTitle.toLowerCase()
    );
    if (isDuplicate) {
      setValidationError("A project with this name already exists");
      return false;
    }

    return true;
  };

  // Create new project
  const handleCreateProject = async () => {
    const trimmedTitle = newProjectTitle.trim();
    
    if (!validateProjectTitle(trimmedTitle)) {
      return;
    }

    setIsCreating(true);
    setError("");

    try {
      const res = await createTocProject({
        userId,
        projectTitle: trimmedTitle,
        status: "draft",
      });

      if (res.success && res.data) {
        const newProj: Project = {
          projectId: res.data.projectId,
          projectName: res.data.tocData?.projectTitle || trimmedTitle,
        };

        localStorage.setItem("projectId", newProj.projectId);
        setProjects([newProj, ...projects]);
        setNewProjectTitle("");
        setShowForm(false);
        setValidationError("");
        navigate(`/projects/${newProj.projectId}`);
      } else {
        setError(res.message || "Failed to create project");
      }
    } catch (err: any) {
      console.error("Create project error:", err);
      const errorMessage = err.response?.data?.message || err.message || "Failed to create project";
      setError(errorMessage);
    } finally {
      setIsCreating(false);
    }
  };

  // Handle input change with real-time validation
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewProjectTitle(value);
    
    // Clear validation error when user starts typing again
    if (validationError) {
      setValidationError("");
    }
  };

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !isCreating) {
      handleCreateProject();
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
            onChange={handleTitleChange}
            onKeyPress={handleKeyPress}
            placeholder="Project Name"
            disabled={isCreating}
            className={validationError ? "input-error" : ""}
            autoFocus
          />
          {validationError && (
            <span className="validation-error">{validationError}</span>
          )}
          <div className="form-actions">
            <button 
              onClick={handleCreateProject} 
              disabled={isCreating || !newProjectTitle.trim()}
              className={isCreating ? "creating" : ""}
            >
              {isCreating ? (
                <>
                  <span className="spinner-small"></span>
                  Creating...
                </>
              ) : (
                "Save"
              )}
            </button>
            <button 
              onClick={() => {
                setShowForm(false);
                setNewProjectTitle("");
                setValidationError("");
              }}
              disabled={isCreating}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={() => setError("")} className="close-error">×</button>
        </div>
      )}

      {isLoading ? (
        <div className="loading-container">
          <div className="spinner-large"></div>
          <p>Loading projects...</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="empty-state">
          <p>No projects yet. Create your first project to get started!</p>
        </div>
      ) : (
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
      )}
    </div>
  );
};

export default ProjectsPage;