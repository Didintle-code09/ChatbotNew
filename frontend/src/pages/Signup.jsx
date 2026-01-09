import { useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "../styles/signup.css";

function Signup() {
  const [show, setShow] = useState(false); // Password toggle

  // Sign-Up handler inside component
  const handleSignUp = async (e) => {
    e.preventDefault(); // Prevent page refresh
    const username = e.target[0].value; // Get first input: username
    const email = e.target[1].value;    // Get second input: email
    const password = e.target[2].value; // Get third input: password

    try {
      const res = await fetch("http://localhost:5000/signup", {
        method: "POST", // POST request to create user
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }), // Send data as JSON
      });

      const data = await res.json(); // Parse JSON response
      alert(data.message);           // Show message from server

      if (res.ok) {
        window.location.href = "/login"; // Redirect to login after signup
      }
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <>
      <Navbar />
      <div className="content">
        <form onSubmit={handleSignUp}>
          <h2>Sign Up</h2>

          <input placeholder="Username" required />
          <input placeholder="Email" type="email" required />

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

          <button type="submit" className="btnn">Sign Up</button>

          <div className="button">
            <p>
              Already have an account? <a href="/login"><span>Login</span></a>
            </p>
          </div>
        </form>
      </div>
      <Footer />
    </>
  );
}

export default Signup;
