import { useEffect, useRef, useState, useCallback } from 'react';
import '../App.css';
import RegionModal from './RegionModal';
import AuthModal from './AuthModal';
import regionData from '../data/regionData';
import { loadSVG, debounce } from '../utils/mapUtils';

function DiscoveringUkraine() {
  const mapContainerRef = useRef(null);
  const svgContainerRef = useRef(null);
  const tooltipRef = useRef(null);
  const pathCacheRef = useRef(new Map());
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Memoize handlers to prevent recreation on every render
  const handleRegionSelect = useCallback((regionName) => {
    setSelectedRegion(regionName);
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedRegion(null);
  }, []);

  const handleOpenAuth = useCallback(() => {
    setShowAuthModal(true);
  }, []);

  const handleCloseAuth = useCallback(() => {
    setShowAuthModal(false);
  }, []);

  useEffect(() => {
    let cleanup = null;

    const setupSVG = async () => {
      try {
        // Use cached SVG
        const svgText = await loadSVG();

        if (!svgContainerRef.current) return;

        svgContainerRef.current.innerHTML = svgText;

        const svgElement = svgContainerRef.current.querySelector('svg');
        if (!svgElement) return;

        // Cache values that don't change frequently
        let cachedCTM = null;
        let cachedMapRect = null;
        const pathCache = pathCacheRef.current;

        const updateCache = () => {
          if (!svgElement || !svgContainerRef.current || !mapContainerRef.current) return;
          cachedCTM = svgElement.getScreenCTM();
          cachedMapRect = mapContainerRef.current.getBoundingClientRect();
        };

        // Debounce resize handler for better performance
        const debouncedUpdateCache = debounce(updateCache, 100);

        updateCache();
        window.addEventListener('resize', debouncedUpdateCache);

        // Pre-calculate bounding boxes once
        const paths = svgElement.querySelectorAll('path[name]');
        const labels = [];

        paths.forEach(path => {
          const regionName = path.getAttribute('name');
          // Set initial fill color (hover is handled by CSS for better performance)
          path.style.fill = regionData[regionName]?.color || '#6f9c76';

          // Cache bbox only if not already cached
          if (!pathCache.has(path)) {
            const bbox = path.getBBox();
            pathCache.set(path, bbox);
          }

          const bbox = pathCache.get(path);
          labels.push({
            name: regionName,
            text: regionData[regionName]?.text || regionName,
            x: bbox.x + bbox.width / 2,
            y: bbox.y + bbox.height / 2
          });
        });

        // Add text labels
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
          const bbox = pathCache.get(path);

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
          handleRegionSelect(regionName);
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
  }, [handleRegionSelect]);

  return (
    <div className="map-container" ref={mapContainerRef}>
      <div
        ref={svgContainerRef}
        className="interactive-svg"
      />

      <div
        ref={tooltipRef}
        className="region-tooltip"
        style={{ display: 'none' }}
      />

      <div className="scroll-hint">
        👆 Swipe to explore the map
      </div>

      {selectedRegion && (
        <RegionModal
          regionKey={selectedRegion}
          onClose={handleCloseModal}
          onOpenAuth={handleOpenAuth}
        />
      )}

      {showAuthModal && <AuthModal onClose={handleCloseAuth} />}
    </div>
  );
}

export default DiscoveringUkraine;
