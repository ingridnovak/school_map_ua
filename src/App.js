import { useState, useEffect } from 'react';
import './App.css';
import DiscoveringUkraine from './components/DiscoveringUkraine';
import YourAdventures from './components/YourAdventures';
import PhotoGallery from './components/PhotoGallery';
import AboutSection from './components/AboutSection';
import AuthModal from './components/AuthModal';
import ConfirmModal from './components/ConfirmModal';
import { api, clearAuthData } from './services/api';

function App() {
  const [activeTab, setActiveTab] = useState('discovering');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [userAvatar, setUserAvatar] = useState(null);
  const [hasCertificate, setHasCertificate] = useState(false);
  const [certificateUrl, setCertificateUrl] = useState(null);

  // Load user data from localStorage (immediate update)
  const loadUserFromStorage = () => {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const userData = localStorage.getItem('currentUser');

    if (isLoggedIn && userData) {
      const user = JSON.parse(userData);
      setCurrentUser(user);

      // Use saved avatar number
      const avatarNumber = user.avatarNumber || 1;
      const avatarPath = user.gender === 'male'
        ? `/male-svg/${avatarNumber}.svg`
        : `/female-svg/${avatarNumber}.svg`;
      setUserAvatar(avatarPath);

      // Check if user has certificate from cached data
      setHasCertificate(user.hasCertificate || false);
      setCertificateUrl(user.certificateUrl || null);

      return true;
    } else {
      setCurrentUser(null);
      setUserAvatar(null);
      setHasCertificate(false);
      setCertificateUrl(null);
      return false;
    }
  };

  // Check if user is logged in and verify token on component mount
  useEffect(() => {
    const verifyAndLoadUser = async () => {
      const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
      const token = localStorage.getItem('token');

      // First, load from localStorage immediately for instant UI update
      const hasUser = loadUserFromStorage();

      // Then verify with backend (in background)
      if (isLoggedIn && token && hasUser) {
        try {
          const result = await api.verifyToken();
          if (!result.data?.valid) {
            // Token invalid - clear auth data
            clearAuthData();
            setCurrentUser(null);
            setUserAvatar(null);
            setHasCertificate(false);
            setCertificateUrl(null);
            return;
          }

          // Check certificate eligibility from backend
          try {
            const eligibility = await api.checkCertificateEligibility();
            if (eligibility.data?.isEligible) {
              setHasCertificate(true);
            }
          } catch (error) {
            console.error('Error checking certificate eligibility:', error);
          }
        } catch (error) {
          console.error('Token verification failed:', error);
          // On error, keep using cached data (already loaded above)
        }
      }
    };

    verifyAndLoadUser();
  }, [showAuthModal]); // Re-check when auth modal closes

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const handleLogoutConfirm = () => {
    clearAuthData();
    setCurrentUser(null);
    setUserAvatar(null);
    setHasCertificate(false);
    setCertificateUrl(null);
    setShowLogoutConfirm(false);
  };

  const handleLogoutCancel = () => {
    setShowLogoutConfirm(false);
  };

  return (
    <div className="App">
      <div className="user-section">
        {currentUser ? (
          <>
            <div className="user-info" onClick={handleLogoutClick} title="Натисніть, щоб вийти">
              <img
                src={userAvatar}
                alt="User avatar"
                className="user-avatar"
                onError={(e) => {
                  e.target.src = '/user-not.svg';
                }}
              />
              <span className="user-name">{currentUser.name}</span>
            </div>
            {hasCertificate && (
              <button
                className="certificate-button"
                onClick={() => setShowCertificateModal(true)}
                title="Переглянути мій сертифікат"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10 9 9 9 8 9"/>
                </svg>
                Сертифікат
              </button>
            )}
          </>
        ) : (
          <div className="user-info">
            <img
              src="/user-not.svg"
              alt="Not logged in"
              className="user-avatar"
            />
            <span className="user-name">User</span>
          </div>
        )}
      </div>

      <div className="tabs-container">
        <button
          className={`tab-button ${activeTab === 'discovering' ? 'active' : ''}`}
          onClick={() => setActiveTab('discovering')}
        >
          Discovering Ukraine
        </button>
        <button
          className={`tab-button ${activeTab === 'adventures' ? 'active' : ''}`}
          onClick={() => setActiveTab('adventures')}
        >
          Your Adventures
        </button>
        {!currentUser && (
          <button
            className="tab-button auth-button"
            onClick={() => setShowAuthModal(true)}
          >
            Увійти / Реєстрація
          </button>
        )}
      </div>

      {activeTab === 'discovering' ? <DiscoveringUkraine /> : <YourAdventures />}

      <PhotoGallery />

      <AboutSection />

      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}

      <ConfirmModal
        isOpen={showLogoutConfirm}
        onConfirm={handleLogoutConfirm}
        onCancel={handleLogoutCancel}
        title="Вийти з облікового запису?"
        message="Ви впевнені, що хочете вийти? Вам потрібно буде увійти знову, щоб отримати доступ до свого профілю."
      />

      {showCertificateModal && (
        <div className="certificate-modal-overlay" onClick={() => setShowCertificateModal(false)}>
          <div className="certificate-modal-container" onClick={(e) => e.stopPropagation()}>
            <button
              className="certificate-modal-close"
              onClick={() => setShowCertificateModal(false)}
            >
              ✕
            </button>
            <div className="certificate-modal-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <circle cx="12" cy="18" r="2"/>
                <path d="M12 15v-3"/>
              </svg>
            </div>
            <h2 className="certificate-modal-title">Мій Сертифікат</h2>
            <p className="certificate-modal-message">
              Вітаємо! Ви отримали сертифікат за проходження всіх тестів.
            </p>
            {certificateUrl ? (
              <div className="certificate-preview">
                <iframe
                  src={certificateUrl}
                  title="Certificate Preview"
                  className="certificate-iframe"
                />
              </div>
            ) : (
              <p className="certificate-placeholder">Сертифікат буде доступний після інтеграції з backend</p>
            )}
            <div className="certificate-modal-buttons">
              {certificateUrl && (
                <a
                  href={certificateUrl}
                  download
                  className="certificate-download-btn"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Завантажити сертифікат
                </a>
              )}
              <button
                className="certificate-close-btn"
                onClick={() => setShowCertificateModal(false)}
              >
                Закрити
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
