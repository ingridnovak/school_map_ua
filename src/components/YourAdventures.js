import { useEffect, useRef, useState } from 'react';
import '../App.css';
import './YourAdventures.css';
import AuthModal from './AuthModal';

// Region data - customize text for each region with vibrant rainbow colors
const regionData = {
  "Avtonomna Respublika Krym": { text: "Crimea", color: "#ff9aa2" },        // Soft red
  "Vinnytska": { text: "Vinnytsia", color: "#9ad3ff" },                      // Soft blue
  "Volynska": { text: "Volyn", color: "#ffff99" },                           // Soft yellow
  "Dnipropetrovska": { text: "Dnipropetrovsk", color: "#ffcc99" },           // Soft orange
  "Donetska": { text: "Donetsk", color: "#d099f0" },                         // Soft purple
  "Zhytomyrska": { text: "Zhytomyr", color: "#99ffb3" },                     // Soft green
  "Zakarpatska": { text: "Zakarpattia", color: "#ffb3d9" },                  // Soft pink
  "Zaporizka": { text: "Zaporizhzhia", color: "#b3e6f0" },                   // Soft cyan
  "Ivano-Frankivska": { text: "Ivano-Frankivsk", color: "#ffeb99" },         // Soft cream
  "Kyivska": { text: "Kyiv Oblast", color: "#ffb399" },                      // Soft peach
  "Kirovohradska": { text: "Kirovohrad", color: "#b399ff" },                 // Soft lavender
  "Luhanska": { text: "Luhansk", color: "#99ffe0" },                         // Soft mint
  "Lvivska": { text: "Lviv", color: "#ff99d6" },                             // Soft magenta
  "Mykolaivska": { text: "Mykolaiv", color: "#99ccff" },                     // Soft sky blue
  "Odeska": { text: "Odesa", color: "#ffd699" },                             // Soft amber
  "Poltavska": { text: "Poltava", color: "#c299ff" },                        // Soft violet
  "Rivnenska": { text: "Rivne", color: "#99ffcc" },                          // Soft seafoam
  "Sumska": { text: "Sumy", color: "#ff9999" },                              // Soft coral
  "Ternopilska": { text: "Ternopil", color: "#99e6ff" },                     // Soft aqua
  "Kharkivska": { text: "Kharkiv", color: "#fff799" },                       // Soft butter
  "Khersonska": { text: "Kherson", color: "#ffc499" },                       // Soft apricot
  "Khmelnytska": { text: "Khmelnytskyi", color: "#d499f0" },                 // Soft orchid
  "Cherkaska": { text: "Cherkasy", color: "#99ffd9" },                       // Soft jade
  "Chernivetska": { text: "Chernivtsi", color: "#ffcceb" },                  // Soft rose
  "Chernihivska": { text: "Chernihiv", color: "#cce6ff" },                   // Soft periwinkle
  "Sevastopilska": { text: "Sevastopol", color: "#ff99c2" }                  // Soft raspberry
};

