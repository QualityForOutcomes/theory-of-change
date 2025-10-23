
import "../style/Footer.css"; 

/**
 * Footer Component
 * Displays company information, contact details, and social media links
 * Renders at the bottom of all pages in the application
 */
function Footer() {
  return (
    <footer className="footer">
      <div className="footer-content">
        {/* Company branding and copyright notice */}
        <div className="footer-section">
          <h4>Quality for Outcomes</h4>
          {/* Dynamic copyright year updates automatically */}
          <p>© {new Date().getFullYear()} All rights reserved.</p>
        </div>

        {/* Contact information section */}
        <div className="footer-section">
           {/* Clickable email - opens default mail client */}
          <p>Email: <a href="mailto:info@qualityoutcomes.au">info@qualityoutcomes.au</a></p>
          {/* Clickable phone - enables direct calling on mobile devices */}
          <p>Phone: <a href="tel:+61418744433">+61 418 744 433</a></p>
          <p>ABN: 20845959903</p>
        </div>

        {/* Social media links section */}
        <div className="footer-section social">
          {/* TODO: Replace # with actual social media URLs */}
          <a href="#" className="social-link">Facebook</a>
          <a href="#" className="social-link">LinkedIn</a>
          <a href="#" className="social-link">Twitter</a>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
