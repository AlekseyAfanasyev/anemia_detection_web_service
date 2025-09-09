import React, { useState, useEffect } from 'react';
import "../history/history.css";

const indicatorNorms = [
  { key: 'leukocytes', name: "Лейкоциты", range: [4, 11], unit: "×10⁹/л" },
  { key: 'eosinophils_prcnt', name: "Эозинофилы", range: [0, 6], unit: "%" },
  { key: 'monocytes_prcnt', name: "Моноциты", range: [2, 8], unit: "%" },
  { key: 'lymphocytes_prcnt', name: "Лимфоциты", range: [20, 40], unit: "%" },
  { key: 'neutrophils_prcnt', name: "Нейтрофилы", range: [50, 70], unit: "%" },
  { key: 'esr', name: "СОЭ", range: [0, 20], unit: "мм/ч" },
  { key: 'hgb', name: "Гемоглобин", range: [120, 160], unit: "г/л" },
  { key: 'rbc', name: "Эритроциты", range: [4.2, 5.4], unit: "×10¹²/л" },
  { key: 'mcv', name: "Средний объем эритроцита", range: [80, 100], unit: "фл" },
  { key: 'mch', name: "Среднее содержание гемоглобина", range: [27, 33], unit: "пг" },
  { key: 'mchc', name: "Средняя концентрация гемоглобина", range: [320, 360], unit: "г/л" }
];

const bioNorms = [
  { key: 'alt', name: "АЛТ", range: [7, 56], unit: "Ед/л" },
  { key: 'ast', name: "АСТ", range: [10, 40], unit: "Ед/л" },
  { key: 'alp', name: "ЩФ", range: [44, 147], unit: "Ед/л" },
  { key: 'bilirubin', name: "Билирубин", range: [5, 21], unit: "мкмоль/л" },
  { key: 'creatinine', name: "Креатинин", range: [62, 115], unit: "мкмоль/л" },
  { key: 'urea', name: "Мочевина", range: [2.5, 8.3], unit: "ммоль/л" },
  { key: 'amylase', name: "Амилаза", range: [28, 100], unit: "Ед/л" },
  { key: 'lipase', name: "Липаза", range: [13, 60], unit: "Ед/л" },
  { key: 'ldh', name: "ЛДГ", range: [135, 225], unit: "Ед/л" },
  { key: 'hgb', name: "Гемоглобин", range: [120, 160], unit: "г/л" },
  { key: 'rbc', name: "Эритроциты", range: [4.2, 5.4], unit: "×10¹²/л" },
  { key: 'mcv', name: "Средний объем эритроцита", range: [80, 100], unit: "фл" },
  { key: 'mch', name: "Среднее содержание гемоглобина", range: [27, 33], unit: "пг" },
  { key: 'mchc', name: "Средняя концентрация гемоглобина", range: [320, 360], unit: "г/л" },
  { key: 'hct', name: "Гематокрит (HCT)", range: [36, 48], unit: "%" },
  { key: 'rdw', name: "Ширина распределения эритроцитов", range: [11.5, 14.5], unit: "%" },
  { key: 'sd', name: "Сывороточное железо", range: [39, 46], unit: "фл" },
  { key: 'tsd', name: "Общая железосвязывающая способность", range: [3.5, 5.5], unit: "%" },
  { key: 'sdtsd', name: "Насыщение трансферрина", range: [8, 12], unit: "%" },
  { key: 'ferritte', name: "Ферритин", range: [20, 250], unit: "нг/мл" },
  { key: 'folate', name: "Витамин В9", range: [4, 20], unit: "нг/мл" },
  { key: 'b12', name: "Витамин B12", range: [200, 900], unit: "пг/мл" }
];

