import Navbar from "../components/Navbar"
import Footer from "../components/Footer"
import "../styles/about.css"

const team = [
  { name: "Didintle Moratamotho", role: "UI/UX Developer", img: "https://i.imgur.com/jFZJTQh.jpg" },
  { name: "Sarah Johnson", role: "Full-Stack Developer", img: "https://i.imgur.com/ASlVfFN.jpg" },
  { name: "Marcus Rodriguez", role: "Data Scientist", img: "https://i.imgur.com/pqgWv5E.jpg" },
  { name: "Emma Thompson", role: "UX Designer", img: "https://i.imgur.com/PS1nWwh.jpg" }
]

function Team() {
  return (
    <>
      <Navbar />

      <section className="hero">
        <h1>Meet Our Team</h1>
        <p>Four passionate students united by Ubuntu.</p>
      </section>

      <section className="team-grid">
        {team.map((member, i) => (
          <div className="team-card" key={i}>
            <img src={member.img} alt={member.name} />
            <h3>{member.name}</h3>
            <p className="role">{member.role}</p>
          </div>
        ))}
      </section>

      <Footer />
    </>
  )
}

export default Team
