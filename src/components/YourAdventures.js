import { useEffect, useRef, useState } from 'react';
import '../App.css';
import './YourAdventures.css';

// Region data - customize text for each region
const regionData = {
  "Avtonomna Respublika Krym": { text: "Crimea", color: "#6f9c76" },
  "Vinnytska": { text: "Vinnytsia", color: "#6f9c76" },
  "Volynska": { text: "Volyn", color: "#6f9c76" },
  "Dnipropetrovska": { text: "Dnipropetrovsk", color: "#6f9c76" },
  "Donetska": { text: "Donetsk", color: "#6f9c76" },
  "Zhytomyrska": { text: "Zhytomyr", color: "#6f9c76" },
  "Zakarpatska": { text: "Zakarpattia", color: "#6f9c76" },
  "Zaporizka": { text: "Zaporizhzhia", color: "#6f9c76" },
  "Ivano-Frankivska": { text: "Ivano-Frankivsk", color: "#6f9c76" },
  "Kyivska": { text: "Kyiv Oblast", color: "#6f9c76" },
  "Kirovohradska": { text: "Kirovohrad", color: "#6f9c76" },
  "Luhanska": { text: "Luhansk", color: "#6f9c76" },
  "Lvivska": { text: "Lviv", color: "#6f9c76" },
  "Mykolaivska": { text: "Mykolaiv", color: "#6f9c76" },
  "Odeska": { text: "Odesa", color: "#6f9c76" },
  "Poltavska": { text: "Poltava", color: "#6f9c76" },
  "Rivnenska": { text: "Rivne", color: "#6f9c76" },
  "Sumska": { text: "Sumy", color: "#6f9c76" },
  "Ternopilska": { text: "Ternopil", color: "#6f9c76" },
  "Kharkivska": { text: "Kharkiv", color: "#6f9c76" },
  "Khersonska": { text: "Kherson", color: "#6f9c76" },
  "Khmelnytska": { text: "Khmelnytskyi", color: "#6f9c76" },
  "Cherkaska": { text: "Cherkasy", color: "#6f9c76" },
  "Chernivetska": { text: "Chernivtsi", color: "#6f9c76" },
  "Chernihivska": { text: "Chernihiv", color: "#6f9c76" },
  "Sevastopilska": { text: "Sevastopol", color: "#6f9c76" }
};

