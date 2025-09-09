import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Login from "./pages/login/login.js";
import Register from "./pages/register/register.js";
import Checkup from "./pages/checkup/checkup.js";
import Profile from "./pages/profile/profile.js";
import AdminPanel from "./pages/admin/admin.js";
import History from "./pages/history/history.js";
import Navbar from "./pages/navbar/navbar.js";

import NewCheckupPage from "./pages/checkup/new_checkup.js";
import NewHistory from "./pages/history/new_history.js";
import BiochemPage from "./pages/biochem/biochem.js";

function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<NewCheckupPage />} />
        <Route path="/checkup" element={<Checkup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/history" element={<History />} />
        <Route path="/new_checkup" element={<NewCheckupPage />} />
        <Route path="/new_history" element={<NewHistory />} />
        <Route path="/biochem" element={<BiochemPage />} />
      </Routes>
    </Router>
  );
}

export default App;