function YourAdventures() {
  const mapContainerRef = useRef(null);
  const svgContainerRef = useRef(null);
  const tooltipRef = useRef(null);
  const currentHoveredPath = useRef(null);
  const svgElementRef = useRef(null);

  const [showPinModal, setShowPinModal] = useState(false);
  const [showTextModal, setShowTextModal] = useState(false);
  const [showImpressionsModal, setShowImpressionsModal] = useState(false);
  const [showAuthRequiredModal, setShowAuthRequiredModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [selectedPinType, setSelectedPinType] = useState(null);
  const [clickPosition, setClickPosition] = useState({ x: 0, y: 0 });
  const [pins, setPins] = useState([]);
  const [currentText, setCurrentText] = useState('');
  const [currentName, setCurrentName] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [, forceUpdate] = useState({});

  // Check if user is logged in
  useEffect(() => {
    const loggedIn = localStorage.getItem('isLoggedIn') === 'true';
    setIsLoggedIn(loggedIn);
  }, [showAuthModal]);

  useEffect(() => {
    const loadAndSetupSVG = async () => {
      try {
        const response = await fetch('/ukraine.svg');
        const svgText = await response.text();

        if (svgContainerRef.current) {
          svgContainerRef.current.innerHTML = svgText;

          const svgElement = svgContainerRef.current.querySelector('svg');
          if (!svgElement) return;

          svgElementRef.current = svgElement;

          // Cache the CTM and container rect
          let cachedCTM = null;
          let cachedContainerRect = null;
          let cachedMapRect = null;

          const updateCache = () => {
            if (!svgElement || !svgContainerRef.current || !mapContainerRef.current) return;
            cachedCTM = svgElement.getScreenCTM();
            cachedContainerRect = svgContainerRef.current.getBoundingClientRect();
            cachedMapRect = mapContainerRef.current.getBoundingClientRect();
          };

          updateCache();
          window.addEventListener('resize', updateCache);

          // Pre-calculate and cache bounding boxes for all paths
          const pathCache = new Map();
          const paths = svgElement.querySelectorAll('path[name]');
          const labels = [];

          paths.forEach(path => {
            const regionName = path.getAttribute('name');
            path.style.cursor = 'pointer';
            path.style.transition = 'fill 0.15s ease, filter 0.15s ease';
            path.style.fill = regionData[regionName]?.color || '#6f9c76';

            // Cache bbox for performance
            const bbox = path.getBBox();
            pathCache.set(path, bbox);

            // Calculate label position for mobile
            const centerX = bbox.x + bbox.width / 2;
            const centerY = bbox.y + bbox.height / 2;
            labels.push({
              name: regionName,
              text: regionData[regionName]?.text || regionName,
              x: centerX,
              y: centerY
            });
          });

          // Add text labels directly to SVG for mobile
          const addLabelsToSVG = () => {
            // Remove existing labels
            const existingLabels = svgElement.querySelectorAll('.region-text-label');
            existingLabels.forEach(label => label.remove());

            // Add new labels
            labels.forEach(label => {
              const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
              text.setAttribute('x', label.x);
              text.setAttribute('y', label.y);
              text.setAttribute('class', 'region-text-label');
              text.setAttribute('text-anchor', 'middle');
              text.setAttribute('dominant-baseline', 'middle');
              text.setAttribute('pointer-events', 'none');
              text.textContent = label.text;
              svgElement.appendChild(text);
            });
          };

          addLabelsToSVG();

          // Use event delegation on the SVG container
          const handleMouseOver = (e) => {
            const path = e.target.closest('path[name]');
            if (!path) return;

            const regionName = path.getAttribute('name');

            // Reset previous
            if (currentHoveredPath.current && currentHoveredPath.current !== path) {
              const prevRegion = currentHoveredPath.current.getAttribute('name');
              currentHoveredPath.current.style.fill = regionData[prevRegion]?.color || '#6f9c76';
              currentHoveredPath.current.style.filter = 'none';
            }

            // Set new
            currentHoveredPath.current = path;
            path.style.fill = '#4a7c5a';
            path.style.filter = 'brightness(1.2)';

            // Update tooltip position and content using cached values
            if (tooltipRef.current && cachedCTM && cachedMapRect) {
              const bbox = pathCache.get(path);

              // Calculate the center point of the region
              const point = svgElement.createSVGPoint();
              point.x = bbox.x + bbox.width / 2;
              point.y = bbox.y;

              // Transform to screen coordinates
              const screenPoint = point.matrixTransform(cachedCTM);

              // Set tooltip content to just the region name
              tooltipRef.current.textContent = regionData[regionName]?.text || regionName;
              tooltipRef.current.style.display = 'block';

              // Get tooltip dimensions
              const tooltipRect = tooltipRef.current.getBoundingClientRect();

              // Calculate position relative to map-container - center horizontally
              const left = screenPoint.x - cachedMapRect.left - (tooltipRect.width / 2);
              let top = screenPoint.y - cachedMapRect.top - tooltipRect.height - 15;

              // Check if tooltip would be cut off at the top
              const tooltipTopScreenEdge = screenPoint.y - tooltipRect.height - 15;
              const minVisibleTop = 80; // Account for tabs and padding

              // If tooltip would go above the visible area, position it below instead
              if (tooltipTopScreenEdge < minVisibleTop || top < 0) {
                // Position below the region
                top = screenPoint.y - cachedMapRect.top + bbox.height + 15;
                tooltipRef.current.classList.add('tooltip-below');
              } else {
                tooltipRef.current.classList.remove('tooltip-below');
              }

              tooltipRef.current.style.left = `${left}px`;
              tooltipRef.current.style.top = `${top}px`;
            }
          };

          const handleMouseOut = (e) => {
            const path = e.target.closest('path[name]');
            if (!path) return;

            const regionName = path.getAttribute('name');
            path.style.fill = regionData[regionName]?.color || '#6f9c76';
            path.style.filter = 'none';

            if (currentHoveredPath.current === path) {
              currentHoveredPath.current = null;
            }

            // Hide tooltip
            if (tooltipRef.current) {
              tooltipRef.current.style.display = 'none';
            }
          };

          const handleClick = (e) => {
            const path = e.target.closest('path[name]');
            if (!path) return;

            const regionName = path.getAttribute('name');
            const bbox = pathCache.get(path);

            // Use the center of the region's bounding box to ensure pin is always within the region
            // This prevents pins from being placed outside the region when clicking near borders
            const centerX = bbox.x + bbox.width / 2;
            const centerY = bbox.y + bbox.height / 2;

            setSelectedRegion(regionName);
            setClickPosition({ x: centerX, y: centerY, bbox });

            // Check if user is logged in before showing pin modal
            if (!isLoggedIn) {
              setShowAuthRequiredModal(true);
            } else {
              setShowPinModal(true);
            }
          };

          svgElement.addEventListener('mouseover', handleMouseOver);
          svgElement.addEventListener('mouseout', handleMouseOut);
          svgElement.addEventListener('click', handleClick);

          // Cleanup
          return () => {
            svgElement.removeEventListener('mouseover', handleMouseOver);
            svgElement.removeEventListener('mouseout', handleMouseOut);
            svgElement.removeEventListener('click', handleClick);
            window.removeEventListener('resize', updateCache);
          };
        }
      } catch (error) {
        console.error('Error loading SVG:', error);
      }
    };

    loadAndSetupSVG();
  }, [pins]);

  // Handle scroll events to update pin positions in mobile view
  useEffect(() => {
    const mapContainer = mapContainerRef.current;
    if (!mapContainer) return;

    const handleScroll = () => {
      forceUpdate({});
    };

    mapContainer.addEventListener('scroll', handleScroll);
    return () => {
      mapContainer.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const handlePinSelection = (pinType) => {
    setSelectedPinType(pinType);
    setShowPinModal(false);
    setShowTextModal(true);
  };

  const handleTextSubmit = () => {
    if (!currentText.trim()) return;

    // Calculate offset for multiple pins in the same region
    const regionPinsCount = pins.filter(p => p.region === selectedRegion).length;

    // Add spacing offset for multiple pins (spread them out in a circle pattern)
    const pinSpacing = 30; // Distance between pins in SVG coordinates
    const angle = (regionPinsCount * 60) * (Math.PI / 180); // 60 degrees apart
    const offsetX = Math.cos(angle) * pinSpacing;
    const offsetY = Math.sin(angle) * pinSpacing;

    const newPin = {
      id: Date.now(),
      region: selectedRegion,
      pinType: selectedPinType,
      text: currentText,
      name: currentName,
      x: clickPosition.x + offsetX,
      y: clickPosition.y + offsetY,
      index: regionPinsCount
    };

    setPins([...pins, newPin]);
    setCurrentText('');
    setCurrentName('');
    setShowTextModal(false);
    setSelectedRegion(null);
    setSelectedPinType(null);
  };

  const handleModalClose = () => {
    setShowPinModal(false);
    setShowTextModal(false);
    setShowImpressionsModal(false);
    setShowAuthRequiredModal(false);
    setSelectedRegion(null);
    setSelectedPinType(null);
    setCurrentText('');
    setCurrentName('');
  };

  const handleRegisterClick = () => {
    setShowAuthRequiredModal(false);
    setShowAuthModal(true);
  };

  return (
    <div className="map-container" ref={mapContainerRef}>
      <div
        ref={svgContainerRef}
        className="interactive-svg"
      />

      {/* Render pins on the map */}
      {pins.map((pin) => {
        if (!svgElementRef.current || !mapContainerRef.current) return null;

        const svgElement = svgElementRef.current;
        const ctm = svgElement.getScreenCTM();
        const mapRect = mapContainerRef.current.getBoundingClientRect();

        if (!mapRect || !ctm) return null;

        const point = svgElement.createSVGPoint();
        point.x = pin.x;
        point.y = pin.y;
        const screenPoint = point.matrixTransform(ctm);

        // Account for scroll offset in mobile view where map is scrollable
        const scrollLeft = mapContainerRef.current.scrollLeft || 0;
        const scrollTop = mapContainerRef.current.scrollTop || 0;

        return (
          <div
            key={pin.id}
            className="map-pin"
            style={{
              left: `${screenPoint.x - mapRect.left + scrollLeft}px`,
              top: `${screenPoint.y - mapRect.top + scrollTop}px`,
            }}
          >
            <img
              src={pin.pinType === 'visited' ? '/red-pin.svg' : '/green-pin.svg'}
              alt={`${pin.pinType} pin`}
              className="pin-icon"
            />
          </div>
        );
      })}


      <div
        ref={tooltipRef}
        className="region-tooltip"
        style={{ display: 'none' }}
      />

      <div className="scroll-hint">
        👆 Swipe to explore the map
      </div>

      {/* Pin Selection Modal */}
      {showPinModal && (
        <div className="modal-overlay" onClick={handleModalClose}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Would you like to add a pin?</h3>
            <div className="pin-options">
              <button
                className="pin-button visited"
                onClick={() => handlePinSelection('visited')}
              >
                <img src="/red-pin.svg" alt="Red pin" className="pin-preview" />
                <span>I've already been here</span>
              </button>
              <button
                className="pin-button want-to-visit"
                onClick={() => handlePinSelection('wantToVisit')}
              >
                <img src="/green-pin.svg" alt="Green pin" className="pin-preview" />
                <span>I would like to visit</span>
              </button>
            </div>
            {pins.filter(p => p.region === selectedRegion).length > 0 && (
              <button
                className="view-impressions-button"
                onClick={() => {
                  setShowPinModal(false);
                  setShowImpressionsModal(true);
                }}
              >
                View All Impressions
              </button>
            )}
            <button className="cancel-button" onClick={handleModalClose}>Cancel</button>
          </div>
        </div>
      )}

      {/* Text Input Modal */}
      {showTextModal && (
        <div className="modal-overlay" onClick={handleModalClose}>
          <div className="modal-content text-modal" onClick={(e) => e.stopPropagation()}>
            <h3>
              {selectedPinType === 'visited'
                ? 'Share your impressions'
                : 'What would you like to see?'}
            </h3>
            <input
              type="text"
              placeholder="Your name (optional)"
              value={currentName}
              onChange={(e) => setCurrentName(e.target.value)}
              className="name-input"
            />
            <textarea
              placeholder={
                selectedPinType === 'visited'
                  ? 'Tell us about your experience in this region...'
                  : 'What places would you like to visit in this region?'
              }
              value={currentText}
              onChange={(e) => setCurrentText(e.target.value)}
              className="text-input"
              rows={6}
            />
            <div className="modal-buttons">
              <button className="cancel-button" onClick={handleModalClose}>Cancel</button>
              <button
                className="submit-button"
                onClick={handleTextSubmit}
                disabled={!currentText.trim()}
              >
                Add Pin
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Impressions Modal */}
      {showImpressionsModal && selectedRegion && (
        <div className="modal-overlay" onClick={handleModalClose}>
          <div className="modal-content impressions-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Impressions for {regionData[selectedRegion]?.text || selectedRegion}</h3>
            <div className="impressions-list">
              {pins
                .filter(pin => pin.region === selectedRegion)
                .map(pin => (
                  <div key={pin.id} className="impression-item">
                    <div className="impression-header">
                      <span className={`pin-badge ${pin.pinType}`}>
                        {pin.pinType === 'visited' ? 'Already been here' : 'Would like to visit'}
                      </span>
                      {pin.name && <span className="impression-author">by {pin.name}</span>}
                    </div>
                    <div className="impression-region">{regionData[pin.region]?.text || pin.region}</div>
                    <div className="impression-text">{pin.text}</div>
                  </div>
                ))}
            </div>
            <button className="cancel-button" onClick={handleModalClose}>Close</button>
          </div>
        </div>
      )}

      {/* Auth Required Modal */}
      {showAuthRequiredModal && (
        <div className="modal-overlay" onClick={handleModalClose}>
          <div className="modal-content auth-required-modal" onClick={(e) => e.stopPropagation()}>
            <div className="auth-required-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 6v6m0 4h.01"/>
              </svg>
            </div>
            <h3>Потрібна реєстрація</h3>
            <p className="auth-required-message">
              Будь ласка, зареєструйтеся, щоб додати свої враження
            </p>
            <div className="modal-buttons">
              <button className="submit-button" onClick={handleRegisterClick}>
                Зареєструватися
              </button>
              <button className="cancel-button" onClick={handleModalClose}>
                Скасувати
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
    </div>
  );
}

export default YourAdventures;
