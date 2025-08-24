import React, { useState } from "react";
import "../style/UsersList.css";

const UserListPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleExport = (type: "csv" | "pdf") => {
    alert(`Exporting as ${type}`);
  };

  return (
    <div className="userlist-container">
      <div className="userlist-header">
        <input
          type="text"
          placeholder="Search users..."
          value={searchQuery}
          onChange={handleSearch}
          className="search-bar"
        />
        <div className="export-buttons">
          <button onClick={() => handleExport("csv")}>Export CSV</button>
        </div>
      </div>

      <table className="userlist-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Email</th>
            <th>Subscription</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colSpan={4} style={{ textAlign: "center", padding: "20px" }}>
              User details will be displayed here
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default UserListPage;
