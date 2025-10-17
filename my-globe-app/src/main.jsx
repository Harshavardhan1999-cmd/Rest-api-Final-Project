import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";
import ManageLocations from "./ManageLocations.jsx"; // 👈 new page

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />                {/* Home page */}
        <Route path="/manage" element={<ManageLocations />} /> {/* Manage Locations page */}
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
