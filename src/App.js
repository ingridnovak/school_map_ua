import { useEffect, useRef } from 'react';
import './App.css';

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

function App() {
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

              // Set tooltip content first to get its dimensions
              tooltipRef.current.textContent = regionData[regionName]?.text || regionName;
              tooltipRef.current.style.display = 'block';

              // Get tooltip dimensions
              const tooltipRect = tooltipRef.current.getBoundingClientRect();

              // Calculate position relative to container - center horizontally, position above
              const left = screenPoint.x - containerRect.left - (tooltipRect.width / 2);
              const top = screenPoint.y - containerRect.top - tooltipRect.height - 15;

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
          };
        }
      } catch (error) {
        console.error('Error loading SVG:', error);
      }
    };

    loadAndSetupSVG();
  }, []);

  return (
    <div className="App">
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
    </div>
  );
}

export default App;