const NewHistory = () => {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem("user")) || null);
  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [searchQuery, setSearchQuery] = useState("");
  const [showPatientList, setShowPatientList] = useState(false);
  const [history, setHistory] = useState({
    oak_doc_checkups: [],
    oak_user_checkups: [],
    bio_doc_checkups: [],
    bio_user_checkups: [],
    checkups: [],
  });
  const [sortOrder, setSortOrder] = useState('desc');
  const [isOakOpen, setIsOakOpen] = useState(true);
  const [isBioOpen, setIsBioOpen] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) setUser(JSON.parse(storedUser));
  }, []);

  useEffect(() => {
    if (user?.role_id === 1) fetchPatients();
    fetchHistory();
  }, [user?.role_id]);

  const fetchPatients = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/patients`, { credentials: 'include' });
      if (!response.ok) throw new Error('Ошибка получения списка пациентов');
      const data = await response.json();
      setPatients(data);
    } catch (error) {
      console.error('Ошибка при загрузке списка пациентов:', error);
    }
  };

  const handlePatientSelect = (patientId) => {
    setSelectedPatientId(patientId);
    setShowPatientList(false); 
    fetchHistory(patientId);
  };

  const handleSearchFocus = () => {
    if (searchQuery) {
      setShowPatientList(true);
    }
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setShowPatientList(true);
  };

  const fetchHistory = async (patientId = '') => {
    try {
      const url = patientId
        ? `http://localhost:5000/api/new_history?patient_id=${patientId}`
        : `http://localhost:5000/api/new_history`;

      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) throw new Error("Ошибка получения истории");

      const data = await response.json();
      setHistory({
        oak_doc_checkups: data.oak_doc_checkups || [],
        oak_user_checkups: data.oak_user_checkups || [],
        bio_doc_checkups: data.bio_doc_checkups || [],
        bio_user_checkups: data.bio_user_checkups || [],
        checkups: data.checkups || [],
      });
    } catch (error) {
      console.error("Ошибка при загрузке истории:", error);
    }
  };

  // Фильтрация пациентов по поисковому запросу
  const filteredPatients = patients.filter(patient => 
  patient.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
  (patient.polis && patient.polis.toString().includes(searchQuery))
);

  const combinedCheckups = [
    ...history.oak_doc_checkups.map(c => ({ ...c, source: 'ОАК', enteredBy: 'Доктор' })),
    ...history.oak_user_checkups.map(c => ({ ...c, source: 'ОАК', enteredBy: 'Пациент' })),
    ...history.bio_doc_checkups.map(c => ({ ...c, source: 'Биохимия', enteredBy: 'Доктор' })),
    ...history.bio_user_checkups.map(c => ({ ...c, source: 'Биохимия', enteredBy: 'Пациент' })),
  ];

  const sortedHistory = [...combinedCheckups].sort((a, b) =>
    sortOrder === 'asc'
      ? new Date(a.checkup_date || a.biochem_date) - new Date(b.checkup_date || b.biochem_date)
      : new Date(b.checkup_date || b.biochem_date) - new Date(a.checkup_date || a.biochem_date)
  );

  const getVerdict = (value, range) => {
    if (value == null) return 'Нет данных';
    if (value < range[0]) return 'Ниже нормы';
    if (value > range[1]) return 'Выше нормы';
    return 'В норме';
  };

  const getVerdictStyle = (verdict) => {
    switch (verdict) {
      case "В норме": return { color: 'green' };
      case "Выше нормы": return { color: 'orange' };
      case "Ниже нормы": return { color: 'red' };
      default: return { color: 'gray' };
    }
  };

  const getResultTitle = (checkup) => {
    const date = new Date(checkup.checkup_date || checkup.biochem_date).toLocaleString('ru-RU');
    const who = checkup.enteredBy === 'Доктор' 
        ? ` [Введено доктором: ${checkup.doc_username || 'неизвестно'}]` 
        : '';
    return user?.role_id === 1
        ? `Результаты диагностики пациента ${checkup.patient_username} за ${date}${who}`
        : `Результаты диагностики за ${date}${who}`;
};

  const getOakInflamResults = (checkup) => {
    const inflam = checkup.is_inflam_clust_dist;
    const noInflam = checkup.no_inflam_clust_dist;

    if (inflam == null || noInflam == null) {
      return <p>Недостаточно данных для анализа воспаления.</p>;
    }

    return (
      <div className="checkup-cluster-distances">
        <h3>Результаты от модели МШ (воспаление):</h3>
        <ul>
          <li>Расстояние до облака точек с воспалением: {inflam.toFixed(3)}</li>
          <li>Расстояние до облака точек без воспаления: {noInflam.toFixed(3)}</li>
        </ul>
        <p>
          {inflam * 2 < noInflam
            ? "Ваши данные находятся значительно ближе к центру облака точек с воспалением. Следовательно, скорее всего есть воспаление."
            : inflam < noInflam
            ? "Ваши данные немного ближе к кластеру с воспалением. Возможно, у вас есть воспаление — рекомендуется дополнительная проверка."
            : noInflam * 2 < inflam
            ? "Ваши данные сильно ближе к кластеру без воспаления. Вероятность наличия воспаления мала."
            : "Ваши данные немного ближе к кластеру без воспаления, но это не однозначно указывает на отсутствие воспаления."}
        </p>
      </div>
    );
  };

  const getOakAnemiaResults = (checkup) => {
    if (!checkup.is_anemia_oak_diagnosis) {
      return <p>Недостаточно данных для анализа анемии.</p>;
    }
  
    return (
      <div className="checkup-cluster-distances">
        <h3>Результаты от модели МШ (анемия):</h3>
        <ul>
          {checkup.is_anemia_oak_diagnosis.map(([diagnosis, score], index) => (
            <li key={index}>
              {diagnosis}: {parseFloat(score).toFixed(1)}%
            </li>
          ))}
        </ul>
      </div>
    );
  };
  

  const getBioInflamResults = (checkup) => {
    if (!checkup.inflam_results || checkup.inflam_results.length === 0) {
      return <p>Недостаточно данных для анализа воспаления.</p>;
    }

    return (
      <div className="bio-inflam-results">
        <h3>Результаты от модели МШ (воспаление):</h3>
        <ul>
          {checkup.inflam_results.map(([region, value], index) => (
            <li key={index}>{region === "unknown" ? "Неизвестно" : region}: {typeof value === 'number' ? value.toFixed(2) : 'нет данных'}%</li>
          ))}
        </ul>
      </div>
    );
  };

  const getBioAnemiaResults = (checkup) => {
    if (!checkup.is_anemia_biochem_diagnosis) {
      return <p>Недостаточно данных для анализа анемии.</p>;
    }
  
    return (
      <div className="bio-inflam-results">
        <h3>Результаты от модели МШ (анемия):</h3>
        <ul>
          {checkup.is_anemia_biochem_diagnosis.map(([diagnosis, score], index) => (
            <li key={index}>
              {diagnosis}: {parseFloat(score).toFixed(1)}%
            </li>
          ))}
        </ul>
      </div>
    );
  };
  
    // параллакс
    window.addEventListener('scroll', function () {
        const background = document.body; // привязываем центр картинке к body
        let offset = window.scrollY; // оффсет по У относительно открытого окна
        background.style.backgroundPosition = 'center ' + (-offset * 0.1) + 'px'; // перемещаем картинку на оффсет
        // чем дальше множитель от 1 - тем быстрее картинка двигается
    });

 return (
  <div className="history-container">
    <h2>
      История анализов
      <select onChange={(e) => setSortOrder(e.target.value)} value={sortOrder}>
        <option value="desc">По убыванию</option>
        <option value="asc">По возрастанию</option>
      </select>
    </h2>

    {user?.role_id === 1 && (
      <div className="history-pick-patient">
        <label htmlFor="patient_search">Поиск пациента:</label>
        <input
          id="patient_search"
          type="text"
          placeholder="Введите логин или полис пациента"
          value={searchQuery}
          onChange={handleSearchChange}
          onFocus={handleSearchFocus}
        />

        <div className="patient-search-results">
          {showPatientList && searchQuery && (
            <div className="patient-list">
              {filteredPatients.length > 0 ? (
                filteredPatients.map((patient) => (
                  <div
                    key={patient.user_id}
                    className={`patient-item ${selectedPatientId === patient.user_id ? 'selected' : ''}`}
                    onClick={() => handlePatientSelect(patient.user_id)}
                  >
                    {patient.username} {patient.polis && `(Полис: ${patient.polis})`}
                  </div>
                ))
              ) : (
                <div className="no-results">Пациенты не найдены</div>
              )}
            </div>  
          )}
        </div>

        {selectedPatientId && (
          <div className="selected-patient">
            Выбран: {patients.find((p) => p.user_id === selectedPatientId)?.username}
            <button
              onClick={() => {
                setSelectedPatientId('');
                setSearchQuery('');
                setShowPatientList(false);
              }}
            >
              Сбросить
            </button>
          </div>
        )}
      </div>
    )}

    <div className="history-results">
      <h2 onClick={() => setIsOakOpen(!isOakOpen)} style={{ cursor: 'pointer' }}>
        Результаты ОАК {isOakOpen ? '▼' : '►'}
      </h2>
      {isOakOpen && (
        <ul>
          {sortedHistory
            .filter((c) => c.source === 'ОАК')
            .map((checkup, index) => (
              <li key={index}>
                <h3>{getResultTitle(checkup)}</h3>
                <table border="1">
                  <thead>
                    <tr>
                      <th>Показатель</th>
                      <th>Значение</th>
                      <th>Норма</th>
                      <th>Вердикт</th>
                    </tr>
                  </thead>
                  <tbody>
                    {indicatorNorms.map(({ key, name, range, unit }) => {
                      const value = parseFloat(checkup[key]);
                      const verdict = isNaN(value) ? 'Нет данных' : getVerdict(value, range);
                      return (
                        <tr key={key}>
                          <td>{name}</td>
                          <td>
                            {isNaN(value) ? '-' : value} {unit && `[${unit}]`}
                          </td>
                          <td>
                            {range[0]} - {range[1]} {unit && `[${unit}]`}
                          </td>
                          <td style={getVerdictStyle(verdict)}>{verdict}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {getOakInflamResults(checkup)}
                {getOakAnemiaResults(checkup)}
              </li>
            ))}
        </ul>
      )}
    </div>

    <div className="history-results">
      <h2 onClick={() => setIsBioOpen(!isBioOpen)} style={{ cursor: 'pointer' }}>
        Результаты биохимии {isBioOpen ? '▼' : '►'}
      </h2>
      {isBioOpen && (
        <ul>
          {sortedHistory
            .filter((c) => c.source === 'Биохимия')
            .map((checkup, index) => (
              <li key={index}>
                <h3>{getResultTitle(checkup)}</h3>
                <table border="1">
                  <thead>
                    <tr>
                      <th>Показатель</th>
                      <th>Значение</th>
                      <th>Норма</th>
                      <th>Вердикт</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bioNorms.map(({ key, name, range, unit }) => {
                      const value = parseFloat(checkup[key]);
                      const verdict = isNaN(value) ? 'Нет данных' : getVerdict(value, range);
                      return (
                        <tr key={key}>
                          <td>{name}</td>
                          <td>
                            {isNaN(value) ? '-' : value} {unit && `[${unit}]`}
                          </td>
                          <td>
                            {range[0]} - {range[1]} {unit && `[${unit}]`}
                          </td>
                          <td style={getVerdictStyle(verdict)}>{verdict}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {getBioInflamResults(checkup)}
                {getBioAnemiaResults(checkup)}
              </li>
            ))}
        </ul>
      )}
    </div>
  </div>
);

};

export default NewHistory;
