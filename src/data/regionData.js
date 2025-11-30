// Shared region data for all map components
// Extracted to avoid duplication and improve bundle size
// Each region is assigned to a specific class for donation tracking

const regionData = {
  "Avtonomna Respublika Krym": { text: "Крим", color: "#ff9aa2", assignedClass: "4Б" },
  Vinnytska: { text: "Вінницька", color: "#9ad3ff", assignedClass: "8А" },
  Volynska: { text: "Волинська", color: "#ffff99", assignedClass: "5Б" },
  Dnipropetrovska: { text: "Дніпропетровська", color: "#ffcc99", assignedClass: "3Б" },
  Donetska: { text: "Донецька", color: "#d099f0", assignedClass: "3В" },
  Zhytomyrska: { text: "Житомирська", color: "#99ffb3", assignedClass: "2Б" },
  Zakarpatska: { text: "Закарпатська", color: "#ffb3d9", assignedClass: "1Б" },
  Zaporizka: { text: "Запорізька", color: "#b3e6f0", assignedClass: "2А" },
  "Ivano-Frankivska": { text: "Івано-Франківська", color: "#ffeb99", assignedClass: "8Б" },
  Kyivska: { text: "Київська", color: "#ffb399", assignedClass: "1А" },
  Kirovohradska: { text: "Кіровоградська", color: "#b399ff", assignedClass: "9А" },
  Luhanska: { text: "Луганська", color: "#99ffe0", assignedClass: "9Б" },
  Lvivska: { text: "Львівська", color: "#ff99d6", assignedClass: "7В" },
  Mykolaivska: { text: "Миколаївська", color: "#99ccff", assignedClass: "10" },
  Odeska: { text: "Одеська", color: "#ffd699", assignedClass: "7Б" },
  Poltavska: { text: "Полтавська", color: "#c299ff", assignedClass: "3А" },
  Rivnenska: { text: "Рівненська", color: "#99ffcc", assignedClass: "7А" },
  Sumska: { text: "Сумська", color: "#ff9999", assignedClass: "6Б" },
  Ternopilska: { text: "Тернопільська", color: "#99e6ff", assignedClass: "11А" },
  Kharkivska: { text: "Харківська", color: "#fff799", assignedClass: "4А" },
  Khersonska: { text: "Херсонська", color: "#ffc499", assignedClass: "6А" },
  Khmelnytska: { text: "Хмельницька", color: "#d499f0", assignedClass: "8В" },
  Cherkaska: { text: "Черкаська", color: "#99ffd9", assignedClass: "4В" },
  Chernivetska: { text: "Чернівецька", color: "#ffcceb", assignedClass: "5А" },
  Chernihivska: { text: "Чернігівська", color: "#cce6ff", assignedClass: "11Б" },
};

export default regionData;
