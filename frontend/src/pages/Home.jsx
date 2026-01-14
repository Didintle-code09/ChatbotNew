import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/website.css";
import logo from "../assets/images/logo.jpg";
import navimage from "../assets/images/navimage.png";

const HomePage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);

  const navigate = useNavigate();

  const FEATURES = {
    chatEnabled: true,
  };

  const trackEvent = (eventName, data = {}) => {
    console.log(`[Analytics] ${eventName}`, data);
  };

  const scrollToCTA = () => {
    const element = document.getElementById("cta-section");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      trackEvent("cta_scroll");
      setMenuOpen(false);
    }
  };

  const handleSignup = () => {
    if (!FEATURES.chatEnabled) return;
    trackEvent("chat_now_clicked");
    setIsLoading(true);
    setTimeout(() => {
      navigate("/chat"); 
    }, 800);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const tips = [
    "Know your rights before signing any contract.",
    "You have the right to legal representation.",
    "Always request written agreements.",
    "Silence is not an admission of guilt.",
  ];

  const handleLogoHover = () => {
    setShowEmojis(true);
    setTimeout(() => setShowEmojis(false), 3000);
  };

  // Tip rotation
  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % tips.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

 
  useEffect(() => {
    const revealElements = document.querySelectorAll(".reveal");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("active");
          }
        });
      },
      { threshold: 0.2 }
    );
    revealElements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) setMenuOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="gradient-bg">
      <nav>
        <div className="container">
          <div className="nav-content">
            <div className="justice-logo" onMouseEnter={handleLogoHover}>
              <img src={navimage} alt="Ubuntu Law" />
              
            </div>

            <div className={`nav-links ${menuOpen ? "active" : ""}`}>
              <button className="nav-buttons" onClick={scrollToCTA}>
                Get Started
              </button>
              
              
              <Link to="/login" className="nav-buttons">
                Log In
              </Link>
              <Link to="/signup" className="nav-buttons">
                Sign Up
              </Link>
            </div>

            <div
              className={`hamburger ${menuOpen ? "active" : ""}`}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
      </nav>

      <section className="hero reveal">
        <div className="container">
          <div className="hero-grid">
            <div>
              <h1>
                {getGreeting()}, How can {" "}
                <span className="blue-text">the UbuntuBot help you?</span>
              </h1>
              <p>UbuntuBot offers expert legal advice tailored for your needs.</p>
              {FEATURES.chatEnabled && (
                <button
                  className="btn-cta"
                  onClick={handleSignup}
                  disabled={isLoading}
                >
                  {isLoading ? "Loading..." : "Chat Now"}
                </button>
              )}
              <p className="small-text">{tips[tipIndex]}</p>
            </div>

            <div>
              <img src={logo} alt="UbuntuBot Logo" />
              {showEmojis && (
                <>
                  <span className="emoji e1">⚖️</span>
                  <span className="emoji e2">📜</span>
                  <span className="emoji e3">🏛️</span>
                  <span className="emoji e4">⚖️</span>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="features-reveal1">
        
          <div className="container">
          <div className="section-header">
            <h2>Everything You Need to Excel</h2>
            <p>Powerful tools designed for modern law enthusiasts</p>
          </div>
          <div className="features-grid">
            <div className="feature-card">
              <h3>Concept Explanations</h3>
              <p>
                Break down complex legal principles into clear, digestible
                explanations with real-world examples.
              </p>
            </div>
            <div className="feature-card">
              <h3>Case Law Research</h3>
              <p>Instantly find relevant cases and understand how to apply them.</p>
            </div>
            <div className="feature-card">
              <h3>Legal Advice</h3>
              <p>Get connected with trusted legal professionals through UbuntuLaw.</p>
            </div>
          </div>
        </div>
        
        
      </section>

      <section className="benefits reveal">
        <div className="container">
          <div className="benefits-grid">
            <div>
              <h2>Understand your Rights, the Gen-Z way.</h2>
              <ul className="benefits-list">
                <li>✔ Available 24/7</li>
                <li>✔ Instant legal answers</li>
                <li>✔ Personalized learning</li>
                <li>✔ Covers major areas of law</li>
              </ul>
            </div>
            <div className="stats-card">
              <div className="stat-number"></div>
              <p className="stat-label"></p>
              <div className="stat-number"></div>
              <p className="stat-label"></p>
            </div>
          </div>
        </div>
      </section>

      <section className="cta reveal" id="cta-section">
        <div className="container">
          <h2>Ready to Get Legal Advice?</h2>
          <p>Join thousands of students using UbuntuBot</p>
          {FEATURES.chatEnabled && (
            <button className="btn-large" onClick={handleSignup}>
              Chat Now
            </button>
          )}
        </div>
      </section>

      <footer>
        <div className="container">
          <p>Overcoming injustice.</p>
          <p className="copyright">© 2026 UbuntuLaw. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
