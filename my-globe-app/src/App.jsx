import React, { useState, useRef, useEffect } from "react";
import Globe from "react-globe.gl";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
  Polyline,
  Popup,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

// ✅ Fix default icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const SearchLocation = ({ location }) => {
  const map = useMap();
  useEffect(() => {
    if (location.lat && location.lng) map.setView([location.lat, location.lng], 10);
  }, [location, map]);
  return null;
};

const App = () => {
  const globeRef = useRef();
  const [showMap, setShowMap] = useState(false);
  const [activeTab, setActiveTab] = useState("search");
  const [alert, setAlert] = useState(null);

  const [fromLocation, setFromLocation] = useState("");
  const [toLocation, setToLocation] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [mapLocation, setMapLocation] = useState({ lat: 44.5, lng: -89.5 });
  const [showPopup, setShowPopup] = useState(false);
  const [formData, setFormData] = useState({
    latitude: "",
    longitude: "",
    name: "",
    landmark: "",
    zipCode: "",
  });
  const [locations, setLocations] = useState([]);
  const [editingLocation, setEditingLocation] = useState(null);
  const [distanceDetails, setDistanceDetails] = useState(null);
  const [linePoints, setLinePoints] = useState([]);
  const [searchResult, setSearchResult] = useState(null);

  // 🟢 Helper: Alerts
  const showTempAlert = (msg, type = "success") => {
    setAlert({ msg, type });
    setTimeout(() => setAlert(null), 2000);
  };

  // 🟢 Fetch Locations
  const fetchLocations = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/locations`);
      const data = await res.json();
      setLocations(data);
    } catch {
      showTempAlert("Error fetching locations", "error");
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  useEffect(() => {
    if (globeRef.current) {
      globeRef.current.controls().autoRotate = true;
      globeRef.current.controls().autoRotateSpeed = 1;
    }
  }, []);

  // 🔍 Search Location
  const searchLocation = async (query) => {
    if (!query) return showTempAlert("Enter a location first", "error");
    try {
      // clear previous results
      setDistanceDetails(null);
      setLinePoints([]);
      setFromLocation("");
      setToLocation("");

      const res = await fetch(`${BASE_URL}/api/locations/search?name=${query.toLowerCase()}`);
      const data = await res.json();

      if (data.latitude && data.longitude) {
        setMapLocation({ lat: data.latitude, lng: data.longitude });
        setSearchResult(data);
      } else {
        setSearchResult(null);
        showTempAlert("Location not found", "error");
      }
    } catch {
      showTempAlert("Error searching location", "error");
    }
  };

  // 📏 Calculate Distance
  const calculateDistance = async () => {
    if (!fromLocation || !toLocation)
      return showTempAlert("Enter both From and To locations", "error");

    try {
      // clear previous search
      setSearchResult(null);

      const res = await fetch(`${BASE_URL}/api/locations/distance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location1: fromLocation.toLowerCase(),
          location2: toLocation.toLowerCase(),
        }),
      });

      const data = await res.json();
      const distanceText = data.distance || "";
      const matches = distanceText.match(/([0-9.]+)/);
      const miles = matches ? parseFloat(matches[1]) : 0;
      const formatted = `${miles.toFixed(2)} miles`;

      const from = locations.find((l) => l.name.toLowerCase() === fromLocation.toLowerCase());
      const to = locations.find((l) => l.name.toLowerCase() === toLocation.toLowerCase());

      if (from && to) {
        const points = [
          [from.latitude, from.longitude],
          [to.latitude, to.longitude],
        ];
        setLinePoints(points);
        setDistanceDetails({ from, to, distance: formatted });

        setTimeout(() => {
          const mapContainer = document.querySelector(".leaflet-container")?._leaflet_map;
          if (mapContainer)
            mapContainer.fitBounds(L.latLngBounds(points), { padding: [50, 50] });
        }, 300);
      }
    } catch {
      showTempAlert("Error calculating distance", "error");
    }
  };

  // ➕ Add / ✏️ Edit
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const isEdit = !!editingLocation;
    const method = isEdit ? "PUT" : "POST";
    const url = isEdit
      ? `${BASE_URL}/api/locations/${editingLocation._id}`
      : `${BASE_URL}/api/locations`;

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, name: formData.name.toLowerCase() }),
      });

      if (res.ok) {
        fetchLocations();
        showTempAlert(isEdit ? "Successfully updated location" : "Successfully added location", "success");
        setShowPopup(false);
        setEditingLocation(null);
        setFormData({ latitude: "", longitude: "", name: "", landmark: "", zipCode: "" });
      } else {
        const err = await res.json();
        showTempAlert(err.message || "Error adding/updating location", "error");
      }
    } catch {
      showTempAlert("Error adding/updating location", "error");
    }
  };

  const handleEdit = (loc) => {
    setEditingLocation(loc);
    setFormData({
      latitude: loc.latitude,
      longitude: loc.longitude,
      name: loc.name,
      landmark: loc.landmark || "",
      zipCode: loc.zipCode || "",
    });
    setShowPopup(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this location?")) return;
    try {
      const res = await fetch(`${BASE_URL}/api/locations/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchLocations();
        showTempAlert("Successfully deleted location", "success");
      } else {
        showTempAlert("Error removing location", "error");
      }
    } catch {
      showTempAlert("Error removing location", "error");
    }
  };

  return (
    <div style={{ width: "100vw", height: "100vh", background: "black", display: "flex", justifyContent: "center", alignItems: "center" }}>
      {alert && (
        <div
          style={{
            position: "fixed",
            top: "20px",
            right: "20px",
            padding: "10px 20px",
            background: alert.type === "success" ? "#28A745" : "#DC3545",
            color: "white",
            borderRadius: "5px",
            boxShadow: "0px 2px 6px rgba(0,0,0,0.3)",
            zIndex: 2000,
          }}
        >
          {alert.msg}
        </div>
      )}

      {!showMap ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <Globe
            ref={globeRef}
            width={800}
            height={800}
            globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
            bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
            backgroundColor="rgba(0,0,0,0)"
          />
          <button
            onClick={() => setShowMap(true)}
            style={{
              marginTop: "20px",
              background: "#007BFF",
              color: "white",
              padding: "10px 20px",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
            }}
          >
            🌍 Open Map
          </button>
        </div>
      ) : (
        <div style={{ width: "100%", height: "100%", background: "white", display: "flex", flexDirection: "column", alignItems: "center", padding: "20px" }}>
          {/* Tabs */}
          <div style={{ display: "flex", gap: "20px", marginBottom: "20px" }}>
            {["search", "locations"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  background: activeTab === tab ? "#007BFF" : "#ccc",
                  color: "white",
                  padding: "8px 15px",
                  borderRadius: "5px",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                {tab === "search" ? "🔍 Search & Distance" : "📍 Locations"}
              </button>
            ))}
          </div>

          {activeTab === "search" ? (
            <>
              {/* 🔍 Search */}
              <div style={{ marginBottom: "15px" }}>
                <input
                  placeholder="Search location"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  list="locationsList"
                  style={{
                    padding: "8px",
                    borderRadius: "5px",
                    border: "1px solid #ccc",
                    width: "250px",
                    marginRight: "10px",
                  }}
                />
                <datalist id="locationsList">
                  {locations.map((l) => (
                    <option key={l._id} value={l.name} />
                  ))}
                </datalist>
                <button
                  onClick={() => searchLocation(searchQuery)}
                  style={{
                    background: "#007BFF",
                    color: "white",
                    padding: "8px 12px",
                    borderRadius: "5px",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  Search
                </button>
              </div>

              {/* From / To */}
              <div style={{ marginBottom: "15px" }}>
                <input
                  placeholder="From"
                  value={fromLocation}
                  onChange={(e) => setFromLocation(e.target.value)}
                  list="locationsList"
                  style={{
                    padding: "8px",
                    borderRadius: "5px",
                    border: "1px solid #ccc",
                    marginRight: "10px",
                  }}
                />
                <input
                  placeholder="To"
                  value={toLocation}
                  onChange={(e) => setToLocation(e.target.value)}
                  list="locationsList"
                  style={{
                    padding: "8px",
                    borderRadius: "5px",
                    border: "1px solid #ccc",
                    marginRight: "10px",
                  }}
                />
                <button
                  onClick={calculateDistance}
                  style={{
                    background: "#28A745",
                    color: "white",
                    padding: "8px 12px",
                    borderRadius: "5px",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  Calculate
                </button>
              </div>

              {distanceDetails && (
                <div
                  style={{
                    marginBottom: "10px",
                    background: "#f0f8ff",
                    padding: "10px",
                    borderRadius: "5px",
                    width: "80%",
                  }}
                >
                  <strong>Distance:</strong> {distanceDetails.distance}
                  <br />
                  <strong>From:</strong> {distanceDetails.from.name}
                  <br />
                  <strong>To:</strong> {distanceDetails.to.name}
                </div>
              )}

              {searchResult && (
                <div
                  style={{
                    marginBottom: "15px",
                    background: "#f0f8ff",
                    padding: "10px",
                    borderRadius: "5px",
                    width: "80%",
                  }}
                >
                  <strong>Name:</strong> {searchResult.name} <br />
                  <strong>Latitude:</strong> {searchResult.latitude} <br />
                  <strong>Longitude:</strong> {searchResult.longitude} <br />
                  <strong>Landmark:</strong> {searchResult.landmark || "N/A"} <br />
                  <strong>Zip:</strong> {searchResult.zipCode || "N/A"}
                </div>
              )}

              {/* 🗺️ Map */}
              <div
                style={{
                  width: "80%",
                  height: "60vh",
                  border: "2px solid black",
                  borderRadius: "10px",
                }}
              >
                <MapContainer
                  center={[mapLocation.lat, mapLocation.lng]}
                  zoom={6}
                  style={{ height: "100%", width: "100%" }}
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <SearchLocation location={mapLocation} />
                  {searchResult && (
                    <Marker position={[searchResult.latitude, searchResult.longitude]}>
                      <Popup>{searchResult.name}</Popup>
                    </Marker>
                  )}
                  {linePoints.length > 0 && (
                    <>
                      <Marker position={linePoints[0]}>
                        <Popup>From: {distanceDetails?.from?.name}</Popup>
                      </Marker>
                      <Marker position={linePoints[1]}>
                        <Popup>To: {distanceDetails?.to?.name}</Popup>
                      </Marker>
                      <Polyline positions={linePoints} color="blue" />
                    </>
                  )}
                </MapContainer>
              </div>
            </>
          ) : (
            <>
              {/* 📍 Locations Table */}
              <div style={{ width: "80%", marginBottom: "10px", textAlign: "right" }}>
                <button
                  onClick={() => {
                    setEditingLocation(null);
                    setFormData({
                      latitude: "",
                      longitude: "",
                      name: "",
                      landmark: "",
                      zipCode: "",
                    });
                    setShowPopup(true);
                  }}
                  style={{
                    background: "#007BFF",
                    color: "white",
                    padding: "8px 12px",
                    borderRadius: "5px",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  ➕ Add Location
                </button>
              </div>

              <table
                style={{
                  borderCollapse: "collapse",
                  width: "80%",
                  color: "black",
                  border: "1px solid #ccc",
                }}
              >
                <thead style={{ background: "#007BFF", color: "white" }}>
                  <tr>
                    <th>Name</th>
                    <th>Latitude</th>
                    <th>Longitude</th>
                    <th>Landmark</th>
                    <th>Zip</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {locations.map((loc) => (
                    <tr key={loc._id}>
                      <td>{loc.name}</td>
                      <td>{loc.latitude}</td>
                      <td>{loc.longitude}</td>
                      <td>{loc.landmark}</td>
                      <td>{loc.zipCode}</td>
                      <td>
                        <button
                          onClick={() => handleEdit(loc)}
                          style={{
                            background: "#28A745",
                            color: "white",
                            padding: "5px 8px",
                            border: "none",
                            borderRadius: "4px",
                            marginRight: "5px",
                            cursor: "pointer",
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(loc._id)}
                          style={{
                            background: "#DC3545",
                            color: "white",
                            padding: "5px 8px",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {/* 🪟 Popup */}
          {showPopup && (
            <div
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                width: "100vw",
                height: "100vh",
                background: "rgba(0,0,0,0.5)",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  background: "white",
                  padding: "20px",
                  borderRadius: "10px",
                  width: "400px",
                }}
              >
                <form onSubmit={handleFormSubmit}>
                  <h3 style={{ textAlign: "center" }}>
                    {editingLocation ? "Edit Location" : "Add Location"}
                  </h3>
                  {["latitude", "longitude", "name", "landmark", "zipCode"].map((f) => (
                    <div key={f} style={{ marginBottom: "10px" }}>
                      <label>{f.charAt(0).toUpperCase() + f.slice(1)}:</label>
                      <input
                        value={formData[f]}
                        onChange={(e) =>
                          setFormData({ ...formData, [f]: e.target.value })
                        }
                        style={{
                          width: "100%",
                          padding: "8px",
                          borderRadius: "5px",
                          border: "1px solid #ccc",
                        }}
                        required={["latitude", "longitude", "name"].includes(f)}
                      />
                    </div>
                  ))}
                  <div style={{ textAlign: "right" }}>
                    <button
                      type="button"
                      onClick={() => setShowPopup(false)}
                      style={{
                        background: "#ccc",
                        marginRight: "10px",
                        padding: "6px 10px",
                        borderRadius: "5px",
                        border: "none",
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      style={{
                        background: "#007BFF",
                        color: "white",
                        padding: "6px 10px",
                        borderRadius: "5px",
                        border: "none",
                      }}
                    >
                      Save
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default App;
