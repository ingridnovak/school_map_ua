import { useEffect, useRef } from 'react';
import '../App.css';

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

function DiscoveringUkraine() {
  const svgContainerRef = useRef(null);
  const tooltipRef = useRef(null);
  const currentHoveredPath = useRef(null);

  useEffect(() => {
    const loadAndSetupSVG = async () => {
      try {
        const response = await fetch('/ukraine.svg');
        const svgText = await response.text();

        if (svgContainerRef.current) {
          svgContainerRef.current.innerHTML = svgText;

          const svgElement = svgContainerRef.current.querySelector('svg');
          if (!svgElement) return;

          // Cache the CTM and container rect
          let cachedCTM = null;
          let cachedContainerRect = null;

          const updateCache = () => {
            cachedCTM = svgElement.getScreenCTM();
            cachedContainerRect = svgContainerRef.current.getBoundingClientRect();
          };

          updateCache();
          window.addEventListener('resize', updateCache);

          // Pre-calculate and cache bounding boxes for all paths
          const pathCache = new Map();
          const paths = svgElement.querySelectorAll('path[name]');
          paths.forEach(path => {
            const regionName = path.getAttribute('name');
            path.style.cursor = 'pointer';
            path.style.transition = 'fill 0.15s ease, filter 0.15s ease';
            path.style.fill = regionData[regionName]?.color || '#6f9c76';

            // Cache bbox for performance
            pathCache.set(path, path.getBBox());
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

            // Update tooltip position and content using cached values
            if (tooltipRef.current && cachedCTM && cachedContainerRect) {
              const bbox = pathCache.get(path);

              // Calculate the center point of the region
              const point = svgElement.createSVGPoint();
              point.x = bbox.x + bbox.width / 2;
              point.y = bbox.y;

              // Transform to screen coordinates
              const screenPoint = point.matrixTransform(cachedCTM);

              // Set tooltip content first to get its dimensions
              tooltipRef.current.textContent = regionData[regionName]?.text || regionName;
              tooltipRef.current.style.display = 'block';

              // Get tooltip dimensions
              const tooltipRect = tooltipRef.current.getBoundingClientRect();

              // Calculate position relative to container - center horizontally
              const left = screenPoint.x - cachedContainerRect.left - (tooltipRect.width / 2);
              let top = screenPoint.y - cachedContainerRect.top - tooltipRect.height - 15;

              // Check if tooltip would be cut off at the top
              const tooltipTopScreenEdge = screenPoint.y - tooltipRect.height - 15;
              const minVisibleTop = 80; // Account for tabs and padding

              // If tooltip would go above the visible area, position it below instead
              if (tooltipTopScreenEdge < minVisibleTop || top < 0) {
                // Position below the region
                top = screenPoint.y - cachedContainerRect.top + bbox.height + 15;
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
            const region = regionData[regionName];
            alert(`You clicked on: ${region ? region.text : regionName}`);
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
  }, []);

  return (
    <div className="map-container">
      <div
        ref={svgContainerRef}
        className="interactive-svg"
      />
      <div
        ref={tooltipRef}
        className="region-tooltip"
        style={{ display: 'none' }}
      />
    </div>
  );
}

export default DiscoveringUkraine;
