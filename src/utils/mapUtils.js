// Map utility functions for performance optimization

// SVG cache - load once, use everywhere
let svgCache = null;
let svgPromise = null;

export const loadSVG = async () => {
  // Return cached SVG if available
  if (svgCache) {
    return svgCache;
  }

  // If already loading, wait for the existing promise
  if (svgPromise) {
    return svgPromise;
  }

  // Start loading and cache the promise
  svgPromise = fetch('/ukraine.svg')
    .then(response => response.text())
    .then(text => {
      svgCache = text;
      return text;
    });

  return svgPromise;
};

// Debounce function for scroll/resize handlers
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Throttle function for more responsive scroll handling
export const throttle = (func, limit) => {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};
