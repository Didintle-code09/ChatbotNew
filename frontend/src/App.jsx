import { Routes, Route } from "react-router-dom"
import Home from "./pages/Home"
import Team from "./pages/Team"
import Login from "./pages/Login"
import Signup from "./pages/Signup"
import Chat from "./pages/Chat"; // Added this line to import Chat component

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/team" element={<Team />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/chat" element={<Chat />} />
    </Routes>
  )
}

export default App
