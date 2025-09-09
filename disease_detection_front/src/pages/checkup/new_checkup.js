import React, { useState, useEffect, useCallback } from 'react';
import axios from "axios";
import "../checkup/checkup.css";

const NewCheckupPage = () => {
    const [formData, setFormData] = useState({
        sex: 0,
        age: 0,
        Leukocytes: '',
        Eosinophils_prcnt: '',
        Monocytes_prcnt: '',
        Lymphocytes_prcnt: '',
        Neutrophils_prcnt: '',
        ESR: '',
        patient_id: '',
    });

    const [result, setResult] = useState(null);
    const [user, setUser] = useState(null);
    const [patients, setPatients] = useState([]);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredSuggestions, setFilteredSuggestions] = useState([]);

    // загружаем данные пользователя из localStorage при загрузке страницы
    useEffect(() => {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);
            console.log("Stored user:", storedUser);
            console.log("Parsed user:", parsedUser);
        }
    }, []);

    useEffect(() => {
        if (user) {
            setFormData((prevData) => ({
                ...prevData,
                sex: user.sex,
                age: user.age,
                polis: user.polis
            }));
            console.log("Updated formData:", formData);
        }
    }, [user]);

    const handleSearchChange = (input) => {
    setSearchTerm(input);
    const filtered = patients.filter(
        (p) =>
            p.username.toLowerCase().includes(input.toLowerCase()) ||
            p.polis.toString().includes(input)
    );
    setFilteredSuggestions(filtered);
    setSelectedPatient({ label: input, user_id: '' }); // Пока не выбран
    };

    const handleSuggestionClick = (patient) => {
    setSelectedPatient({ label: `${patient.username}`, user_id: patient.user_id });
    setSearchTerm('');
    setFilteredSuggestions([]);
    getPatientProfile(patient.user_id);
    };

    const getPatients = async () => {
        try {
            if (user?.role_id === 1 && patients.length === 0) {
                //const response = await fetch(`http://localhost:5000/api/patients?doc_id=${user.user_id}`, {
                const response = await fetch(`http://localhost:5000/api/patients`, {
                    method: 'GET',
                    credentials: 'include'
                });
                const data = await response.json();
                setPatients(data);
            }
        } catch (error) {
            console.error('Ошибка получения списка пациентов:', error);
        }
    };

    // загружаем список пациентов, если врач авторизован
    useEffect(() => {
        if (user && user.role_id === 1) {
            getPatients();
        }
    }, [user]);

    // асинхронная функция для получения данных пациента
    const getPatientProfile = async (patientId) => {
        try {
            //const response = await fetch(`http://localhost:5000/api/patient?doc_id=${user.user_id}&patient_id=${patientId}`, {
            const response = await fetch(`http://localhost:5000/api/patient?patient_id=${patientId}`, {
                method: 'GET',
                credentials: 'include'
            });
            const data = await response.json();
            setFormData({
                ...formData,
                patient_id: data.user_id,
                sex: data.sex ? 1 : 0,
                age: data.age,
                polis: data.polis
            });
        } catch (error) {
            console.error('Ошибка получения данных пациента:', error);
        }
    };

    // врач выбирает пациента для того чтобы анализы "привязались" к нему
    const handlePatientChange = (e) => {
        const patientId = e.target.value;
        setSelectedPatient(patientId);
        getPatientProfile(patientId);
    };

    // при логауте
    const handleLogout = async () => {
        try {
            const response = await axios.post("http://localhost:5000/api/logout", {}, { withCredentials: true });

            if (response.status === 200) {
                localStorage.removeItem("user");
                setUser(null);

                window.location.reload();
            } else {
                alert("Ошибка выхода! Статус: " + response.status);
            }
        } catch (error) {
            alert("Ошибка выхода", error);
        }
    };

    // ввод результатов анализа в форму
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    // при нажатии на кнопку "получить результаты"
    const handleSubmit = async (e) => {
        e.preventDefault();
        // если пользователь авторизован, обновляем sex и age перед отправкой
        const updatedFormData = user && user.role_id === 0
            ? { ...formData, 
                sex: user.sex, 
                age: user.age, 
                polis: user.polis 
            }
            : formData;

        // строим URL в зависимости от авторизации пользователя
        let url = ''
        if (user && user.role_id === 0) {
            //url = `http://localhost:5000/api/checkup?user_id=${user.user_id}`
            url = `http://localhost:5000/api/oak_detect`
        }
        else if (user && user.role_id === 1) {
            //url = `http://localhost:5000/api/checkup?user_id=${user.user_id}&patient_id=${selectedPatient}`
            url = `http://localhost:5000/api/oak_detect?patient_id=${selectedPatient.user_id}`
        }
        else url = `http://localhost:5000/api/oak_detect` // для других ролей (админа) надо будет исправить по необходимости

        try {
            // отправляем данные на сервер
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedFormData),
                credentials: 'include'
            });
            const data = await response.json();
            setResult(data);

            const inflam = data.inflam_result;
            const anemia = data.anemia_result;
            const currentUser = JSON.parse(localStorage.getItem("user"));
            let updated = false;

            // если юзер авторизован - обновляем ему доступ к биохимии, если надо
            if (user) {
                    // Проверка воспаления
                if (inflam[0] < inflam[1] && !currentUser.biochem_access_inflam) {
                    currentUser.biochem_access_inflam = true;
                    updated = true;
                    alert("Вам открыт доступ к биохимии по воспалению");
                }

                // Проверка анемии
                const healthyAnemiaEntry = anemia.find(item => item[0] === "Здоров");
                const healthyAnemiaPercent = healthyAnemiaEntry ? healthyAnemiaEntry[1] : 0;

                if (healthyAnemiaPercent < 100 && !currentUser.biochem_access_anemia) {
                    currentUser.biochem_access_anemia = true;
                    updated = true;
                    alert("Вам открыт доступ к биохимии по анемии");
                }

                // Если хотя бы один доступ обновлён — сохранить
                if (updated) {
                    localStorage.setItem("user", JSON.stringify(currentUser));
                    window.dispatchEvent(new Event("storage"));
                }
            }
            

            console.log("received data:", data)

            if (user && user.role_id === 1) {
                getPatientProfile(user.user_id)
            }
        } catch (error) {
            console.error('Ошибка запроса:', error);
        }
    };

    // параллакс
    window.addEventListener('scroll', function () {
        const background = document.body; // привязываем центр картинке к body
        let offset = window.scrollY; // оффсет по У относительно открытого окна
        background.style.backgroundPosition = 'center ' + (-offset * 0.4) + 'px'; // перемещаем картинку на оффсет
        // чем дальше множитель от 1 - тем быстрее картинка двигается
    });   

    const units = {
        'Эритроциты': '×10¹²/л',
        'Гемоглобин': 'г/л',
        'Средний объем эритроцита': 'фл',
        'Среднее содержание гемоглобина в эритроците': 'пг',
        'Средняя концентрация гемоглобина в эритроците': 'г/л',
        'Лейкоциты': '×10⁹/л',
        'Эозинофилы': '%',
        'Моноциты': '%',
        'Лимфоциты': '%',
        'Нейтрофилы': '%',
        'Скорость оседания эритроцитов': 'мм/ч',
    };

    return (
        <div className="checkup-container">
            <div className="checkup-header">
                <h2>Общий анализ крови</h2>
            </div>
    
            <form onSubmit={handleSubmit}>
                {user?.role_id === 1 && (
                    <div className="checkup-form-group">
                        <label htmlFor="patient">Пациент:</label>
                        <div className="patient-search-wrapper">
                            <input
                                type="text"
                                id="patient-search"
                                placeholder="Введите логин или полис пациента"
                                value={selectedPatient?.label || searchTerm}
                                onChange={(e) => handleSearchChange(e.target.value)}
                                autoComplete="off"
                                required
                            />
                            {filteredSuggestions.length > 0 && (
                                <div className="suggestions-container">
                                    <ul className="suggestions-list">
                                        {filteredSuggestions.map((patient) => (
                                            <li
                                                key={patient.user_id}
                                                onClick={() => handleSuggestionClick(patient)}
                                                className="suggestion-item"
                                            >
                                                {patient.username} (Полис: {patient.polis})
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                )}
    
                {selectedPatient && (
                    <>
                        <div className="checkup-form-group">
                            <label htmlFor="sex">Пол:</label>
                            <input type="text" id="sex" name="sex" value={formData.sex ? "Женский" : "Мужской"} readOnly />
                        </div>
                        <div className="checkup-form-group">
                            <label htmlFor="age">Возраст:</label>
                            <input type="number" id="age" name="age" value={formData.age} readOnly />
                        </div>
                        <div className="checkup-form-group">
                            <label htmlFor="polis">Полис ОМС:</label>
                            <input type="number" id="polis" name="polis" value={formData.polis} readOnly />
                        </div>
                    </>
                )}
    
                {user && user.role_id === 0 && (
                    <>
                        <div className="checkup-form-group">
                            <label>Пол:</label>
                            <input type="text" value={user.sex ? "Женский" : "Мужской"} readOnly />
                        </div>
                        <div className="checkup-form-group">
                            <label>Возраст:</label>
                            <input type="number" value={user.age} readOnly />
                        </div>
                        <div className="checkup-form-group">
                            <label>Полис ОМС:</label>
                            <input type="number" value={user.polis} readOnly />
                        </div>
                    </>
                )}
    
                {!user && (
                    <>
                            <div className="checkup-form-group">
                                <label htmlFor="sex">Пол:</label>
                                <select id="sex" name="sex" value={formData.sex} onChange={handleChange} required>
                                    <option value="0">Мужской</option>
                                    <option value="1">Женский</option>
                                </select>
                            </div>
                            <div className="checkup-form-group">
                                <label htmlFor="age">Возраст (18-60):</label>
                                <input
                                    type="number"
                                    id="age"
                                    name="age"
                                    min="18"
                                    max="60"
                                    required
                                    value={formData.age}
                                    onChange={handleChange}
                                />
                            </div>
                        </>
                    )}
        
                    {[
                        'Эритроциты','Гемоглобин','Средний объем эритроцита',
                        'Среднее содержание гемоглобина в эритроците', 
                        'Средняя концентрация гемоглобина в эритроците',
                        'Лейкоциты', 'Эозинофилы', 'Моноциты',
                        'Лимфоциты', 'Нейтрофилы', 'Скорость оседания эритроцитов'
                    ].map((field) => (
                        <div className="checkup-form-group" key={field}>
                            <label htmlFor={field}>{field}:</label>
                            <div className="checkup-form-input-wrapper">
                                <input
                                    type="number"
                                    id={field}
                                    name={field}
                                    step="0.1"
                                    value={formData[field]}
                                    onChange={handleChange}
                                    required
                                />
                                <div className="checkup-form-unit">{units[field]}</div>
                            </div>
                        </div>
                    ))}
    
                <div className="checkup-submit-button-container">
                    <button type="submit" className="checkup-submit-button">
                        Получить результат
                    </button>
                </div>
            </form>
    
            {result && (
                <div className="checkup-results">
                    <table>
                        <thead>
                            <tr>
                                <th>Показатель</th>
                                <th>Введённое значение</th>
                                <th>Норма</th>
                                <th>Вердикт</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[
                                { name: "Эритроциты", range: [4.2, 5.4], unit: "[10¹²/л]" },
                                { name: "Гемоглобин", range: [100, 160], unit: "[г/л]" },
                                { name: "Средний объем эритроцита", range: [80, 100], unit: "[фл]" },
                                { name: "Среднее содержание гемоглобина в эритроците", range: [27, 33], unit: "[пг]" },
                                { name: "Средняя концентрация гемоглобина в эритроците", range: [320, 360], unit: "[г/л]" },
                                { name: "Лейкоциты", range: [4, 11], unit: "[10⁹/л]" },
                                { name: "Эозинофилы", range: [0, 6], unit: "[%]" },
                                { name: "Моноциты", range: [2, 8], unit: "[%]" },
                                { name: "Лимфоциты", range: [20, 40], unit: "[%]" },
                                { name: "Нейтрофилы", range: [50, 70], unit: "[%]" },
                                { name: "Скорость оседания эритроцитов", range: [0, 20], unit: "[мм/ч]" },
                            ].map(({ name, range, unit }) => {
                                const value = Number.parseFloat(formData[name]);
                                let verdict = "В норме";
                                let verdictColor = "green"; 
            
                                if (value < range[0]){
                                    verdict = "Ниже нормы";
                                    verdictColor = "red"; 
                                } 
            
                                if (value > range[1]){
                                    verdict = "Выше нормы";
                                    verdictColor = "orange";
                                } 
            
                                return (
                                    <tr key={name}>
                                        <td>{name}</td>
                                        <td>{value} {unit}</td>
                                        <td>{range[0]} - {range[1]} {unit}</td>
                                        <td style={{ color: verdictColor }}>{verdict}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
    
                    {!user && <p className="checkup-warning">Чтобы увидеть историю анализов и подробные результаты, войдите в систему</p>}
    
                    {(result.inflam_result || result.anemia_result) && (
                        <div className="checkup-cluster-distances">
                            <h2>Результаты:</h2>
    
                            {/* Воспаление */}
                            {result.inflam_result && (
                            <>
                                <h3>Воспаление</h3>
                                <ul>
                                <li>
                                    Расстояние до облака точек с воспалением:{" "}
                                    {result.inflam_result["0"].toFixed(3)}
                                </li>
                                <li>
                                    Расстояние до облака точек без воспаления:{" "}
                                    {result.inflam_result["1"].toFixed(3)}
                                </li>
                                </ul>
                                <p>
                                {result.inflam_result["0"] * 2 < result.inflam_result["1"]
                                    ? "Ваши данные находятся значительно ближе к центру облака точек с воспалением. Следовательно, скорее всего есть воспаление."
                                    : result.inflam_result["0"] < result.inflam_result["1"]
                                    ? "Ваши данные немного ближе к кластеру с воспалением. Возможно, у вас есть воспаление — рекомендуется дополнительная проверка."
                                    : result.inflam_result["1"] * 2 < result.inflam_result["0"]
                                    ? "Ваши данные сильно ближе к кластеру без воспаления. Вероятность наличия воспаления мала."
                                    : "Ваши данные немного ближе к кластеру без воспаления. Скорее всего воспаления нет, но лучше перепроверить у врача."}
                                </p>

                                {/* Анализы вне нормы - только для врача */}
                                {user && user.role_id === 1 &&
                                    <ul>
                                    {formData["Лейкоциты"] !== undefined && (
                                        <>
                                        {formData["Лейкоциты"] > 11 && (
                                            <li>
                                            <strong>Лейкоциты повышены</strong>: лейкоцитоз указывает на возможное наличие острого воспаления, бактериальной инфекции, реже — на некротические процессы или аутоиммунную активность.
                                            </li>
                                        )}
                                        {formData["Лейкоциты"] < 4 && (
                                            <li>
                                            <strong>Лейкоциты понижены</strong>: лейкопения может быть следствием вирусной инфекции, иммунодепрессии, истощения костного мозга — важно учитывать в динамике при подозрении на скрытые воспалительные процессы.
                                            </li>
                                        )}
                                        </>
                                    )}

                                    {formData["Эозинофилы"] !== undefined && (
                                        <>
                                        {formData["Эозинофилы"] > 6 && (
                                            <li>
                                            <strong>Эозинофилы повышены</strong>: эозинофилия чаще всего свидетельствует об аллергических реакциях, паразитарных инвазиях; при воспалении может быть маркером эозинофильного васкулита или воспаления дыхательных путей.
                                            </li>
                                        )}
                                        {formData["Эозинофилы"] < 0 && (
                                            <li>
                                            <strong>Эозинофилы понижены</strong>: неинформативно в контексте воспаления, возможны острые стрессы или острые бактериальные инфекции, где происходит мобилизация других лейкоцитарных звеньев.
                                            </li>
                                        )}
                                        </>
                                    )}

                                    {formData["Моноциты"] !== undefined && (
                                        <>
                                        {formData["Моноциты"] > 8 && (
                                            <li>
                                            <strong>Моноциты повышены</strong>: моноцитоз может указывать на хроническое воспаление, бактериальные инфекции (например, туберкулёз), восстановительную фазу после острого воспаления или аутоиммунные процессы.
                                            </li>
                                        )}
                                        {formData["Моноциты"] < 2 && (
                                            <li>
                                            <strong>Моноциты понижены</strong>: может быть признаком угнетения костномозгового кроветворения или выраженного острого воспалительного ответа с перераспределением моноцитов — требуется дополнительная интерпретация в динамике.
                                            </li>
                                        )}
                                        </>
                                    )}

                                    {formData["Лимфоциты"] !== undefined && (
                                        <>
                                        {formData["Лимфоциты"] > 40 && (
                                            <li>
                                            <strong>Лимфоциты повышены</strong>: лимфоцитоз возможен при вирусных воспалениях (например, мононуклеоз, грипп), хронических бактериальных инфекциях и аутоиммунных воспалениях.
                                            </li>
                                        )}
                                        {formData["Лимфоциты"] < 20 && (
                                            <li>
                                            <strong>Лимфоциты понижены</strong>: может указывать на острую бактериальную воспалительную реакцию, подавление иммунитета, либо перераспределение клеток в тканях.
                                            </li>
                                        )}
                                        </>
                                    )}

                                    {formData["Нейтрофилы"] !== undefined && (
                                        <>
                                        {formData["Нейтрофилы"] > 70 && (
                                            <li>
                                            <strong>Нейтрофилы повышены</strong>: нейтрофилёз типичен для острых бактериальных воспалений, сепсиса, гнойных процессов, а также может сопровождать посттравматические и некротические изменения.
                                            </li>
                                        )}
                                        {formData["Нейтрофилы"] < 50 && (
                                            <li>
                                            <strong>Нейтрофилы понижены</strong>: нейтропения может быть связана с вирусными инфекциями, угнетением костного мозга, требует внимания при наличии признаков воспаления низкой активности.
                                            </li>
                                        )}
                                        </>
                                    )}

                                    {formData["Скорость оседания эритроцитов"] !== undefined && (
                                        <>
                                        {formData["Скорость оседания эритроцитов"] > 20 && (
                                            <li>
                                            <strong>СОЭ повышена</strong>: увеличение скорости оседания эритроцитов — неспецифический маркер воспаления, может свидетельствовать о хроническом или остром воспалительном процессе, инфекциях, аутоиммунных или онкологических заболеваниях.
                                            </li>
                                        )}
                                        {formData["Скорость оседания эритроцитов"] < 0 && (
                                            <li>
                                            <strong>СОЭ занижена</strong>: редко имеет диагностическое значение, возможна при выраженной эритроцитозе или нарушениях белкового обмена.
                                            </li>
                                        )}
                                        </>
                                    )}
                                    </ul>
                                }
                            </>
                            )}
    
                            {/* Анемия */}
                            {result.anemia_result && (
                                <>
                                    <h3>Анемия</h3>
                                    <ul>
                                        {result.anemia_result.map(([label, score]) => (
                                            <li key={label}>{label}: {score.toFixed(1)}%</li>
                                        ))}
                                    </ul>
                                    <p>
                                        {
                                            result.anemia_result.find(([label]) => label === "Здоров")?.[1] < 100
                                                ? "Повышенная вероятность наличия анемии. Рекомендуется дополнительная проверка по биохимии."
                                                : "Признаков анемии не выявлено."
                                        }
                                    </p>

                                    {/* Анализы вне нормы - только для врача */}
                                    {user && user.role_id === 1 &&
                                        <ul>
                                        {/* Эритроциты */}
                                        {formData["Эритроциты"] !== undefined && (
                                            <>
                                                {formData["Эритроциты"] > 5.4 && (
                                                    <li>
                                                        <strong>Эритроциты повышены </strong>: может указывать на обезвоживание, 
                                                        хроническую гипоксию (например, при заболеваниях лёгких или сердца), 
                                                        полицитемию или быть следствием курения. Требуется оценка в комплексе с гемоглобином.
                                                    </li>
                                                )}
                                                {formData["Эритроциты"] < 4.2 && (
                                                    <li>
                                                        <strong>Эритроциты понижены</strong>: характерно для анемий различного генеза, 
                                                        кровопотери, гипергидратации или может быть следствием угнетения костного мозга.
                                                    </li>
                                                )}
                                            </>
                                        )}

                                        {/* Гемоглобин */}
                                        {formData["Гемоглобин"] !== undefined && (
                                            <>
                                                {formData["Гемоглобин"] > 160 && (
                                                    <li>
                                                        <strong>Гемоглобин повышен</strong>: может быть при эритроцитозе, 
                                                        хронической гипоксии, обезвоживании, курении. Также встречается 
                                                        при некоторых врождённых состояниях (например, семейный эритроцитоз).
                                                    </li>
                                                )}
                                                {formData["Гемоглобин"] < 100 && (
                                                    <li>
                                                        <strong>Гемоглобин понижен</strong>: основной признак анемии. 
                                                        Требуется уточнение типа анемии по другим эритроцитарным индексам 
                                                        и биохимическому анализу крови.
                                                    </li>
                                                )}
                                            </>
                                        )}

                                        {/* Средний объем эритроцита (MCV) */}
                                        {formData["Средний объем эритроцита"] !== undefined && (
                                            <>
                                                {formData["Средний объем эритроцита"] > 100 && (
                                                    <li>
                                                        <strong>Средний объем эритроцита повышен (макроцитоз)</strong>: характерно для B12-дефицитной 
                                                        или фолиеводефицитной анемии, при заболеваниях печени, гипотиреозе, 
                                                        миелодиспластическом синдроме. Может быть при хроническом алкоголизме.
                                                    </li>
                                                )}
                                                {formData["Средний объем эритроцита"] < 80 && (
                                                    <li>
                                                        <strong>Средний объем эритроцита понижен (микроцитоз)</strong>: типично для железодефицитной анемии, 
                                                        талассемии, анемии хронических заболеваний. Требуется оценка уровня железа 
                                                        и ферритина для уточнения генеза.
                                                    </li>
                                                )}
                                            </>
                                        )}

                                        {/* Среднее содержание гемоглобина в эритроците (MCH) */}
                                        {formData["Среднее содержание гемоглобина в эритроците"] !== undefined && (
                                            <>
                                                {formData["Среднее содержание гемоглобина в эритроците"] > 33 && (
                                                    <li>
                                                        <strong>Среднее содержание гемоглобина в эритроците повышено (гиперхромия)</strong>: встречается при макроцитарных 
                                                        анемиях (B12-дефицитная, фолиеводефицитная), может быть при сфероцитозе.
                                                    </li>
                                                )}
                                                {formData["Среднее содержание гемоглобина в эритроците"] < 27 && (
                                                    <li>
                                                        <strong>Среднее содержание гемоглобина в эритроците понижено (гипохромия)</strong>: характерный признак 
                                                        железодефицитной анемии, талассемии или анемии хронических заболеваний.
                                                    </li>
                                                )}
                                            </>
                                        )}

                                        {/* Средняя концентрация гемоглобина в эритроците (MCHC) */}
                                        {formData["Средняя концентрация гемоглобина в эритроците"] !== undefined && (
                                            <>
                                                {formData["Средняя концентрация гемоглобина в эритроците"] > 360 && (
                                                    <li>
                                                        <strong>Средняя концентрация гемоглобина в эритроците повышена</strong>: может быть при наследственном сфероцитозе, 
                                                        серповидноклеточной анемии, при выраженном обезвоживании. 
                                                        Также встречается при некоторых гемоглобинопатиях.
                                                    </li>
                                                )}
                                                {formData["Средняя концентрация гемоглобина в эритроците"] < 320 && (
                                                    <li>
                                                        <strong>Средняя концентрация гемоглобина в эритроците понижена</strong>: характерно для железодефицитной анемии, 
                                                        талассемии. Крайне низкие значения могут быть при гипохромных анемиях.
                                                    </li>
                                                )}
                                            </>
                                        )}
                                    </ul>
                                }
                                </>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default NewCheckupPage;