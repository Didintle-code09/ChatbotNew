import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import navimage from "../assets/images/navimage.png";
import "../styles/navbar.css";

function Navbar() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (window.lucide) window.lucide.createIcons()
  }, [])

  return (
    <nav>
      <div className="container">
        <div className="nav-content">

          <div className="logo">
            <i data-lucide="message-square"></i>
            <div className="navimage">
              <img src={navimage} alt="Ubuntu Law" />
            </div>
          </div>

          <div
            className={`hamburger ${open ? "active" : ""}`}
            onClick={() => setOpen(!open)}
          >
            <span></span>
            <span></span>
            <span></span>
          </div>

          <div className={`nav-links ${open ? "active" : ""}`}>
            <Link to="/" className="btn-primary">Home</Link>
            
            <Link to="/login" className="btn-primary">Login</Link>
            <Link to="/signup" className="btn-primary">Sign Up</Link>
          </div>

        </div>
      </div>
    </nav>
  )
}

export default Navbar
