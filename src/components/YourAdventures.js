import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import '../App.css';
import './YourAdventures.css';
import AuthModal from './AuthModal';
import regionData from '../data/regionData';
import { loadSVG, debounce, throttle } from '../utils/mapUtils';

function YourAdventures() {
  const mapContainerRef = useRef(null);
  const svgContainerRef = useRef(null);
  const tooltipRef = useRef(null);
  const svgElementRef = useRef(null);
  const pathCacheRef = useRef(new Map());
  const isLoggedInRef = useRef(false);

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
  const [scrollOffset, setScrollOffset] = useState({ x: 0, y: 0 });

  // Check if user is logged in and update ref
  useEffect(() => {
    const loggedIn = localStorage.getItem('isLoggedIn') === 'true';
    isLoggedInRef.current = loggedIn;
  }, [showAuthModal]);

  // SVG setup effect - runs only once on mount
  useEffect(() => {
    let cleanup = null;

    const setupSVG = async () => {
      try {
        const svgText = await loadSVG();

        if (!svgContainerRef.current) return;

        svgContainerRef.current.innerHTML = svgText;

        const svgElement = svgContainerRef.current.querySelector('svg');
        if (!svgElement) return;

        svgElementRef.current = svgElement;

        let cachedCTM = null;
        let cachedMapRect = null;
        const pathCache = pathCacheRef.current;

        const updateCache = () => {
          if (!svgElement || !svgContainerRef.current || !mapContainerRef.current) return;
          cachedCTM = svgElement.getScreenCTM();
          cachedMapRect = mapContainerRef.current.getBoundingClientRect();
        };

        const debouncedUpdateCache = debounce(updateCache, 100);

        updateCache();
        window.addEventListener('resize', debouncedUpdateCache);

        const paths = svgElement.querySelectorAll('path[name]');
        const labels = [];

        paths.forEach(path => {
          const regionName = path.getAttribute('name');
          // Set initial fill color (hover is handled by CSS for better performance)
          path.style.fill = regionData[regionName]?.color || '#6f9c76';

          if (!pathCache.has(regionName)) {
            const bbox = path.getBBox();
            pathCache.set(regionName, bbox);
          }

          const bbox = pathCache.get(regionName);
          labels.push({
            name: regionName,
            text: regionData[regionName]?.text || regionName,
            x: bbox.x + bbox.width / 2,
            y: bbox.y + bbox.height / 2
          });
        });

        const existingLabels = svgElement.querySelectorAll('.region-text-label');
        existingLabels.forEach(label => label.remove());

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

        // Event handlers - CSS handles hover colors, JS only handles tooltip
        const handleMouseOver = (e) => {
          const path = e.target.closest('path[name]');
          if (!path || !tooltipRef.current || !cachedCTM || !cachedMapRect) return;

          const regionName = path.getAttribute('name');
          const bbox = pathCache.get(regionName);

          // Position tooltip
          const point = svgElement.createSVGPoint();
          point.x = bbox.x + bbox.width / 2;
          point.y = bbox.y;
          const screenPoint = point.matrixTransform(cachedCTM);

          tooltipRef.current.textContent = regionData[regionName]?.text || regionName;
          tooltipRef.current.style.display = 'block';

          const tooltipRect = tooltipRef.current.getBoundingClientRect();
          const left = screenPoint.x - cachedMapRect.left - (tooltipRect.width / 2);
          let top = screenPoint.y - cachedMapRect.top - tooltipRect.height - 15;

          if (screenPoint.y - tooltipRect.height - 15 < 80 || top < 0) {
            top = screenPoint.y - cachedMapRect.top + bbox.height + 15;
            tooltipRef.current.classList.add('tooltip-below');
          } else {
            tooltipRef.current.classList.remove('tooltip-below');
          }

          tooltipRef.current.style.left = `${left}px`;
          tooltipRef.current.style.top = `${top}px`;
        };

        const handleMouseOut = (e) => {
          const path = e.target.closest('path[name]');
          if (!path || !tooltipRef.current) return;
          tooltipRef.current.style.display = 'none';
        };

        const handleClick = (e) => {
          const path = e.target.closest('path[name]');
          if (!path) return;

          const regionName = path.getAttribute('name');
          const bbox = pathCache.get(regionName);

          const centerX = bbox.x + bbox.width / 2;
          const centerY = bbox.y + bbox.height / 2;

          setSelectedRegion(regionName);
          setClickPosition({ x: centerX, y: centerY, bbox });

          // Use ref to get current login status (avoids stale closure)
          if (!isLoggedInRef.current) {
            setShowAuthRequiredModal(true);
          } else {
            setShowPinModal(true);
          }
        };

        svgElement.addEventListener('mouseover', handleMouseOver);
        svgElement.addEventListener('mouseout', handleMouseOut);
        svgElement.addEventListener('click', handleClick);

        cleanup = () => {
          svgElement.removeEventListener('mouseover', handleMouseOver);
          svgElement.removeEventListener('mouseout', handleMouseOut);
          svgElement.removeEventListener('click', handleClick);
          window.removeEventListener('resize', debouncedUpdateCache);
        };
      } catch (error) {
        console.error('Error loading SVG:', error);
      }
    };

    setupSVG();

    return () => {
      if (cleanup) cleanup();
    };
  }, []); // Empty dependency - SVG setup runs once

  // Throttled scroll handler for pin positions
  useEffect(() => {
    const mapContainer = mapContainerRef.current;
    if (!mapContainer) return;

    const handleScroll = throttle(() => {
      setScrollOffset({
        x: mapContainer.scrollLeft || 0,
        y: mapContainer.scrollTop || 0
      });
    }, 16); // ~60fps

    mapContainer.addEventListener('scroll', handleScroll);
    return () => {
      mapContainer.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Memoize pin positions to avoid recalculating on every render
  const pinPositions = useMemo(() => {
    if (!svgElementRef.current || !mapContainerRef.current) return [];

    const svgElement = svgElementRef.current;
    const ctm = svgElement.getScreenCTM();
    const mapRect = mapContainerRef.current.getBoundingClientRect();

    if (!mapRect || !ctm) return [];

    return pins.map(pin => {
      const point = svgElement.createSVGPoint();
      point.x = pin.x;
      point.y = pin.y;
      const screenPoint = point.matrixTransform(ctm);

      return {
        ...pin,
        screenX: screenPoint.x - mapRect.left + scrollOffset.x,
        screenY: screenPoint.y - mapRect.top + scrollOffset.y
      };
    });
  }, [pins, scrollOffset]);

  const handlePinSelection = useCallback((pinType) => {
    setSelectedPinType(pinType);
    setShowPinModal(false);
    setShowTextModal(true);
  }, []);

  const handleTextSubmit = useCallback(() => {
    if (!currentText.trim()) return;

    const regionPinsCount = pins.filter(p => p.region === selectedRegion).length;
    const pinSpacing = 30;
    const angle = (regionPinsCount * 60) * (Math.PI / 180);
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

    setPins(prev => [...prev, newPin]);
    setCurrentText('');
    setCurrentName('');
    setShowTextModal(false);
    setSelectedRegion(null);
    setSelectedPinType(null);
  }, [currentText, currentName, pins, selectedRegion, selectedPinType, clickPosition]);

  const handleModalClose = useCallback(() => {
    setShowPinModal(false);
    setShowTextModal(false);
    setShowImpressionsModal(false);
    setShowAuthRequiredModal(false);
    setSelectedRegion(null);
    setSelectedPinType(null);
    setCurrentText('');
    setCurrentName('');
  }, []);

  const handleRegisterClick = useCallback(() => {
    setShowAuthRequiredModal(false);
    setShowAuthModal(true);
  }, []);

  const handleViewImpressions = useCallback(() => {
    setShowPinModal(false);
    setShowImpressionsModal(true);
  }, []);

  // Get pins for selected region (memoized)
  const selectedRegionPins = useMemo(() => {
    return pins.filter(pin => pin.region === selectedRegion);
  }, [pins, selectedRegion]);

  return (
    <div className="map-container" ref={mapContainerRef}>
      <div
        ref={svgContainerRef}
        className="interactive-svg"
      />

      {/* Render pins on the map */}
      {pinPositions.map((pin) => (
        <div
          key={pin.id}
          className="map-pin"
          style={{
            left: `${pin.screenX}px`,
            top: `${pin.screenY}px`,
          }}
        >
          <img
            src={pin.pinType === 'visited' ? '/red-pin.svg' : '/green-pin.svg'}
            alt={`${pin.pinType} pin`}
            className="pin-icon"
          />
        </div>
      ))}

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
            {selectedRegionPins.length > 0 && (
              <button
                className="view-impressions-button"
                onClick={handleViewImpressions}
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
              {selectedRegionPins.map(pin => (
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
