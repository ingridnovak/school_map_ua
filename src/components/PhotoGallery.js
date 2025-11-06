import { useState, useEffect } from 'react';
import './PhotoGallery.css';

const photos = [
  {
    src: '/carousel/cote-arms-ukrainian-flag.jpg',
    alt: 'Coat of Arms and Ukrainian Flag'
  },
  {
    src: '/carousel/emotions-expression-ornament-relationship-flowers.jpg',
    alt: 'Traditional Ukrainian Embroidery and Flowers'
  },
  {
    src: '/carousel/mother-motherland-monument-sunset-kiev-ukraine.jpg',
    alt: 'Mother Motherland Monument at Sunset in Kyiv'
  },
  {
    src: '/carousel/person-holding-ukrainian-flag.jpg',
    alt: 'Person Holding Ukrainian Flag'
  },
  {
    src: '/carousel/woman-wearing-traditional-ukrainian-vyshyvanka.jpg',
    alt: 'Woman Wearing Traditional Ukrainian Vyshyvanka'
  },
  {
    src: '/carousel/woman-with-national-flags-ukraine-her-cheeks.jpg',
    alt: 'Woman with Ukrainian Flag on Her Cheeks'
  }
];

function PhotoGallery() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Auto-play functionality
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % photos.length);
    }, 4000); // Change image every 4 seconds

    return () => clearInterval(interval);
  }, [isPaused]);

  const nextSlide = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % photos.length);
    setIsPaused(true);
    setTimeout(() => setIsPaused(false), 8000); // Resume auto-play after 8 seconds
  };

  const prevSlide = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === 0 ? photos.length - 1 : prevIndex - 1
    );
    setIsPaused(true);
    setTimeout(() => setIsPaused(false), 8000); // Resume auto-play after 8 seconds
  };

  const goToSlide = (index) => {
    setCurrentIndex(index);
    setIsPaused(true);
    setTimeout(() => setIsPaused(false), 8000); // Resume auto-play after 8 seconds
  };

  return (
    <div className="gallery-section">
      <div className="gallery-container">
        <h2 className="gallery-title">Photo Gallery</h2>

        <div className="carousel">
          <button
            className="carousel-button prev"
            onClick={prevSlide}
            aria-label="Previous photo"
          >
            &#10094;
          </button>

          <div className="carousel-content">
            <img
              src={photos[currentIndex].src}
              alt={photos[currentIndex].alt}
              className="carousel-image"
            />
          </div>

          <button
            className="carousel-button next"
            onClick={nextSlide}
            aria-label="Next photo"
          >
            &#10095;
          </button>
        </div>

        <div className="carousel-dots">
          {photos.map((_, index) => (
            <button
              key={index}
              className={`dot ${index === currentIndex ? 'active' : ''}`}
              onClick={() => goToSlide(index)}
              aria-label={`Go to photo ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default PhotoGallery;
