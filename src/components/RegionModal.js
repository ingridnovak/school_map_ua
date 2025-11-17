import { useState } from 'react';
import './RegionModal.css';
import regionsData from '../data/regionsData.json';

function RegionModal({ regionKey, onClose }) {
  const [modalState, setModalState] = useState('info'); // 'info', 'test', 'qr'
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [testResults, setTestResults] = useState(null);

  const regionData = regionsData[regionKey];

  if (!regionData) {
    return null;
  }

  const handleDetailsClick = () => {
    window.open(regionData.detailsLink, '_blank');
  };

  const handleTestClick = () => {
    setModalState('test');
    setSelectedAnswers({});
    setTestResults(null);
  };

  const handleDonateClick = () => {
    setModalState('qr');
  };

  const handleAnswerSelect = (questionIndex, answerIndex) => {
    setSelectedAnswers({
      ...selectedAnswers,
      [questionIndex]: answerIndex
    });
  };

  const handleTestSubmit = () => {
    let correct = 0;
    regionData.tests.forEach((test, index) => {
      if (selectedAnswers[index] === test.correctAnswer) {
        correct++;
      }
    });
    setTestResults({
      correct,
      total: regionData.tests.length,
      percentage: Math.round((correct / regionData.tests.length) * 100)
    });
  };

  const handleBackToInfo = () => {
    setModalState('info');
    setSelectedAnswers({});
    setTestResults(null);
  };

  const renderInfoContent = () => (
    <div className="region-modal-content">
      <h2 className="region-modal-title">{regionData.name}</h2>
      <p className="region-modal-description">{regionData.description}</p>

      <div className="region-modal-buttons">
        <button className="region-modal-btn primary" onClick={handleDetailsClick}>
          Детальніше про цю область
        </button>
        <button className="region-modal-btn primary" onClick={handleTestClick}>
          Тести: Перевір себе
        </button>
        <button className="region-modal-btn primary" onClick={handleDonateClick}>
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
      <h2 className="region-modal-title">Тести: {regionData.name}</h2>

      {testResults ? (
        <div className="test-results">
          <h3 className="results-title">Результати тестування</h3>
          <div className="results-score">
            <span className="score-number">{testResults.correct}</span>
            <span className="score-separator">/</span>
            <span className="score-total">{testResults.total}</span>
          </div>
          <div className="results-percentage">{testResults.percentage}% правильних відповідей</div>
          <div className="results-message">
            {testResults.percentage >= 90 && 'Відмінно! Ви чудово знаєте регіон!'}
            {testResults.percentage >= 70 && testResults.percentage < 90 && 'Добре! Але є куди рости.'}
            {testResults.percentage >= 50 && testResults.percentage < 70 && 'Непогано, але варто підучити.'}
            {testResults.percentage < 50 && 'Потрібно краще вивчити регіон.'}
          </div>
          <button className="region-modal-btn primary" onClick={handleTestClick}>
            Пройти тест знову
          </button>
          <button className="region-modal-btn cancel" onClick={handleBackToInfo}>
            Назад
          </button>
        </div>
      ) : (
        <>
          <div className="test-questions">
            {regionData.tests.map((test, index) => (
              <div key={index} className="test-question">
                <div className="question-number">Питання {index + 1} з {regionData.tests.length}</div>
                <div className="question-text">{test.question}</div>

                {test.image && (
                  <div className="question-image-container">
                    <img
                      src={test.image}
                      alt={`Ілюстрація до питання ${index + 1}`}
                      className="question-image"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        console.error(`Failed to load image: ${test.image}`);
                      }}
                    />
                  </div>
                )}

                <div className="question-options">
                  {test.options.map((option, optionIndex) => (
                    <label
                      key={optionIndex}
                      className={`option-label ${selectedAnswers[index] === optionIndex ? 'selected' : ''}`}
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
              disabled={Object.keys(selectedAnswers).length !== regionData.tests.length}
            >
              Підтвердити відповіді
            </button>
            <button className="region-modal-btn cancel" onClick={handleBackToInfo}>
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
            e.target.style.display = 'none';
            e.target.nextSibling.style.display = 'flex';
          }}
        />
        <div className="qr-placeholder" style={{ display: 'none' }}>
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

  return (
    <div className="region-modal-overlay" onClick={onClose}>
      <div className="region-modal-container" onClick={(e) => e.stopPropagation()}>
        {modalState === 'info' && renderInfoContent()}
        {modalState === 'test' && renderTestContent()}
        {modalState === 'qr' && renderQRContent()}
      </div>
    </div>
  );
}

export default RegionModal;
