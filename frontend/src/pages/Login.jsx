import { useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "../styles/login.css";

function Login() {
  const [show, setShow] = useState(false); // For password toggle

  // Login handler inside component
  const handleLogin = async (e) => {
    e.preventDefault(); // Prevent page reload

    const username = e.target[0].value; // First input: username
    const password = e.target[1].value; // Second input: password

    try {
      const res = await fetch("http://localhost:5000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }) // Send login info
      });

      const data = await res.json(); // Parse server response
      alert(data.message); // Show success/error message

      if (res.ok) {
        localStorage.setItem("token", data.token); // Store JWT in browser
        window.location.href = "/dashboard";       // Redirect to protected page
      }
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <>
      <Navbar />

      <div className="content">
        <form onSubmit={handleLogin}>
          <h2>Login</h2>

          <div className="input-box">
            <input type="text" placeholder="Username" required />
          </div>

          <div className="input-box">
            <input
              type={show ? "text" : "password"}
              placeholder="Password"
              required
            />
            <i
              className={show ? "ri-eye-fill" : "ri-eye-off-fill"}
              onClick={() => setShow(!show)}
            ></i>
          </div>

          <div className="remember">
            <label>
              <input type="checkbox" />
              Remember me
            </label>
            <a href="/forgot-password">Forgot Password?</a>
          </div>

          <button type="submit" className="btnn">Login</button>

          <div className="button">
            <p>
              Don't have an account? <a href="/signup"><span>Sign Up</span></a>
            </p>
          </div>
        </form>
      </div>

      <Footer />
    </>
  );
}

export default Login;
