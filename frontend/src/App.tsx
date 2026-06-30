import { BrowserRouter, Route, Routes } from "react-router-dom";

import HomePage from "./components/HomePage";
import RegisterPage from "./components/RegisterPage";
import SermonPlayerPage from "./components/SermonPlayerPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/inscription" element={<RegisterPage />} />
        <Route path="/sermons/:id" element={<SermonPlayerPage />} />
      </Routes>
    </BrowserRouter>
  );
}
