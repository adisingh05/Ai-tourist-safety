import { Routes, Route, Navigate } from "react-router-dom";
import { RequireAuth } from "./components/guards";
import Shell from "./components/Shell";
import Home from "./pages/Home";
import Trip from "./pages/Trip";
import MapPage from "./pages/MapPage";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import Signup from "./pages/Signup";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      <Route element={<RequireAuth />}>
        <Route element={<Shell />}>
          <Route index element={<Home />} />
          <Route path="trip" element={<Trip />} />
          <Route path="map" element={<MapPage />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
