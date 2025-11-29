import { useState, useEffect } from "react";
import confetti from "canvas-confetti";
import "./RegionModal.css";
import regionsData from "../data/regionsData.json";
import { api } from "../services/api";

function RegionModal({ regionKey, onClose, onOpenAuth }) {
  const [modalState, setModalState] = useState("info"); // 'info', 'test', 'qr', 'auth-required'
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [testResults, setTestResults] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [donationStatus, setDonationStatus] = useState("idle"); // 'idle', 'checking', 'verified', 'pending'
  const [testsAlreadyPassed, setTestsAlreadyPassed] = useState(null); // null = loading, true/false = result

  const regionData = regionsData[regionKey];

  // Check if user is logged in on mount
  useEffect(() => {
    const loggedIn = localStorage.getItem("isLoggedIn") === "true";
    setIsLoggedIn(loggedIn);
  }, []);

  // Check if tests were already passed (only for logged in users)
  useEffect(() => {
    if (isLoggedIn) {
      api.getPassedRegions()
        .then((result) => {
          const passedRegions = result.data?.passedRegions || [];
          setTestsAlreadyPassed(passedRegions.includes(regionKey));
        })
        .catch((error) => {
          console.error("Error checking passed regions:", error);
          setTestsAlreadyPassed(false);
        });
    } else {
      setTestsAlreadyPassed(false);
    }
  }, [regionKey, isLoggedIn]);

  // Check donation status when user passes test with 100%
  useEffect(() => {
    if (
      testResults &&
      testResults.percentage === 100 &&
      donationStatus === "idle"
    ) {
      setDonationStatus("checking");
      api.getDonationStatus()
        .then((result) => {
          if (result.data?.hasDonated && result.data?.status === "verified") {
            setDonationStatus("verified");
          } else {
            setDonationStatus("pending");
          }
        })
        .catch((error) => {
          console.error("Error checking donation status:", error);
          setDonationStatus("pending");
        });
    }
  }, [testResults, donationStatus]);

  if (!regionData) {
    return null;
  }

  const handleDetailsClick = () => {
    window.open(regionData.detailsLink, "_blank");
  };

  const handleTestClick = () => {
    // Check localStorage directly to avoid race conditions with state
    const loggedIn = localStorage.getItem("isLoggedIn") === "true";
    if (!loggedIn) {
      setModalState("auth-required");
      return;
    }
    setModalState("test");
    setSelectedAnswers({});
    setTestResults(null);
    setDonationStatus("idle");
  };

  const handleRegisterClick = () => {
    onClose();
    if (onOpenAuth) {
      onOpenAuth();
    }
  };

  const handleDonateClick = () => {
    setModalState("qr");
  };

  const handleAnswerSelect = (questionIndex, answerIndex) => {
    setSelectedAnswers({
      ...selectedAnswers,
      [questionIndex]: answerIndex,
    });
  };

  const handleTestSubmit = async () => {
    let correct = 0;
    regionData.tests.forEach((test, index) => {
      if (selectedAnswers[index] === test.correctAnswer) {
        correct++;
      }
    });
    const percentage = Math.round((correct / regionData.tests.length) * 100);

    setTestResults({
      correct,
      total: regionData.tests.length,
      percentage,
    });

    // Trigger confetti for perfect score
    if (percentage === 100) {
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        zIndex: 4000,
      });

      // Submit perfect score to backend
      try {
        await api.submitTest({
          regionId: regionKey,
          regionName: regionData.name,
          score: correct,
          totalQuestions: regionData.tests.length
        });
      } catch (error) {
        console.error("Error submitting test result:", error);
      }
    }
  };

  const handleBackToInfo = () => {
    setModalState("info");
    setSelectedAnswers({});
    setTestResults(null);
  };

  const renderInfoContent = () => (
    <div className="region-modal-content">
      <div className="region-modal-title-wrapper">
        <img
          src="/icons/flag.svg"
          alt="Ukraine flag"
          className="region-title-icon flag-icon"
        />
        <h2 className="region-modal-title">{regionData.name}</h2>
        <img
          src="/icons/trident.png"
          alt="Ukraine trident"
          className="region-title-icon trident-icon"
        />
      </div>
      <p className="region-modal-description">{regionData.description}</p>

      {testsAlreadyPassed && (
        <div className="tests-passed-banner">
          <div className="tests-passed-icon">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#4ade80"
              strokeWidth="2.5"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M8 12l3 3 5-6" />
            </svg>
          </div>
          <div className="tests-passed-content">
            <p className="tests-passed-text">
              Ти вже пройшов тести по цьому регіону успішно!
            </p>
            <p className="tests-passed-suggestion">
              Можливо, хочеш спробувати сили в іншому регіоні? Обирай будь-який!
            </p>
          </div>
        </div>
      )}

      <div className="region-modal-buttons">
        <button
          className="region-modal-btn primary"
          onClick={handleDetailsClick}
        >
          Детальніше про цю область
        </button>
        {!testsAlreadyPassed && (
          <button
            className="region-modal-btn primary"
            onClick={handleTestClick}
          >
            Тести: Перевір себе
          </button>
        )}
        <button
          className="region-modal-btn primary"
          onClick={handleDonateClick}
        >
          Задонатити на армію
        </button>
        <button className="region-modal-btn cancel" onClick={onClose}>
          Відміна
        </button>
      </div>
    </div>
  );

  const renderTestContent = () => (
    <div className="region-modal-content test-content">
      <div className="region-modal-title-wrapper">
        <img src="/icons/ideas.png" alt="Ideas" className="region-title-icon" />
        <h2 className="region-modal-title">Тести: {regionData.name}</h2>
        <img src="/icons/exam.png" alt="Exam" className="region-title-icon" />
      </div>

      {testResults ? (
        <div className="test-results">
          <h3 className="results-title">Результати тестування</h3>
          <div className="results-score">
            <span className="score-number">{testResults.correct}</span>
            <span className="score-separator">/</span>
            <span className="score-total">{testResults.total}</span>
          </div>
          <div className="results-percentage">
            {testResults.percentage}% правильних відповідей
          </div>
          <div className="results-message">
            {testResults.percentage >= 90 &&
              "Відмінно! Ви чудово знаєте регіон!"}
            {testResults.percentage >= 70 &&
              testResults.percentage < 90 &&
              "Добре! Але є куди рости."}
            {testResults.percentage >= 50 &&
              testResults.percentage < 70 &&
              "Непогано, але варто підучити."}
            {testResults.percentage < 50 && "Потрібно краще вивчити регіон."}
          </div>
          {testResults.percentage < 90 && (
            <button
              className="region-modal-btn primary"
              onClick={handleTestClick}
            >
              Пройти тест знову
            </button>
          )}
          {testResults.percentage >= 90 && (
            <div className="donation-verification-section">
              {donationStatus === "checking" && (
                <div className="donation-checking">
                  <div className="donation-spinner"></div>
                  <p className="donation-checking-text">
                    Перевіряємо статус вашого донату...
                  </p>
                </div>
              )}

              {donationStatus === "verified" && (
                <div className="donation-verified">
                  <div className="donation-success-icon">
                    <svg
                      width="48"
                      height="48"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#4ade80"
                      strokeWidth="2"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <path d="M8 12l3 3 5-6" />
                    </svg>
                  </div>
                  <p className="donation-success-text">
                    Вітаємо! Ви пройшли тести на відмінно та задонатили на
                    допомогу нашим військовим! Ось ваш сертифікат:
                  </p>
                  <img
                    src="/certificate.jpg"
                    alt="Сертифікат"
                    className="certificate-image"
                  />
                  <div className="certificate-note">
                    Ви можете зберегти цей сертифікат як підтвердження вашої
                    підтримки натиснувши кнопку знизу!
                  </div>
                  <button
                    className="certificate-download-btn"
                    onClick={async () => {
                      try {
                        const blob = await api.downloadCertificate();
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = "certificate.pdf";
                        document.body.appendChild(a);
                        a.click();
                        window.URL.revokeObjectURL(url);
                        a.remove();
                      } catch (error) {
                        alert(error.message || "Помилка завантаження сертифікату");
                      }
                    }}
                  >
                    Завантажити сертифікат (PDF)
                  </button>
                </div>
              )}

              {donationStatus === "pending" && (
                <div className="donation-pending">
                  <div className="donation-pending-icon">
                    <svg
                      width="48"
                      height="48"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#fbbf24"
                      strokeWidth="2"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 6v6l4 2" />
                    </svg>
                  </div>
                  <h3 className="donation-pending-title">Майже готово!</h3>
                  <p className="donation-pending-text">
                    Ви успішно пройшли тестування! Наразі система перевіряє
                    надходження вашого донату на підтримку Збройних Сил України.
                  </p>
                  <p className="donation-pending-note">
                    Поверніться пізніше, щоб отримати свій сертифікат. Дякуємо
                    за вашу підтримку!
                  </p>
                  <button
                    className="region-modal-btn primary"
                    onClick={handleDonateClick}
                  >
                    Задонатити зараз
                  </button>
                </div>
              )}
            </div>
          )}
          <button
            className="region-modal-btn cancel"
            onClick={handleBackToInfo}
          >
            Назад
          </button>
        </div>
      ) : (
        <>
          <div className="test-questions">
            {regionData.tests.map((test, index) => (
              <div key={index} className="test-question">
                <div className="question-number">
                  Питання {index + 1} з {regionData.tests.length}
                </div>
                <div className="question-text">{test.question}</div>

                {test.image && (
                  <div className="question-image-container">
                    <img
                      src={test.image}
                      alt={`Ілюстрація до питання ${index + 1}`}
                      className="question-image"
                      onError={(e) => {
                        e.target.style.display = "none";
                        console.error(`Failed to load image: ${test.image}`);
                      }}
                    />
                  </div>
                )}

                <div className="question-options">
                  {test.options.map((option, optionIndex) => (
                    <label
                      key={optionIndex}
                      className={`option-label ${
                        selectedAnswers[index] === optionIndex ? "selected" : ""
                      }`}
                    >
                      <input
                        type="radio"
                        name={`question-${index}`}
                        checked={selectedAnswers[index] === optionIndex}
                        onChange={() => handleAnswerSelect(index, optionIndex)}
                      />
                      <span className="option-text">{option}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="region-modal-buttons">
            <button
              className="region-modal-btn primary"
              onClick={handleTestSubmit}
              disabled={
                Object.keys(selectedAnswers).length !== regionData.tests.length
              }
            >
              Підтвердити відповіді
            </button>
            <button
              className="region-modal-btn cancel"
              onClick={handleBackToInfo}
            >
              Відміна
            </button>
          </div>
        </>
      )}
    </div>
  );

  const renderQRContent = () => (
    <div className="region-modal-content qr-content">
      <h2 className="region-modal-title">Підтримка ЗСУ</h2>
      <p className="qr-description">
        Скануйте QR-код для підтримки Збройних Сил України
      </p>
      <div className="qr-code-container">
        <img
          src={regionData.qrCodePath}
          alt="QR Code для донату"
          className="qr-code-image"
          onError={(e) => {
            e.target.style.display = "none";
            e.target.nextSibling.style.display = "flex";
          }}
        />
        <div className="qr-placeholder" style={{ display: "none" }}>
          QR-код буде тут
        </div>
      </div>
      <div className="region-modal-buttons">
        <button className="region-modal-btn cancel" onClick={handleBackToInfo}>
          Назад
        </button>
      </div>
    </div>
  );

  const renderAuthRequiredContent = () => (
    <div className="region-modal-content auth-required-content">
      <div className="auth-required-icon">
        <svg
          width="64"
          height="64"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6m0 4h.01" />
        </svg>
      </div>
      <h2 className="region-modal-title">Потрібна реєстрація</h2>
      <p className="auth-required-message">
        Будь ласка, зареєструйтеся, щоб пройти тести та отримати сертифікат
      </p>
      <div className="region-modal-buttons">
        <button
          className="region-modal-btn primary"
          onClick={handleRegisterClick}
        >
          Зареєструватися
        </button>
        <button className="region-modal-btn cancel" onClick={handleBackToInfo}>
          Назад
        </button>
      </div>
    </div>
  );

  return (
    <div className="region-modal-overlay" onClick={onClose}>
      <div
        className="region-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        {modalState === "info" && renderInfoContent()}
        {modalState === "test" && renderTestContent()}
        {modalState === "qr" && renderQRContent()}
        {modalState === "auth-required" && renderAuthRequiredContent()}
      </div>
    </div>
  );
}

export default RegionModal;
