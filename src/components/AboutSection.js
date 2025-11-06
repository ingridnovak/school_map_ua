import "./AboutSection.css";

function AboutSection() {
  return (
    <div className="about-section">
      <div className="about-container">
        <div className="about-image">
          <img
            src="/soldier.jpg"
            alt="Woman wearing traditional Ukrainian Vyshyvanka"
          />
        </div>
        <div className="about-content">
          <h2 className="about-title">
            Разом за Україну: сила народу — опора героїв
          </h2>
          <p className="about-text">
            Наші воїни щодня стоять на межі між світлом і темрявою, боронячи
            Україну від ворога. Вони — жива стіна, що тримає небо над нашими
            домівками. Як писав Василь Симоненко: «Можна все на світі вибирати,
            сину, вибрати не можна тільки Батьківщину».
          </p>
          <p className="about-text">
            І сьогодні саме вони вибрали — стояти за неї до кінця. Ми ж повинні
            бути поруч, допомагати всім, чим можемо: працею, вірою, словом,
            добрим ділом.
          </p>
          <p className="about-text">
            Бо кожна гривня, кожна посилка, кожне «дякую» — це цеглина у
            спільній перемозі. Разом ми сила, а наша вдячність — це паливо, що
            допомагає героям вистояти.
          </p>
        </div>
      </div>
    </div>
  );
}

export default AboutSection;
