import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import '../App.css';
import './YourAdventures.css';
import AuthModal from './AuthModal';
import regionData from '../data/regionData';
import { loadSVG, debounce, throttle } from '../utils/mapUtils';
import { api } from '../services/api';

// Get the server base URL for images (without /api/v1 path)
const getServerUrl = () => {
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8080/api/v1';
  // Remove /api/v1 suffix to get the base server URL
  return apiUrl.replace(/\/api\/v\d+$/, '');
};

// Helper to get full image URL
const getImageUrl = (imgUrl) => {
  if (!imgUrl) return '';
  // If already a full URL, return as is
  if (imgUrl.startsWith('http://') || imgUrl.startsWith('https://')) {
    return imgUrl;
  }
  // If relative path, prepend server URL
  return `${getServerUrl()}${imgUrl.startsWith('/') ? '' : '/'}${imgUrl}`;
};

// Image compression utility - compresses images before upload
const compressImage = (file, maxWidth = 1200, maxHeight = 1200, quality = 0.7) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        // Calculate new dimensions while maintaining aspect ratio
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to blob with compression
        canvas.toBlob(
          (blob) => {
            if (blob) {
              // Create a data URL for preview
              const compressedReader = new FileReader();
              compressedReader.onload = () => {
                resolve({
                  blob,
                  dataUrl: compressedReader.result,
                  originalSize: file.size,
                  compressedSize: blob.size,
                  name: file.name
                });
              };
              compressedReader.readAsDataURL(blob);
            } else {
              reject(new Error('Failed to compress image'));
            }
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = event.target.result;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

function YourAdventures() {
  const mapContainerRef = useRef(null);
  const svgContainerRef = useRef(null);
  const tooltipRef = useRef(null);
  const svgElementRef = useRef(null);
  const pathCacheRef = useRef(new Map());
  const isLoggedInRef = useRef(false);
  const [svgLoaded, setSvgLoaded] = useState(false);

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
  const [currentImages, setCurrentImages] = useState([]);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingPins, setIsLoadingPins] = useState(false);
  const [regionPinsFromApi, setRegionPinsFromApi] = useState([]);
  const [scrollOffset, setScrollOffset] = useState({ x: 0, y: 0 });
  const fileInputRef = useRef(null);

  // Check if user is logged in and update ref
  useEffect(() => {
    const loggedIn = localStorage.getItem('isLoggedIn') === 'true';
    isLoggedInRef.current = loggedIn;
  }, [showAuthModal]);

  // Load approved pins when SVG is loaded
  useEffect(() => {
    // Only run when SVG is loaded and pathCache is populated
    if (!svgLoaded) return;

    const loadApprovedPins = async () => {
      try {
        const pathCache = pathCacheRef.current;

        // Fetch all approved pins in one call
        const result = await api.getAllApprovedPins();
        const pinsData = result.data?.items || [];

        if (pinsData.length === 0) {
          return;
        }

        // Group pins by region for positioning
        const pinsByRegion = {};
        pinsData.forEach(pin => {
          const regionId = pin.regionId;
          if (!pinsByRegion[regionId]) {
            pinsByRegion[regionId] = [];
          }
          pinsByRegion[regionId].push(pin);
        });

        const allApprovedPins = [];

        Object.entries(pinsByRegion).forEach(([regionId, regionPins]) => {
          regionPins.forEach((pin, index) => {
            let bbox = pathCache.get(regionId);

            // Try to find bbox if not direct match
            if (!bbox) {
              for (const [key, value] of pathCache.entries()) {
                if (key === regionId ||
                    key.toLowerCase().includes(regionId.toLowerCase().replace('ska', '')) ||
                    regionId.toLowerCase().includes(key.toLowerCase().replace('ska', ''))) {
                  bbox = value;
                  break;
                }
              }
            }

            // Calculate position within region
            const pinSpacing = 30;
            const angle = (index * 60) * (Math.PI / 180);
            const offsetX = Math.cos(angle) * pinSpacing;
            const offsetY = Math.sin(angle) * pinSpacing;

            const centerX = bbox ? bbox.x + bbox.width / 2 : 200;
            const centerY = bbox ? bbox.y + bbox.height / 2 : 200;

            allApprovedPins.push({
              ...pin,
              region: regionId,
              pinType: pin.pinType === 'visited' ? 'visited' : 'wantToVisit',
              x: centerX + offsetX,
              y: centerY + offsetY,
              text: pin.description,
              name: pin.userDisplayName || ''
            });
          });
        });

        if (allApprovedPins.length > 0) {
          setPins(prev => {
            const existingIds = new Set(prev.map(p => p.id));
            const newPins = allApprovedPins.filter(p => !existingIds.has(p.id));
            return [...prev, ...newPins];
          });
        }
      } catch (error) {
        console.error('Error loading approved pins:', error);
      }
    };

    loadApprovedPins();
  }, [svgLoaded]);

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

        // Mark SVG as loaded so pins can be fetched
        setSvgLoaded(true);

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
    if (!svgElementRef.current || !mapContainerRef.current || !svgLoaded || pins.length === 0) {
      return [];
    }

    const svgElement = svgElementRef.current;
    const ctm = svgElement.getScreenCTM();
    const mapRect = mapContainerRef.current.getBoundingClientRect();

    if (!mapRect || !ctm) {
      return [];
    }

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
  }, [pins, scrollOffset, svgLoaded]);

  const handlePinSelection = useCallback((pinType) => {
    setSelectedPinType(pinType);
    setShowPinModal(false);
    setShowTextModal(true);
  }, []);

  // Handle image selection and compression
  const handleImageSelect = useCallback(async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // Limit to 5 images max
    const remainingSlots = 5 - currentImages.length;
    const filesToProcess = files.slice(0, remainingSlots);

    if (filesToProcess.length === 0) {
      alert('Максимум 5 зображень');
      return;
    }

    setIsCompressing(true);

    try {
      const compressedImages = await Promise.all(
        filesToProcess.map(file => compressImage(file))
      );
      setCurrentImages(prev => [...prev, ...compressedImages]);
    } catch (error) {
      console.error('Error compressing images:', error);
      alert('Помилка при обробці зображень');
    } finally {
      setIsCompressing(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [currentImages.length]);

  // Remove image from selection
  const handleRemoveImage = useCallback((index) => {
    setCurrentImages(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleTextSubmit = useCallback(async () => {
    if (!currentText.trim()) return;

    setIsSubmitting(true);

    try {
      // Prepare pin data for API
      const pinData = {
        regionId: selectedRegion,
        regionName: regionData[selectedRegion]?.text || selectedRegion,
        pinType: selectedPinType === 'visited' ? 'visited' : 'want_to_visit',
        description: currentText
      };

      // Submit to backend - with or without images
      if (currentImages.length > 0) {
        // Convert compressed blobs to files for upload
        const imageFiles = [];
        for (let i = 0; i < currentImages.length; i++) {
          const img = currentImages[i];
          if (img.blob) {
            const file = new File([img.blob], `image_${i}.jpg`, { type: 'image/jpeg' });
            imageFiles.push(file);
          }
        }
        if (imageFiles.length > 0) {
          await api.createPinWithImages(pinData, imageFiles);
        } else {
          await api.createPin(pinData);
        }
      } else {
        await api.createPin(pinData);
      }

      // Also add to local state for immediate display (optimistic UI)
      const regionPinsCount = pins.filter(p => p.region === selectedRegion).length;
      const pinSpacing = 30;
      const angle = (regionPinsCount * 60) * (Math.PI / 180);
      const offsetX = Math.cos(angle) * pinSpacing;
      const offsetY = Math.sin(angle) * pinSpacing;

      const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');

      const newPin = {
        id: Date.now(),
        region: selectedRegion,
        pinType: selectedPinType,
        text: currentText,
        name: currentName || currentUser.name || '',
        images: currentImages.map(img => ({
          dataUrl: img.dataUrl,
          name: img.name
        })),
        x: clickPosition.x + offsetX,
        y: clickPosition.y + offsetY,
        index: regionPinsCount,
        createdAt: new Date().toISOString(),
        status: 'pending' // New pins are pending until verified
      };

      setPins(prev => [...prev, newPin]);

      // Show success message
      alert('Ваш пін буде видимий після перевірки адміністратором');

      setCurrentText('');
      setCurrentName('');
      setCurrentImages([]);
      setShowTextModal(false);
      setSelectedRegion(null);
      setSelectedPinType(null);
    } catch (error) {
      console.error('Error creating pin:', error);
      alert(error.message || 'Помилка при створенні піна');
    } finally {
      setIsSubmitting(false);
    }
  }, [currentText, currentName, currentImages, pins, selectedRegion, selectedPinType, clickPosition]);

  const handleModalClose = useCallback(() => {
    setShowPinModal(false);
    setShowTextModal(false);
    setShowImpressionsModal(false);
    setShowAuthRequiredModal(false);
    setSelectedRegion(null);
    setSelectedPinType(null);
    setCurrentText('');
    setCurrentName('');
    setCurrentImages([]);
  }, []);

  const handleRegisterClick = useCallback(() => {
    setShowAuthRequiredModal(false);
    setShowAuthModal(true);
  }, []);

  const handleViewImpressions = useCallback(async () => {
    setShowPinModal(false);
    setShowImpressionsModal(true);
    setIsLoadingPins(true);

    try {
      // Load approved pins from the API for this region
      const result = await api.getPinsByRegion(selectedRegion);
      if (result.data?.items) {
        setRegionPinsFromApi(result.data.items);
      }
    } catch (error) {
      console.error('Error loading pins:', error);
    } finally {
      setIsLoadingPins(false);
    }
  }, [selectedRegion]);

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

            {/* Image Upload Section */}
            <div className="image-upload-section">
              <label className="image-upload-label">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  multiple
                  onChange={handleImageSelect}
                  className="image-input-hidden"
                  disabled={isCompressing || currentImages.length >= 5}
                />
                <div className="image-upload-button">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                  </svg>
                  <span>
                    {isCompressing ? 'Обробка...' : `Додати фото (${currentImages.length}/5)`}
                  </span>
                </div>
              </label>

              {/* Image Previews */}
              {currentImages.length > 0 && (
                <div className="image-preview-grid">
                  {currentImages.map((img, index) => (
                    <div key={index} className="image-preview-item">
                      <img src={img.dataUrl} alt={`Preview ${index + 1}`} />
                      <button
                        type="button"
                        className="image-remove-button"
                        onClick={() => handleRemoveImage(index)}
                      >
                        ✕
                      </button>
                      <span className="image-size-info">
                        {Math.round(img.compressedSize / 1024)}KB
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="modal-buttons">
              <button className="cancel-button" onClick={handleModalClose} disabled={isSubmitting}>Скасувати</button>
              <button
                className="submit-button"
                onClick={handleTextSubmit}
                disabled={!currentText.trim() || isCompressing || isSubmitting}
              >
                {isSubmitting ? 'Додавання...' : 'Додати пін'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Impressions Modal */}
      {showImpressionsModal && selectedRegion && (
        <div className="modal-overlay" onClick={handleModalClose}>
          <div className="modal-content impressions-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Враження про {regionData[selectedRegion]?.text || selectedRegion}</h3>
            <div className="impressions-list">
              {isLoadingPins ? (
                <div className="loading-spinner">Завантаження...</div>
              ) : regionPinsFromApi.length > 0 ? (
                regionPinsFromApi.map(pin => (
                  <div key={pin.id} className="impression-item">
                    <div className="impression-header">
                      <span className={`pin-badge ${pin.pinType === 'visited' ? 'visited' : 'wantToVisit'}`}>
                        {pin.pinType === 'visited' ? 'Вже був тут' : 'Хочу відвідати'}
                      </span>
                      {pin.userDisplayName && (
                        <span className="impression-author">
                          від {pin.userDisplayName}
                        </span>
                      )}
                    </div>
                    <div className="impression-text">{pin.description}</div>

                    {/* Display pin images from API */}
                    {pin.images && pin.images.length > 0 && (
                      <div className="impression-images">
                        {pin.images.map((imgUrl, imgIndex) => (
                          <div key={imgIndex} className="impression-image-item">
                            <img src={getImageUrl(imgUrl)} alt={`Фото ${imgIndex + 1}`} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="no-impressions">Поки немає вражень для цього регіону</p>
              )}
            </div>
            <button className="cancel-button" onClick={handleModalClose}>Закрити</button>
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
