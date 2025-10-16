import React, { useState, useRef, useEffect } from "react";
import Globe from "react-globe.gl";
import { MapContainer, TileLayer, Marker, useMap, Polyline, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
const BASE_URL = import.meta.env.VITE_API_BASE_URL;
// Fix for default marker icons in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const SearchLocation = ({ location }) => {
  const map = useMap();

  useEffect(() => {
    if (location.lat && location.lng) {
      map.setView([location.lat, location.lng], 10);
    }
  }, [location, map]);

  return null; // No marker here, handled in the main component
};

const App = () => {
  const globeRef = useRef();
  const [showMap, setShowMap] = useState(false);
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
  const [submissionStatus, setSubmissionStatus] = useState(null);
  const [locations, setLocations] = useState([]);
  const [distance, setDistance] = useState(null);
  const [distanceInMeters, setDistanceInMeters] = useState(null);
  const [linePoints, setLinePoints] = useState([]);
  const [fromCoords, setFromCoords] = useState(null);
  const [toCoords, setToCoords] = useState(null);
  const [searchResult, setSearchResult] = useState(null);
  const [distanceDetails, setDistanceDetails] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showToSuggestions, setShowToSuggestions] = useState(false);
  const [toSuggestions, setToSuggestions] = useState([]);
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);

  useEffect(() => {
    if (globeRef.current) {
      globeRef.current.controls().autoRotate = true;
      globeRef.current.controls().autoRotateSpeed = 1;
    }
  }, []);

  const fetchLocations = async () => {
    try {
    const response = await fetch(`${BASE_URL}/api/locations`);
      const data = await response.json();
      setLocations(data);
    } catch (error) {
      console.error("Error fetching locations:", error);
    }
  };

  // Update suggestions based on input
  useEffect(() => {
    if (fromLocation.length > 1 && locations.length > 0) {
      const matches = locations
        .filter(loc => loc.name.toLowerCase().includes(fromLocation.toLowerCase()))
        .map(loc => loc.name);
      setSuggestions(matches.slice(0, 5)); // Limit to 5 suggestions
      setShowSuggestions(matches.length > 0);
    } else {
      setShowSuggestions(false);
    }
  }, [fromLocation, locations]);

  // Update To location suggestions
  useEffect(() => {
    if (toLocation.length > 1 && locations.length > 0) {
      const matches = locations
        .filter(loc => loc.name.toLowerCase().includes(toLocation.toLowerCase()))
        .map(loc => loc.name);
      setToSuggestions(matches.slice(0, 5)); // Limit to 5 suggestions
      setShowToSuggestions(matches.length > 0);
    } else {
      setShowToSuggestions(false);
    }
  }, [toLocation, locations]);

  // Update search suggestions
  useEffect(() => {
    if (searchQuery.length > 1 && locations.length > 0) {
      const matches = locations
        .filter(loc => loc.name.toLowerCase().includes(searchQuery.toLowerCase()))
        .map(loc => loc.name);
      setSearchSuggestions(matches.slice(0, 5));
      setShowSearchSuggestions(matches.length > 0);
    } else {
      setShowSearchSuggestions(false);
    }
  }, [searchQuery, locations]);

  const selectSearchSuggestion = (suggestion) => {
    setSearchQuery(suggestion);
    setShowSearchSuggestions(false);
  };

  const searchLocation = async (query) => {
    if (!query) {
      alert("Please enter a location before searching.");
      return;
    }
    try {
      const response = await fetch(`${BASE_URL}/api/search-location?name=${query.toLowerCase()}`);
      const data = await response.json();
      if (data.latitude && data.longitude) {
        setMapLocation({ lat: data.latitude, lng: data.longitude });
        setSearchResult(data); // Set search result details
        
        // Add a marker for the searched location
        setFromCoords([data.latitude, data.longitude]);
      } else {
        alert("Location not found. Try a different search term.");
        setSearchResult(null); d
      }
    } catch (error) {
      console.error("Error fetching location:", error);
    }
  };

  const calculateDistance = async () => {
    if (!fromLocation || !toLocation) {
      alert("Please enter both 'From' and 'To' locations.");
      return;
    }
    try {
      const response = await fetch(`${BASE_URL}/api/distance`, { //change IP here
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ location1: fromLocation.toLowerCase(), location2: toLocation.toLowerCase() }),
      });
      const data = await response.json();
      
      // Extract the numeric distance and convert to miles
      const distanceText = data.distance;
      const matches = distanceText.match(/([0-9.]+)\s*([a-zA-Z]+)/);
      let distanceValue = 0;
      let unit = "miles";
      
      if (matches && matches.length >= 3) {
        distanceValue = parseFloat(matches[1]);
        unit = matches[2];
      } else {
        distanceValue = parseFloat(distanceText.split(' ')[0]);
      }
      
      // Set the distance in a more readable format
      const formattedDistance = `${distanceValue.toFixed(2)} ${unit}`;
      setDistance(formattedDistance);
      
      // For internal calculations (not display), convert to meters
      if (!isNaN(distanceValue)) {
        const meters = Math.round(distanceValue * 1609.34);
        setDistanceInMeters(meters);
      }

      // Fetch coordinates for the line
      const fromLoc = locations.find((loc) => loc.name.toLowerCase() === fromLocation.toLowerCase());
      const toLoc = locations.find((loc) => loc.name.toLowerCase() === toLocation.toLowerCase());
      
      if (fromLoc && toLoc) {
        setFromCoords([fromLoc.latitude, fromLoc.longitude]);
        setToCoords([toLoc.latitude, toLoc.longitude]);
        setLinePoints([
          [fromLoc.latitude, fromLoc.longitude],
          [toLoc.latitude, toLoc.longitude],
        ]);
        
        // Set detailed distance information
        setDistanceDetails({
          from: {
            name: fromLoc.name,
            landmark: fromLoc.landmark,
            zipCode: fromLoc.zipCode
          },
          to: {
            name: toLoc.name,
            landmark: toLoc.landmark,
            zipCode: toLoc.zipCode
          },
          distance: formattedDistance
        });
      }
    } catch (error) {
      console.error("Error calculating distance:", error);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${BASE_URL}/api/add-location`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          name: formData.name.toLowerCase(), // Ensure case-insensitive name
        }),
      });
      if (response.ok) {
        setSubmissionStatus("success");
        fetchLocations(); // Refresh locations
        setTimeout(() => {
          setShowPopup(false);
          setSubmissionStatus(null);
        }, 2000);
      } else if (response.status === 400) {
        const errorData = await response.json();
        alert(errorData.message); // Show error message for existing location
      } else {
        setSubmissionStatus("error");
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      setSubmissionStatus("error");
    }
  };

  // Select suggestion handler
  const selectSuggestion = (suggestion) => {
    setFromLocation(suggestion);
    setShowSuggestions(false);
  };

  // Select To suggestion handler
  const selectToSuggestion = (suggestion) => {
    setToLocation(suggestion);
    setShowToSuggestions(false);
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  return (
    <div style={{ width: "100vw", height: "100vh", background: "black", display: "flex", justifyContent: "center", alignItems: "center" }}>
      {!showMap ? (
        // Globe View
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <Globe
            ref={globeRef}
            width={800}
            height={800}
            globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
            bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
            backgroundColor="rgba(0,0,0,0)"
          />
          {/* MAP Button */}
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
              display: "flex",
              alignItems: "center",
              gap: "10px",
              fontSize: "16px",
              boxShadow: "0px 4px 10px rgba(0,0,0,0.3)",
            }}
          >
            <img
              src="https://cdn-icons-png.flaticon.com/512/684/684908.png"
              alt="map icon"
              style={{ width: "20px", height: "20px" }}
            />
            MAP
          </button>
        </div>
      ) : (
        // Map Screen with Inputs Above
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100vw", height: "100vh", background: "white", paddingTop: "50px" }}>
          <div style={{ width: "80vw", maxWidth: "900px", display: "flex", flexDirection: "column", alignItems: "center" }}>
            {/* Universal Search Bar with Magnifier Button */}
            <div
              style={{
                background: "white",
                padding: "10px",
                borderRadius: "8px",
                display: "flex",
                gap: "10px",
                boxShadow: "0px 4px 10px rgba(0,0,0,0.3)",
                zIndex: 10,
                border: "1px solid #ccc",
                marginBottom: "20px",
                width: "100%",
                position: "relative",
              }}
            >
              <div style={{ position: "relative", flexGrow: 1 }}>
                <input
                  type="text"
                  placeholder="Search a location (e.g., University of Wisconsin)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ fontSize: "14px", padding: "8px", borderRadius: "5px", border: "1px solid #ccc", width: "100%" }}
                />
                {showSearchSuggestions && (
                  <div style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    width: "100%",
                    background: "white",
                    border: "1px solid #ccc",
                    borderRadius: "0 0 5px 5px",
                    zIndex: 20,
                    boxShadow: "0 4px 8px rgba(0,0,0,0.1)"
                  }}>
                    {searchSuggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        onClick={() => selectSearchSuggestion(suggestion)}
                        style={{
                          padding: "8px 12px",
                          borderBottom: index === searchSuggestions.length - 1 ? "none" : "1px solid #eee",
                          cursor: "pointer",
                          color: "black"
                        }}
                        onMouseOver={(e) => e.target.style.backgroundColor = "#f5f5f5"}
                        onMouseOut={(e) => e.target.style.backgroundColor = "white"}
                      >
                        {suggestion}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => searchLocation(searchQuery)}
                style={{
                  background: "#FF4500",
                  color: "white",
                  padding: "8px 12px",
                  border: "none",
                  borderRadius: "5px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                }}
              >
                🔍 Search
              </button>
            </div>

            {/* Display Search Result */}
            {searchResult && (
              <div style={{ 
                marginBottom: "20px", 
                padding: "15px", 
                border: "1px solid #ccc", 
                borderRadius: "5px", 
                background: "#f9f9f9", 
                width: "100%",
                color: "black",
                boxShadow: "0px 2px 5px rgba(0,0,0,0.1)"
              }}>
                <h3 style={{ color: "#007BFF", marginBottom: "10px", borderBottom: "1px solid #ddd", paddingBottom: "5px" }}>Search Result:</h3>
                <p style={{ margin: "8px 0", fontSize: "15px" }}><strong>Name:</strong> {searchResult.name}</p>
                <p style={{ margin: "8px 0", fontSize: "15px" }}><strong>Landmark:</strong> {searchResult.landmark}</p>
                <p style={{ margin: "8px 0", fontSize: "15px" }}><strong>Zip Code:</strong> {searchResult.zipCode}</p>
              </div>
            )}

            {/* Inputs and Buttons Above the Map */}
            <div
              style={{
                background: "white",
                padding: "15px",
                borderRadius: "8px",
                display: "flex",
                gap: "10px",
                boxShadow: "0px 4px 10px rgba(0,0,0,0.3)",
                zIndex: 10,
                border: "1px solid #ccc",
                marginBottom: "20px",
                width: "100%",
                position: "relative",
              }}
            >
              <div style={{ position: "relative", flexGrow: 1 }}>
                <input
                  type="text"
                  placeholder="From"
                  value={fromLocation}
                  onChange={(e) => setFromLocation(e.target.value)}
                  style={{ fontSize: "14px", padding: "8px", borderRadius: "5px", border: "1px solid #ccc", width: "100%" }}
                />
                {showSuggestions && (
                  <div style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    width: "100%",
                    background: "white",
                    border: "1px solid #ccc",
                    borderRadius: "0 0 5px 5px",
                    zIndex: 20,
                    boxShadow: "0 4px 8px rgba(0,0,0,0.1)"
                  }}>
                    {suggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        onClick={() => selectSuggestion(suggestion)}
                        style={{
                          padding: "8px 12px",
                          borderBottom: index === suggestions.length - 1 ? "none" : "1px solid #eee",
                          cursor: "pointer",
                          color: "black"
                        }}
                        onMouseOver={(e) => e.target.style.backgroundColor = "#f5f5f5"}
                        onMouseOut={(e) => e.target.style.backgroundColor = "white"}
                      >
                        {suggestion}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div style={{ position: "relative", flexGrow: 1 }}>
                <input
                  type="text"
                  placeholder="To"
                  value={toLocation}
                  onChange={(e) => setToLocation(e.target.value)}
                  style={{ fontSize: "14px", padding: "8px", borderRadius: "5px", border: "1px solid #ccc", width: "100%" }}
                />
                {showToSuggestions && (
                  <div style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    width: "100%",
                    background: "white",
                    border: "1px solid #ccc",
                    borderRadius: "0 0 5px 5px",
                    zIndex: 20,
                    boxShadow: "0 4px 8px rgba(0,0,0,0.1)"
                  }}>
                    {toSuggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        onClick={() => selectToSuggestion(suggestion)}
                        style={{
                          padding: "8px 12px",
                          borderBottom: index === toSuggestions.length - 1 ? "none" : "1px solid #eee",
                          cursor: "pointer",
                          color: "black"
                        }}
                        onMouseOver={(e) => e.target.style.backgroundColor = "#f5f5f5"}
                        onMouseOut={(e) => e.target.style.backgroundColor = "white"}
                      >
                        {suggestion}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <button
                onClick={calculateDistance}
                style={{
                  background: "#007BFF",
                  color: "white",
                  padding: "8px 15px",
                  border: "none",
                  borderRadius: "5px",
                  cursor: "pointer",
                  boxShadow: "0px 4px 10px rgba(0,0,0,0.3)",
                  whiteSpace: "nowrap",
                }}
              >
                Calculate Distance
              </button>
              <button
                onClick={() => setShowPopup(true)}
                style={{
                  background: "#007BFF",
                  color: "white",
                  padding: "8px 15px",
                  border: "none",
                  borderRadius: "5px",
                  cursor: "pointer",
                  boxShadow: "0px 4px 10px rgba(0,0,0,0.3)",
                  whiteSpace: "nowrap",
                }}
              >
                Add Coordinates
              </button>
            </div>
            {/* Detailed Distance Display */}
{distanceDetails && (
  <div style={{ 
    marginBottom: "20px", 
    padding: "15px", 
    border: "1px solid #007BFF", 
    borderRadius: "5px", 
    background: "#f0f8ff",
    width: "100%",
    color: "black",
    boxShadow: "0px 2px 5px rgba(0,0,0,0.1)"
  }}>
    <h3 style={{ textAlign: "center", color: "#007BFF", marginBottom: "15px", borderBottom: "1px solid #ddd", paddingBottom: "8px" }}>
      Distance Information (Miles)
    </h3>
    
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <div style={{ width: "45%" }}>
        <h4 style={{ borderBottom: "1px dashed #ccc", paddingBottom: "5px", color: "#444" }}>From</h4>
        <p style={{ margin: "8px 0", fontSize: "15px" }}><strong>Name:</strong> {distanceDetails.from.name}</p>
        <p style={{ margin: "8px 0", fontSize: "15px" }}><strong>Landmark:</strong> {distanceDetails.from.landmark}</p>
        <p style={{ margin: "8px 0", fontSize: "15px" }}><strong>Zip Code:</strong> {distanceDetails.from.zipCode}</p>
      </div>
      
      <div style={{ width: "45%" }}>
        <h4 style={{ borderBottom: "1px dashed #ccc", paddingBottom: "5px", color: "#444" }}>To</h4>
        <p style={{ margin: "8px 0", fontSize: "15px" }}><strong>Name:</strong> {distanceDetails.to.name}</p>
        <p style={{ margin: "8px 0", fontSize: "15px" }}><strong>Landmark:</strong> {distanceDetails.to.landmark}</p>
        <p style={{ margin: "8px 0", fontSize: "15px" }}><strong>Zip Code:</strong> {distanceDetails.to.zipCode}</p>
      </div>
    </div>
    
    <div style={{ 
      marginTop: "15px", 
      textAlign: "center", 
      fontSize: "20px", 
      fontWeight: "bold",
      padding: "10px",
      background: "#007BFF",
      color: "white",
      borderRadius: "5px"
    }}>
      Distance: {distanceDetails.distance.replace(" meters", " miles")}
    </div>
  </div>
)}

            {/* Map Container - Fixed Size */}
            <div
              style={{
                width: "100%",
                height: "500px", // Fixed height
                border: "2px solid black",
                borderRadius: "10px",
                overflow: "hidden",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                background: "white", // Added background
              }}
            >
              <MapContainer center={[mapLocation.lat, mapLocation.lng]} zoom={7} style={{ height: "100%", width: "100%" }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <SearchLocation location={mapLocation} />
                
                {/* Search result marker */}
                {searchResult && searchResult.latitude && searchResult.longitude && 
                  <Marker position={[searchResult.latitude, searchResult.longitude]}>
                    <Popup>
                      <div>
                        <strong>{searchResult.name}</strong><br/>
                        {searchResult.landmark}<br/>
                        {searchResult.zipCode}
                      </div>
                    </Popup>
                  </Marker>
                }
                
                {/* From and To markers */}
                {fromCoords && 
                  <Marker position={fromCoords}>
                    <Popup>
                      <strong>From:</strong> {fromLocation}
                    </Popup>
                  </Marker>
                }
                {toCoords && 
                  <Marker position={toCoords}>
                    <Popup>
                      <strong>To:</strong> {toLocation}
                    </Popup>
                  </Marker>
                }
                
                {/* Distance line with popup */}
                {linePoints.length > 0 && (
                  <Polyline positions={linePoints} color="#007BFF" weight={3}>
                    {distance && (
                      <Popup>
                        <div style={{ textAlign: "center", color: "black" }}>
                          <strong style={{ fontSize: "16px" }}>Distance:</strong><br/>
                          <span style={{ fontSize: "14px", color: "#007BFF", fontWeight: "bold" }}>
                            {distance}
                          </span>
                        </div>
                      </Popup>
                    )}
                  </Polyline>
                )}
              </MapContainer>
            </div>
          </div>
        </div>
      )}

      {/* Popup Form */}
      {showPopup && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "white",
              padding: "20px",
              borderRadius: "10px",
              width: "400px",
              boxShadow: "0px 4px 10px rgba(0,0,0,0.3)",
            }}
          >
            {submissionStatus === "success" ? (
              <div style={{ textAlign: "center", color: "green" }}>
                <h3>Successfully Submitted!</h3>
                <button
                  onClick={() => setShowPopup(false)}
                  style={{
                    background: "#007BFF",
                    color: "white",
                    padding: "8px 15px",
                    border: "none",
                    borderRadius: "5px",
                    cursor: "pointer",
                    marginTop: "10px",
                  }}
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleFormSubmit}>
                <h2 style={{ marginBottom: "20px", textAlign: "center", color: "#333", fontSize: "24px" }}>Add Coordinates</h2>
                <div style={{ marginBottom: "15px" }}>
                  <label style={{ color: "#333", display: "block", marginBottom: "5px", fontWeight: "500" }}>Latitude</label>
                  <input
                    type="text"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                    style={{ width: "100%", padding: "8px", borderRadius: "5px", border: "1px solid #ccc" }}
                    required
                  />
                </div>
                <div style={{ marginBottom: "15px" }}>
                  <label style={{ color: "#333", display: "block", marginBottom: "5px", fontWeight: "500" }}>Longitude</label>
                  <input
                    type="text"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                    style={{ width: "100%", padding: "8px", borderRadius: "5px", border: "1px solid #ccc" }}
                    required
                  />
                </div>
                <div style={{ marginBottom: "15px" }}>
                  <label style={{ color: "#333", display: "block", marginBottom: "5px", fontWeight: "500" }}>Name of the Location</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    style={{ width: "100%", padding: "8px", borderRadius: "5px", border: "1px solid #ccc" }}
                    required
                  />
                </div>
                <div style={{ marginBottom: "15px" }}>
                  <label style={{ color: "#333", display: "block", marginBottom: "5px", fontWeight: "500" }}>Landmark</label>
                  <input
                    type="text"
                    value={formData.landmark}
                    onChange={(e) => setFormData({ ...formData, landmark: e.target.value })}
                    style={{ width: "100%", padding: "8px", borderRadius: "5px", border: "1px solid #ccc" }}
                  />
                </div>
                <div style={{ marginBottom: "20px" }}>
                  <label style={{ color: "#333", display: "block", marginBottom: "5px", fontWeight: "500" }}>Zip Code</label>
                  <input
                    type="text"
                    value={formData.zipCode}
                    onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                    style={{ width: "100%", padding: "8px", borderRadius: "5px", border: "1px solid #ccc" }}
                  />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <button
                    type="button"
                    onClick={() => setShowPopup(false)}
                    style={{
                      background: "#ccc",
                      color: "black",
                      padding: "8px 15px",
                      border: "none",
                      borderRadius: "5px",
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
                      padding: "8px 15px",
                      border: "none",
                      borderRadius: "5px",
                      cursor: "pointer",
                    }}
                  >
                    Submit
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;