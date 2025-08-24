
import "../style/Footer.css"; 

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-section">
          <h4>Quality for Outcomes</h4>
          <p>© 2025 All rights reserved.</p>
        </div>
        <div className="footer-section">
          <p>Email: <a href="mailto:info@qualityoutcomes.au">info@qualityoutcomes.au</a></p>
          <p>Phone: <a href="tel:+61418744433">+61 418 744 433</a></p>
          <p>ABN: 20845959903</p>
        </div>
        <div className="footer-section social">
          <a href="#" className="social-link">Facebook</a>
          <a href="#" className="social-link">LinkedIn</a>
          <a href="#" className="social-link">Twitter</a>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