function YourAdventures() {
  const svgContainerRef = useRef(null);
  const tooltipRef = useRef(null);
  const currentHoveredPath = useRef(null);
  const svgElementRef = useRef(null);

  const [showPinModal, setShowPinModal] = useState(false);
  const [showTextModal, setShowTextModal] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [selectedPinType, setSelectedPinType] = useState(null);
  const [clickPosition, setClickPosition] = useState({ x: 0, y: 0 });
  const [pins, setPins] = useState([]);
  const [currentText, setCurrentText] = useState('');
  const [currentName, setCurrentName] = useState('');
  const [hoveredRegion, setHoveredRegion] = useState(null);

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

          // Style all paths at once
          const paths = svgElement.querySelectorAll('path[name]');
          paths.forEach(path => {
            const regionName = path.getAttribute('name');
            path.style.cursor = 'pointer';
            path.style.transition = 'fill 0.15s ease, filter 0.15s ease';
            path.style.fill = regionData[regionName]?.color || '#6f9c76';
          });

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

            // Set hovered region to show text windows
            setHoveredRegion(regionName);

            // Update tooltip position and content
            if (tooltipRef.current) {
              const bbox = path.getBBox();
              const containerRect = svgContainerRef.current.getBoundingClientRect();

              // Get the CTM (Current Transformation Matrix) for accurate positioning
              const ctm = svgElement.getScreenCTM();

              // Calculate the center point of the region
              const point = svgElement.createSVGPoint();
              point.x = bbox.x + bbox.width / 2;
              point.y = bbox.y;

              // Transform to screen coordinates
              const screenPoint = point.matrixTransform(ctm);

              // Set tooltip content to just the region name
              tooltipRef.current.textContent = regionData[regionName]?.text || regionName;
              tooltipRef.current.style.display = 'block';
              tooltipRef.current.style.whiteSpace = 'nowrap';

              // Get tooltip dimensions
              const tooltipRect = tooltipRef.current.getBoundingClientRect();

              // Calculate position relative to container - center horizontally
              const left = screenPoint.x - containerRect.left - (tooltipRect.width / 2);
              let top = screenPoint.y - containerRect.top - tooltipRect.height - 15;

              // Check if tooltip would be cut off at the top
              // Consider both the screen position and the container position
              const tooltipTopScreenEdge = screenPoint.y - tooltipRect.height - 15;
              const minVisibleTop = 80; // Account for tabs and padding

              // If tooltip would go above the visible area, position it below instead
              if (tooltipTopScreenEdge < minVisibleTop || top < 0) {
                // Position below the region
                top = screenPoint.y - containerRect.top + bbox.height + 15;
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

            // Hide hovered region state
            setHoveredRegion(null);

            // Hide tooltip
            if (tooltipRef.current) {
              tooltipRef.current.style.display = 'none';
            }
          };

          const handleClick = (e) => {
            const path = e.target.closest('path[name]');
            if (!path) return;

            const regionName = path.getAttribute('name');
            const bbox = path.getBBox();

            // Get click position in SVG coordinates
            const pt = svgElement.createSVGPoint();
            pt.x = e.clientX;
            pt.y = e.clientY;

            // Transform client coordinates to SVG coordinate space
            const svgP = pt.matrixTransform(svgElement.getScreenCTM().inverse());

            // Always use the exact click position (it's already validated by the path click event)
            setSelectedRegion(regionName);
            setClickPosition({ x: svgP.x, y: svgP.y, bbox });
            setShowPinModal(true);
          };

          svgElement.addEventListener('mouseover', handleMouseOver);
          svgElement.addEventListener('mouseout', handleMouseOut);
          svgElement.addEventListener('click', handleClick);

          // Cleanup
          return () => {
            svgElement.removeEventListener('mouseover', handleMouseOver);
            svgElement.removeEventListener('mouseout', handleMouseOut);
            svgElement.removeEventListener('click', handleClick);
          };
        }
      } catch (error) {
        console.error('Error loading SVG:', error);
      }
    };

    loadAndSetupSVG();
  }, [pins]);

  const handlePinSelection = (pinType) => {
    setSelectedPinType(pinType);
    setShowPinModal(false);
    setShowTextModal(true);
  };

  const handleTextSubmit = () => {
    if (!currentText.trim()) return;

    // Calculate random position within the region bbox
    const regionPinsCount = pins.filter(p => p.region === selectedRegion).length;

    const newPin = {
      id: Date.now(),
      region: selectedRegion,
      pinType: selectedPinType,
      text: currentText,
      name: currentName,
      x: clickPosition.x,
      y: clickPosition.y,
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
    setSelectedRegion(null);
    setSelectedPinType(null);
    setCurrentText('');
    setCurrentName('');
  };

  return (
    <div className="map-container">
      <div
        ref={svgContainerRef}
        className="interactive-svg"
      />

      {/* Render pins on the map */}
      {pins.map((pin) => {
        if (!svgElementRef.current) return null;

        const svgElement = svgElementRef.current;
        const ctm = svgElement.getScreenCTM();
        const containerRect = svgContainerRef.current?.getBoundingClientRect();

        if (!containerRect || !ctm) return null;

        const point = svgElement.createSVGPoint();
        point.x = pin.x;
        point.y = pin.y;
        const screenPoint = point.matrixTransform(ctm);

        return (
          <div
            key={pin.id}
            className="map-pin"
            style={{
              left: `${screenPoint.x - containerRect.left}px`,
              top: `${screenPoint.y - containerRect.top}px`,
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

      {/* Text cards for each pin - only show for hovered region */}
      {pins.map((pin) => {
        if (!svgElementRef.current) return null;
        if (hoveredRegion !== pin.region) return null;

        const svgElement = svgElementRef.current;
        const path = svgElement.querySelector(`path[name="${pin.region}"]`);
        if (!path) return null;

        const containerRect = svgContainerRef.current?.getBoundingClientRect();
        const ctm = svgElement.getScreenCTM();

        if (!containerRect || !ctm) return null;

        // Distribute cards around all sides of the region evenly
        // Calculate how many cards should go on each side
        const regionPins = pins.filter(p => p.region === pin.region);
        const totalCards = regionPins.length;

        // Distribute proportionally: top/bottom get slightly more, left/right get fewer
        const cardsTop = Math.ceil(totalCards * 0.3);
        const cardsBottom = Math.ceil(totalCards * 0.3);
        const cardsLeft = Math.floor(totalCards * 0.2);
        const cardsRight = totalCards - cardsTop - cardsBottom - cardsLeft;

        const cardSpacing = 120; // Increased spacing to prevent overlaps

        // Determine which side this card goes on and its position
        let side, positionInSide;
        if (pin.index < cardsTop) {
          side = 'top';
          positionInSide = pin.index;
        } else if (pin.index < cardsTop + cardsRight) {
          side = 'right';
          positionInSide = pin.index - cardsTop;
        } else if (pin.index < cardsTop + cardsRight + cardsBottom) {
          side = 'bottom';
          positionInSide = pin.index - cardsTop - cardsRight;
        } else {
          side = 'left';
          positionInSide = pin.index - cardsTop - cardsRight - cardsBottom;
        }

        const cardPoint = svgElement.createSVGPoint();
        const arrowStartPoint = svgElement.createSVGPoint();

        // Arrow should start from the pin position, not bbox edges
        arrowStartPoint.x = pin.x;
        arrowStartPoint.y = pin.y;

        // Calculate card position based on side, offset from pin location
        switch(side) {
          case 'right':
            cardPoint.x = pin.x + 50;
            cardPoint.y = pin.y + (positionInSide * cardSpacing) - 40;
            break;
          case 'left':
            cardPoint.x = pin.x - 270; // Card width ~250px + margin
            cardPoint.y = pin.y + (positionInSide * cardSpacing) - 40;
            break;
          case 'bottom':
            cardPoint.x = pin.x + (positionInSide * 270) - 125;
            cardPoint.y = pin.y + 50;
            break;
          case 'top':
            cardPoint.x = pin.x + (positionInSide * 270) - 125;
            cardPoint.y = pin.y - 110; // Card height ~90px + margin
            break;
          default:
            cardPoint.x = pin.x + 50;
            cardPoint.y = pin.y + (positionInSide * cardSpacing) - 40;
        }

        const cardScreenPoint = cardPoint.matrixTransform(ctm);
        const arrowStart = arrowStartPoint.matrixTransform(ctm);

        // Arrow end point (at card) - adjust based on side
        let arrowEndOffset = { x: 0, y: 40 };
        if (side === 'left') {
          arrowEndOffset = { x: 250, y: 40 }; // Point to right edge of card
        } else if (side === 'bottom') {
          arrowEndOffset = { x: 125, y: 0 }; // Point to top center of card
        } else if (side === 'top') {
          arrowEndOffset = { x: 125, y: 90 }; // Point to bottom center of card
        }

        const arrowEnd = {
          x: cardScreenPoint.x - containerRect.left + arrowEndOffset.x,
          y: cardScreenPoint.y - containerRect.top + arrowEndOffset.y
        };

        return (
          <div key={`card-${pin.id}`}>
            {/* Arrow connecting region to card */}
            <svg
              className="adventure-arrow"
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 1900
              }}
            >
              <defs>
                <marker
                  id={`arrowhead-${pin.id}`}
                  markerWidth="10"
                  markerHeight="10"
                  refX="9"
                  refY="3"
                  orient="auto"
                >
                  <polygon
                    points="0 0, 10 3, 0 6"
                    fill={pin.pinType === 'visited' ? '#c62828' : '#2e7d32'}
                  />
                </marker>
              </defs>
              <line
                x1={arrowStart.x - containerRect.left}
                y1={arrowStart.y - containerRect.top}
                x2={arrowEnd.x}
                y2={arrowEnd.y}
                stroke={pin.pinType === 'visited' ? '#c62828' : '#2e7d32'}
                strokeWidth="2"
                markerEnd={`url(#arrowhead-${pin.id})`}
                opacity="0.6"
              />
            </svg>

            {/* Adventure card */}
            <div
              className="adventure-card"
              style={{
                left: `${cardScreenPoint.x - containerRect.left}px`,
                top: `${cardScreenPoint.y - containerRect.top}px`,
              }}
            >
              <div className="adventure-card-header">
                <span className={`pin-badge ${pin.pinType}`}>
                  {pin.pinType === 'visited' ? 'Visited' : 'Want to Visit'}
                </span>
                <span className="region-name">{regionData[pin.region]?.text || pin.region}</span>
                {pin.name && <span className="adventure-name">{pin.name}</span>}
              </div>
              <div className="adventure-text">{pin.text}</div>
            </div>
          </div>
        );
      })}

      <div
        ref={tooltipRef}
        className="region-tooltip"
        style={{ display: 'none' }}
      />

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
    </div>
  );
}

export default YourAdventures;
