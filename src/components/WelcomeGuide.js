import { useState } from "react";
import "./WelcomeGuide.css";

const slides = [
  {
    id: 1,
    title: "Ласкаво просимо!",
    icon: "👋",
    content: (
      <>
        <p>
          Перш за все, вам потрібно <strong>зареєструватися</strong> на нашому
          сайті.
        </p>
        <p>
          Без реєстрації ви не зможете проходити тести, додавати піни на карту
          або отримати сертифікат.
        </p>
        <p>
          Для реєстрації натисніть кнопку <strong>«Увійти / Реєстрація»</strong>{" "}
          у верхній частині екрану та заповніть необхідні поля.
        </p>
      </>
    ),
    imagePlaceholder: "/guide/registration.png",
  },
  {
    id: 2,
    title: "Типи користувачів",
    icon: "👥",
    content: (
      <>
        <p>При реєстрації оберіть свій тип користувача:</p>
        <ul>
          <li>
            <strong>Учень</strong> — для школярів, які хочуть вивчати Україну та
            проходити тести
          </li>
          <li>
            <strong>Вчитель</strong> — для вчителів школи які теж хочуть
            перевірити себе та підтримати Збройні Сили України
          </li>
          <li>
            <strong>Гість</strong> — для всіх бажаючих долучитися до проєкту
          </li>
        </ul>
      </>
    ),
    imagePlaceholder: "/guide/roles.png",
  },
  {
    id: 3,
    title: "Досліджуємо Україну",
    icon: "🗺️",
    content: (
      <>
        <p>
          На вкладці <strong>«Досліджуючи Україну»</strong> ви побачите
          інтерактивну карту нашої країни.
        </p>
        <p>
          <strong>Натисніть на будь-яку область</strong>, щоб:
        </p>
        <ul>
          <li>Дізнатися цікаву інформацію про регіон</li>
          <li>Пройти тест на знання області</li>
          <li>Зробити благодійний внесок на підтримку ЗСУ</li>
        </ul>
      </>
    ),
    imagePlaceholder: "/guide/map1.png",
  },
  {
    id: 4,
    title: "Тести та сертифікат",
    icon: "🏆",
    content: (
      <>
        <p>
          Проходьте тести для кожної області України та перевіряйте свої знання!
        </p>
        <p className="highlight-box">
          <strong>Важливо:</strong> Якщо ви успішно пройдете{" "}
          <strong>тести </strong> та зробите <strong>благодійний внесок</strong>{" "}
          — ви отримаєте персональний
          <strong> сертифікат</strong>!
        </p>
        <p>Сертифікат можна завантажити та роздрукувати.</p>
      </>
    ),
    imagePlaceholder: "/guide/tests.png",
  },
  {
    id: 5,
    title: "Подорожуємо Україною",
    icon: "📍",
    content: (
      <>
        <p>
          На вкладці <strong>«Подорожуємо Україною»</strong> ви можете створити
          власну карту подорожей Україною!
        </p>
        <p>
          <strong>Натисніть на будь-яку область</strong>, щоб:
        </p>
        <ul>
          <li>Додати пін «Був тут» або «Хочу відвідати»</li>
          <li>Написати опис своєї подорожі чи мрії</li>
          <li>Прикріпити фотографії з ваших пригод</li>
        </ul>
        <p>Діліться своїми враженнями та надихайте інших!</p>
      </>
    ),
    imagePlaceholder: "/guide/pins.png",
  },
  {
    id: 6,
    title: "Вихід з акаунту",
    icon: "👤",
    content: (
      <>
        <p>
          Щоб вийти з облікового запису, просто{" "}
          <strong>натисніть на своє ім'я</strong> у верхньому правому куті
          екрану та підтвердіть вихід.
        </p>
        <p className="highlight-box warning">
          <strong>Не забудьте свій пароль!</strong> Він знадобиться вам для
          повторного входу на сайт.
        </p>
        <p>Ви завжди можете повернутися та продовжити свою подорож Україною!</p>
      </>
    ),
    imagePlaceholder: "/guide/logout.png",
  },
];

function WelcomeGuide({ onClose }) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      handleFinish();
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const handleFinish = () => {
    localStorage.setItem("welcomeGuideCompleted", "true");
    onClose();
  };

  const handleSkip = () => {
    localStorage.setItem("welcomeGuideCompleted", "true");
    onClose();
  };

  const slide = slides[currentSlide];

  return (
    <div className="welcome-guide-overlay">
      <div className="welcome-guide-modal">
        <button className="welcome-guide-skip" onClick={handleSkip}>
          Пропустити
        </button>

        <div className="welcome-guide-progress">
          {slides.map((_, index) => (
            <div
              key={index}
              className={`welcome-guide-dot ${
                index === currentSlide ? "active" : ""
              } ${index < currentSlide ? "completed" : ""}`}
              onClick={() => setCurrentSlide(index)}
            />
          ))}
        </div>

        <div className="welcome-guide-content">
          <div className="welcome-guide-icon">{slide.icon}</div>
          <h2 className="welcome-guide-title">{slide.title}</h2>
          <div className="welcome-guide-step">
            Крок {currentSlide + 1} з {slides.length}
          </div>

          <div className="welcome-guide-text">{slide.content}</div>

          {slide.imagePlaceholder.startsWith("/") ? (
            <div className="welcome-guide-image">
              <img
                src={slide.imagePlaceholder}
                alt={slide.title}
                onError={(e) => {
                  e.target.style.display = "none";
                  e.target.parentElement.innerHTML = `
                    <div class="welcome-guide-image-placeholder">
                      <div class="welcome-guide-image-icon">🖼️</div>
                      <span>Зображення не знайдено</span>
                    </div>
                  `;
                }}
              />
            </div>
          ) : (
            <div className="welcome-guide-image-placeholder">
              <div className="welcome-guide-image-icon">🖼️</div>
              <span>{slide.imagePlaceholder}</span>
            </div>
          )}
        </div>

        <div className="welcome-guide-navigation">
          <button
            className="welcome-guide-btn prev"
            onClick={handlePrev}
            disabled={currentSlide === 0}
          >
            ← Назад
          </button>

          <button className="welcome-guide-btn next" onClick={handleNext}>
            {currentSlide === slides.length - 1 ? "Розпочати! 🚀" : "Далі →"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default WelcomeGuide;
