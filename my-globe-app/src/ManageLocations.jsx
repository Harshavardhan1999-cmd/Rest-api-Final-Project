import React, { useEffect, useState } from "react";
const BASE_URL = import.meta.env.VITE_API_BASE_URL;

const ManageLocations = () => {
  const [locations, setLocations] = useState([]);
  const [editingLocation, setEditingLocation] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    latitude: "",
    longitude: "",
    landmark: "",
    zipCode: ""
  });

  // Fetch all locations
  const fetchLocations = async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/locations`);
      const data = await response.json();
      setLocations(data);
    } catch (error) {
      console.error("Error fetching locations:", error);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  // Open edit popup
  const openEditPopup = (location) => {
    setEditingLocation(location);
    setFormData(location);
  };

  // Update location
  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${BASE_URL}/api/locations/${editingLocation._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (response.ok) {
        alert("✅ Location updated successfully!");
        setEditingLocation(null);
        fetchLocations();
      } else {
        alert("⚠️ Failed to update location.");
      }
    } catch (error) {
      console.error("Error updating location:", error);
    }
  };

  // Delete location
  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
      try {
        const response = await fetch(`${BASE_URL}/api/locations/${id}`, {
          method: "DELETE",
        });
        if (response.ok) {
          alert("🗑️ Location deleted successfully!");
          setLocations(locations.filter((loc) => loc._id !== id));
        } else {
          alert("⚠️ Failed to delete location.");
        }
      } catch (error) {
        console.error("Error deleting location:", error);
      }
    }
  };

  return (
    <div style={{ padding: "40px", background: "#f9f9f9", minHeight: "100vh", color: "black" }}>
      <h1 style={{ textAlign: "center", marginBottom: "30px", color: "#007BFF" }}>
        Manage Saved Locations
      </h1>

      {/* Locations List */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
        gap: "20px",
      }}>
        {locations.map((loc) => (
          <div
            key={loc._id}
            style={{
              background: "white",
              padding: "20px",
              borderRadius: "10px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              position: "relative",
            }}
          >
            <h3 style={{ color: "#007BFF" }}>{loc.name}</h3>
            <p><strong>Latitude:</strong> {loc.latitude}</p>
            <p><strong>Longitude:</strong> {loc.longitude}</p>
            <p><strong>Landmark:</strong> {loc.landmark || "N/A"}</p>
            <p><strong>Zip Code:</strong> {loc.zipCode || "N/A"}</p>

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "10px" }}>
              <button
                onClick={() => openEditPopup(loc)}
                style={{
                  background: "#FFC107",
                  color: "black",
                  border: "none",
                  borderRadius: "5px",
                  padding: "8px 12px",
                  cursor: "pointer",
                }}
              >
                ✏️ Edit
              </button>
              <button
                onClick={() => handleDelete(loc._id, loc.name)}
                style={{
                  background: "#DC3545",
                  color: "white",
                  border: "none",
                  borderRadius: "5px",
                  padding: "8px 12px",
                  cursor: "pointer",
                }}
              >
                🗑️ Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Popup */}
      {editingLocation && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 1000,
        }}>
          <div style={{
            background: "white",
            padding: "25px",
            borderRadius: "10px",
            width: "400px",
            boxShadow: "0px 4px 10px rgba(0,0,0,0.3)",
          }}>
            <h2 style={{ color: "#007BFF", textAlign: "center" }}>Edit Location</h2>
            <form onSubmit={handleUpdate}>
              {["name", "latitude", "longitude", "landmark", "zipCode"].map((field) => (
                <div key={field} style={{ marginBottom: "12px" }}>
                  <label style={{ fontWeight: "bold" }}>{field.toUpperCase()}</label>
                  <input
                    type="text"
                    value={formData[field] || ""}
                    onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "8px",
                      borderRadius: "5px",
                      border: "1px solid #ccc",
                      marginTop: "4px",
                    }}
                    required={["name", "latitude", "longitude"].includes(field)}
                  />
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "20px" }}>
                <button
                  type="button"
                  onClick={() => setEditingLocation(null)}
                  style={{
                    background: "#ccc",
                    color: "black",
                    border: "none",
                    borderRadius: "5px",
                    padding: "8px 15px",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    background: "#007BFF",
                    color: "white",
                    border: "none",
                    borderRadius: "5px",
                    padding: "8px 15px",
                    cursor: "pointer",
                  }}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageLocations;
