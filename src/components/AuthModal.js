import { useState } from 'react';
import './AuthModal.css';

function AuthModal({ onClose }) {
  const [activeTab, setActiveTab] = useState('register'); // 'register' or 'login'
  const [registerForm, setRegisterForm] = useState({
    name: '',
    password: '',
    confirmPassword: '',
    gender: ''
  });
  const [loginForm, setLoginForm] = useState({
    name: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Handle registration
  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!registerForm.name || !registerForm.password || !registerForm.confirmPassword || !registerForm.gender) {
      setError('Будь ласка, заповніть усі поля');
      return;
    }

    if (registerForm.password.length < 6) {
      setError('Пароль повинен містити мінімум 6 символів');
      return;
    }

    if (registerForm.password !== registerForm.confirmPassword) {
      setError('Паролі не співпадають');
      return;
    }

    setLoading(true);

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));

    // Mock successful registration (no real API call)
    console.log('Mock registration data:', {
      name: registerForm.name,
      password: registerForm.password,
      gender: registerForm.gender,
    });

    // Save user data to localStorage with avatar number
    const avatarNumber = Math.floor(Math.random() * 10) + 1; // 1-10
    const userData = {
      name: registerForm.name,
      gender: registerForm.gender,
      avatarNumber: avatarNumber,
      registeredAt: new Date().toISOString()
    };
    localStorage.setItem('registeredUser', JSON.stringify(userData));

    // Auto-login user after registration
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('currentUser', JSON.stringify(userData));

    // Simulate successful registration
    setSuccess('Реєстрація успішна! Ласкаво просимо.');
    setRegisterForm({ name: '', password: '', confirmPassword: '', gender: '' });
    setLoading(false);

    // Close modal after 1.5 seconds
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  // Handle login
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!loginForm.name || !loginForm.password) {
      setError('Будь ласка, заповніть усі поля');
      return;
    }

    setLoading(true);

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));

    // Mock successful login (no real API call)
    console.log('Mock login data:', {
      name: loginForm.name,
      password: loginForm.password,
    });

    // Get registered user data from localStorage
    const storedUser = localStorage.getItem('registeredUser');
    if (storedUser) {
      const userData = JSON.parse(storedUser);
      // Mark user as logged in
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('currentUser', JSON.stringify(userData));
    }

    // Simulate successful login
    setSuccess('Вхід успішний! Ласкаво просимо.');
    setLoginForm({ name: '', password: '' });
    setLoading(false);

    // Close modal after 1.5 seconds
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      <div className="auth-modal-container" onClick={(e) => e.stopPropagation()}>
        <button
          className="auth-modal-close"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
        >
          ✕
        </button>

        <div className="auth-modal-tabs">
          <button
            className={`auth-tab ${activeTab === 'register' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('register');
              setError('');
              setSuccess('');
            }}
          >
            Реєстрація
          </button>
          <button
            className={`auth-tab ${activeTab === 'login' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('login');
              setError('');
              setSuccess('');
            }}
          >
            Вхід
          </button>
        </div>

        {error && <div className="auth-message error">{error}</div>}
        {success && <div className="auth-message success">{success}</div>}

        {activeTab === 'register' ? (
          <form className="auth-form" onSubmit={handleRegister}>
            <h2 className="auth-form-title">Створити обліковий запис</h2>

            <div className="auth-input-group">
              <label htmlFor="register-name">Ім'я користувача</label>
              <input
                type="text"
                id="register-name"
                value={registerForm.name}
                onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                placeholder="Введіть ім'я"
                disabled={loading}
              />
            </div>

            <div className="auth-input-group">
              <label htmlFor="register-password">Пароль</label>
              <input
                type="password"
                id="register-password"
                value={registerForm.password}
                onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                placeholder="Мінімум 6 символів"
                disabled={loading}
              />
            </div>

            <div className="auth-input-group">
              <label htmlFor="register-confirm">Підтвердіть пароль</label>
              <input
                type="password"
                id="register-confirm"
                value={registerForm.confirmPassword}
                onChange={(e) => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })}
                placeholder="Введіть пароль ще раз"
                disabled={loading}
              />
            </div>

            <div className="auth-input-group">
              <label>Стать</label>
              <div className="gender-options">
                <label className="gender-option">
                  <input
                    type="radio"
                    name="gender"
                    value="male"
                    checked={registerForm.gender === 'male'}
                    onChange={(e) => setRegisterForm({ ...registerForm, gender: e.target.value })}
                    disabled={loading}
                  />
                  <span>Чоловік</span>
                </label>
                <label className="gender-option">
                  <input
                    type="radio"
                    name="gender"
                    value="female"
                    checked={registerForm.gender === 'female'}
                    onChange={(e) => setRegisterForm({ ...registerForm, gender: e.target.value })}
                    disabled={loading}
                  />
                  <span>Жінка</span>
                </label>
              </div>
            </div>

            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? 'Обробка...' : 'Підтвердити'}
            </button>

            <button
              type="button"
              className="auth-switch-btn"
              onClick={() => {
                setActiveTab('login');
                setError('');
                setSuccess('');
              }}
              disabled={loading}
            >
              Вже є обліковий запис?
            </button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={handleLogin}>
            <h2 className="auth-form-title">Увійти в обліковий запис</h2>

            <div className="auth-input-group">
              <label htmlFor="login-name">Ім'я користувача</label>
              <input
                type="text"
                id="login-name"
                value={loginForm.name}
                onChange={(e) => setLoginForm({ ...loginForm, name: e.target.value })}
                placeholder="Введіть ім'я"
                disabled={loading}
              />
            </div>

            <div className="auth-input-group">
              <label htmlFor="login-password">Пароль</label>
              <input
                type="password"
                id="login-password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                placeholder="Введіть пароль"
                disabled={loading}
              />
            </div>

            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? 'Обробка...' : 'Увійти'}
            </button>

            <button
              type="button"
              className="auth-switch-btn"
              onClick={() => {
                setActiveTab('register');
                setError('');
                setSuccess('');
              }}
              disabled={loading}
            >
              Немає облікового запису?
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default AuthModal;
