import React, { useState, useEffect } from 'react';
import axios from "axios";
import "../biochem/biochem.css";

const BiochemPage = () => {
    const [formData, setFormData] = useState({});
    const [result, setResult] = useState(null);
    const [user, setUser] = useState(null);
    const [patients, setPatients] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredSuggestions, setFilteredSuggestions] = useState([]);
    const [selectedPatient, setSelectedPatient] = useState(null);

    const [biochemAccessAnemia, setBiochemAccessAnemia] = useState(false);
    const [biochemAccessInflam, setBiochemAccessInflam] = useState(false);

    useEffect(() => {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);
            setBiochemAccessAnemia(parsedUser.biochem_access_anemia);
            setBiochemAccessInflam(parsedUser.biochem_access_inflam);
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
        }
    }, [user]);

    const getPatients = async () => {
        try {
            if (user?.role_id === 1 && patients.length === 0) {
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

    useEffect(() => {
        if (user && user.role_id === 1) {
            getPatients();
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
        setSelectedPatient({ label: input, user_id: '' });
    };

    const handleSuggestionClick = (patient) => {
        setSelectedPatient({ label: `${patient.username}`, user_id: patient.user_id });
        setSearchTerm('');
        setFilteredSuggestions([]);
        getPatientProfile(patient.user_id);
    };

    const getPatientProfile = async (patientId) => {
        try {
            const response = await fetch(`http://localhost:5000/api/patient?patient_id=${patientId}`, {
                method: 'GET',
                credentials: 'include'
            });
            const data = await response.json();
            setFormData((prev) => ({
                ...prev,
                patient_id: data.user_id,
                sex: data.sex ? 1 : 0,
                age: data.age,
                polis: data.polis
            }));
        } catch (error) {
            console.error('Ошибка получения данных пациента:', error);
        }
    };

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
            alert("Ошибка выхода!", error);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const translatedKeys = {
            'alt': 'Аланинаминотрансфераза',
            'ast': 'Аспартатаминотрансфераза',
            'alp': 'Щелочная фосфатаза',
            'bilirubin': 'Билирубин',
            'creatinine': 'Креатинин',
            'urea': 'Мочевина',
            'amylase': 'Амилоза',
            'lipase': 'Липаза',
            'ldh': 'Лактатдегидрогеназа',
            'erythrocytes': 'Эритроциты',
            'hemoglobin': 'Гемоглобин',
            'meanCorpuscularVolume': 'Средний объем эритроцита',
            'meanHemoglobinContent': 'Среднее содержание гемоглобина в эритроците',
            'meanHemoglobinConcentration': 'Средняя концентрация гемоглобина в эритроците',
            'hematocrit': 'Гематокрит',
            'rdw': 'Ширина распределения эритроцитов по объему',
            'serumIron': 'Сывороточное железо',
            'transferrinSaturation': 'Насыщение трансферрина',
            'totalIronBindingCapacity': 'Общая железосвязывающая способность',
            'ferritin': 'Ферритин',
            'vitaminB9': 'Витамин B9',
            'vitaminB12': 'Витамин В12'
        };

        const translatedData = {};
        for (const key in formData) {
            translatedData[translatedKeys[key] || key] = formData[key];
        }

        let url = `http://localhost:5000/api/biochem_detect`;
        if (user?.role_id === 1 && selectedPatient?.user_id) {
            url += `?patient_id=${selectedPatient.user_id}`;
        }

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(translatedData),
                credentials: 'include'
            });
            const data = await response.json();
            setResult(data);
        } catch (error) {
            console.error('Ошибка запроса:', error);
        }
    };

    const inflammationFields = [
        { name: 'alt', label: 'Аланинаминотрансфераза' },
        { name: 'ast', label: 'Аспартатаминотрансфераза' },
        { name: 'alp', label: 'Щелочная фосфатаза' },
        { name: 'bilirubin', label: 'Билирубин' },
        { name: 'creatinine', label: 'Креатинин' },
        { name: 'urea', label: 'Мочевина' },
        { name: 'amylase', label: 'Амилоза' },
        { name: 'lipase', label: 'Липаза' },
        { name: 'ldh', label: 'Лактатдегидрогеназа' }
    ];

    const anemiaFields = [
        { name: 'erythrocytes', label: 'Эритроциты' },
        { name: 'hemoglobin', label: 'Гемоглобин' },
        { name: 'meanCorpuscularVolume', label: 'Средний объем эритроцита' },
        { name: 'meanHemoglobinContent', label: 'Среднее содержание гемоглобина в эритроците' },
        { name: 'meanHemoglobinConcentration', label: 'Средняя концентрация гемоглобина в эритроците' },
        { name: 'hematocrit', label: 'Гематокрит' },
        { name: 'rdw', label: 'Ширина распределения эритроцитов по объему' },
        { name: 'serumIron', label: 'Сывороточное железо' },
        { name: 'transferrinSaturation', label: 'Насыщение трансферрина' },
        { name: 'totalIronBindingCapacity', label: 'Общая железосвязывающая способность' },
        { name: 'ferritin', label: 'Ферритин' },
        { name: 'vitaminB9', label: 'Витамин B9' },
        { name: 'vitaminB12', label: 'Витамин В12' }
    ];

    const visibleFields = [
        ...(biochemAccessInflam ? inflammationFields : []),
        ...(biochemAccessAnemia ? anemiaFields : [])
    ];

    // Нормы для биохимических показателей
    const norms = {
        'Аланинаминотрансфераза': { range: [0, 40], unit: 'Ед/л' },
        'Аспартатаминотрансфераза': { range: [0, 40], unit: 'Ед/л' },
        'Щелочная фосфатаза': { range: [30, 120], unit: 'Ед/л' },
        'Билирубин': { range: [3.4, 20.5], unit: 'мкмоль/л' },
        'Креатинин': { range: [62, 106], unit: 'мкмоль/л' },
        'Мочевина': { range: [2.5, 8.3], unit: 'ммоль/л' },
        'Амилоза': { range: [28, 100], unit: 'Ед/л' },
        'Липаза': { range: [0, 190], unit: 'Ед/л' },
        'Лактатдегидрогеназа': { range: [135, 225], unit: 'Ед/л' },
        'Эритроциты': { range: [4.2, 5.4], unit: '×10¹²/л' },
        'Гемоглобин': { range: [100, 160], unit: 'г/л' },
        'Средний объем эритроцита': { range: [80, 100], unit: 'фл' },
        'Среднее содержание гемоглобина в эритроците': { range: [27, 33], unit: 'пг' },
        'Средняя концентрация гемоглобина в эритроците': { range: [320, 360], unit: 'г/л' },
        'Гематокрит': { range: [36, 48], unit: '%' },
        'Ширина распределения эритроцитов по объему': { range: [11.5, 14.5], unit: '%' },
        'Сывороточное железо': { range: [9, 30.4], unit: 'мкмоль/л' },
        'Насыщение трансферрина': { range: [15, 50], unit: '%' },
        'Общая железосвязывающая способность': { range: [45, 72], unit: 'мкмоль/л' },
        'Ферритин': { range: [20, 250], unit: 'мкг/л' },
        'Витамин B9': { range: [4, 17], unit: 'нг/мл' },
        'Витамин В12': { range: [200, 914], unit: 'пг/мл' }
    };

    return (
        <div className="biochem-container">
            <div className="biochem-header">
                <h2>Биохимия</h2>
            </div>

            <form onSubmit={handleSubmit}>
                {user?.role_id === 1 && (
                    <div className="biochem-form-group">
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
                        <div className="biochem-form-group">
                            <label htmlFor="sex">Пол:</label>
                            <input type="text" id="sex" name="sex" value={formData.sex ? "Женский" : "Мужской"} readOnly />
                        </div>
                        <div className="biochem-form-group">
                            <label htmlFor="age">Возраст:</label>
                            <input type="number" id="age" name="age" value={formData.age} readOnly />
                        </div>
                        <div className="biochem-form-group">
                            <label htmlFor="polis">Полис ОМС:</label>
                            <input type="number" id="polis" name="polis" value={formData.polis} readOnly />
                        </div>
                    </>
                )}

                {user && user.role_id === 0 && (
                    <>
                        <div className="biochem-form-group">
                            <label>Пол:</label>
                            <input type="text" value={user.sex ? "Женский" : "Мужской"} readOnly />
                        </div>
                        <div className="biochem-form-group">
                            <label>Возраст:</label>
                            <input type="number" value={user.age} readOnly />
                        </div>
                        <div className="biochem-form-group">
                            <label>Полис ОМС:</label>
                            <input type="number" value={user.polis} readOnly />
                        </div>
                    </>
                )}

                {!user && (
                    <>
                        <div className="biochem-form-group">
                            <label htmlFor="sex">Пол:</label>
                            <select id="sex" name="sex" value={formData.sex} onChange={handleChange} required>
                                <option value="0">Мужской</option>
                                <option value="1">Женский</option>
                            </select>
                        </div>
                        <div className="biochem-form-group">
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

                {visibleFields.map(({ name, label }) => (
                    <div className="biochem-form-group" key={name}>
                        <label htmlFor={name}>{label}:</label>
                        <div className="biochem-input-with-unit">
                            <input
                                type="number"
                                id={name}
                                name={name}
                                step="0.1"
                                value={formData[name] || ''}
                                onChange={handleChange}
                                required
                            />
                            <span className="biochem-unit">{norms[label]?.unit || ''}</span>
                        </div>
                    </div>
                ))}

                <div className="biochem-submit-button-container">
                    <button type="submit" className="biochem-submit-button">
                        Получить результат
                    </button>
                </div>
            </form>

            {result && (
                <div className="biochem-results">
                    {/* Таблица с нормами */}
                    <table className="biochem-norms-table">
                        <thead>
                            <tr>
                                <th>Показатель</th>
                                <th>Введённое значение</th>
                                <th>Норма</th>
                                <th>Вердикт</th>
                            </tr>
                        </thead>
                        <tbody>
                            {visibleFields.map(({ name, label }) => {
                                const value = parseFloat(formData[name]);
                                const norm = norms[label];
                                let verdict = "В норме";
                                let verdictColor = "green";

                                if (norm) {
                                    if (value < norm.range[0]) {
                                        verdict = "Ниже нормы";
                                        verdictColor = "red";
                                    } else if (value > norm.range[1]) {
                                        verdict = "Выше нормы";
                                        verdictColor = "orange";
                                    }
                                } else {
                                    verdict = "Норма не определена";
                                    verdictColor = "gray";
                                }

                                return (
                                    <tr key={name}>
                                        <td>{label}</td>
                                        <td>{value} {norm?.unit ? `[${norm.unit}]` : ''}</td>
                                        <td>{norm ? `${norm.range[0]} - ${norm.range[1]} [${norm.unit}]` : '-'}</td>
                                        <td style={{ color: verdictColor }}>{verdict}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    {result.inflam_result && (
                        <>
                            <h2>Результаты воспаления</h2>
                            <table>
                                <thead>
                                    <tr><th>Локализация</th><th>Вероятность (%)</th></tr>
                                </thead>
                                <tbody>
                                    {result.inflam_result.map(([loc, prob]) => (
                                        <tr key={loc}>
                                            <td>{loc === 'unknown' ? 'Неизвестно' : loc}</td>
                                            <td>{prob.toFixed(2)}%</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {user?.role_id === 1 && 
                                <p>
                                    <strong>Медицинская сводка по самой вероятной локализации:</strong>{" "}
                                    {{
                                        'Легкие': "Наибольшая вероятность воспаления в легких. Это может указывать на наличие бронхита, пневмонии или другого респираторного воспалительного процесса. Рекомендуется консультация пульмонолога и проведение КТ или рентгена грудной клетки.",
                                        'Печень': "Воспаление, вероятнее всего, локализовано в печени. Возможны состояния, такие как гепатит или жировая дистрофия печени. Рекомендуется УЗИ печени и расширенные печеночные пробы.",
                                        'Почки': "Признаки указывают на воспалительный процесс в почках, что может свидетельствовать о пиелонефрите или гломерулонефрите. Желательно сдать общий анализ мочи и выполнить УЗИ почек.",
                                        'Поджелудочная железа': "Возможное воспаление в области поджелудочной железы. Это может быть связано с панкреатитом. Необходимы анализы ферментов (амилаза, липаза) и УЗИ брюшной полости.",
                                        'unknown': "Не удалось определить локализацию воспаления с достаточной точностью. Требуется комплексное обследование для выявления причины.",
                                    }[result.inflam_result[0][0]]}
                                </p>
                            }
                        </>
                    )}

                    {result.anemia_result && (
                        <>
                            <h2>Результаты анемии</h2>
                            <table>
                                <thead>
                                    <tr><th>Тип анемии</th><th>Вероятность (%)</th></tr>
                                </thead>
                                <tbody>
                                    {result.anemia_result.map(([type, prob]) => (
                                        <tr key={type}><td>{type}</td><td>{prob.toFixed(2)}%</td></tr>
                                    ))}
                                </tbody>
                            </table>
                            
                            {user?.role_id === 1 ? (
                                <>
                                    <p>
                                        <strong>Медицинская сводка по самому вероятному диагнозу:</strong>{" "}
                                        {{
                                            'Железодефицитная анемия': "Большая вероятность наличия железодефицитной анемии. Возможные причины: Недостаток железа (кровопотери, нарушение всасывания, недостаток в пище), хроническое воспаление, талассемия. Рекомендуемое лечение: Препараты железа (перорально/внутривенно), коррекция питания или проверка наличия воспалений.",
                                            'Анемия, связанная с дефицитом витамина B12': "Большая вероятность наличия анемии. Возможная причина: Дефицит B12 (атрофический гастрит, болезнь Крона, веганство, лекарственное воздействие). Рекомендуемое лечение: Инъекции B12 (цианокобаламин), пересмотр применяемых лекарств, другие коррекции причины.",
                                            'Анемия, связанная с дефицитом витамина B9': "Большая вероятность наличия анемии. Возможные причины:  Недостаток фолатов (алкоголизм, беременность, мальабсорбция, лекарственное воздействие). Рекомендуемое лечение: Прием фолиевой кислоты, коррекция диеты и образа жизни, пересмотр применяемых лекарств.",
                                            'Другой тип анемии': "Возможное наличие нормоцитарной гипохромной или нормохромной анемии. Диагноз может быть связан с гемолитической анемией, апластической анемией, анемией хронических болезней. Рекомендуется уточнение причины (аутоиммунные процессы, заболевания почек, генетические дефекты).",
                                            'Здоров': "Большая вероятность отстутствия негативных диагнозов. Дополнительная диагностика по усмотрению врача.",
                                        }[result.anemia_result[0][0]]}
                                    </p>

                                    {/* Анализы вне нормы - только для врача */}
                                    <ul>
                                        {/* Эритроциты */}
                                        {formData["erythrocytes"] !== undefined && (
                                            <>
                                                {formData["erythrocytes"] > 5.4 && (
                                                    <li>
                                                        <strong>Эритроциты повышены </strong>: может указывать на обезвоживание, 
                                                        хроническую гипоксию (например, при заболеваниях лёгких или сердца), 
                                                        полицитемию или быть следствием курения. Требуется оценка в комплексе с гемоглобином.
                                                    </li>
                                                )}
                                                {formData["erythrocytes"] < 4.2 && (
                                                    <li>
                                                        <strong>Эритроциты понижены</strong>: характерно для анемий различного генеза, 
                                                        кровопотери, гипергидратации или может быть следствием угнетения костного мозга.
                                                    </li>
                                                )}
                                            </>
                                        )}

                                        {/* Гемоглобин */}
                                        {formData["hemoglobin"] !== undefined && (
                                            <>
                                                {formData["hemoglobin"] > 160 && (
                                                    <li>
                                                        <strong>Гемоглобин повышен</strong>: может быть при эритроцитозе, 
                                                        хронической гипоксии, обезвоживании, курении. Также встречается 
                                                        при некоторых врождённых состояниях (например, семейный эритроцитоз).
                                                    </li>
                                                )}
                                                {formData["hemoglobin"] < 100 && (
                                                    <li>
                                                        <strong>Гемоглобин понижен</strong>: основной признак анемии. 
                                                        Требуется уточнение типа анемии по другим эритроцитарным индексам, 
                                                        показателям уровня железа, В12 и В9.
                                                    </li>
                                                )}
                                            </>
                                        )}

                                        {/* Средний объем эритроцита (MCV) */}
                                        {formData["meanCorpuscularVolume"] !== undefined && (
                                            <>
                                                {formData["meanCorpuscularVolume"] > 100 && (
                                                    <li>
                                                        <strong>Средний объем эритроцита повышен (макроцитоз)</strong>: характерно для B12-дефицитной 
                                                        или фолиеводефицитной анемии, при заболеваниях печени, гипотиреозе, 
                                                        миелодиспластическом синдроме. Может быть при хроническом алкоголизме.
                                                    </li>
                                                )}
                                                {formData["meanCorpuscularVolume"] < 80 && (
                                                    <li>
                                                        <strong>Средний объем эритроцита понижен (микроцитоз)</strong>: типично для железодефицитной анемии, 
                                                        талассемии, анемии хронических заболеваний. Требуется оценка уровня железа 
                                                        и ферритина для уточнения генеза.
                                                    </li>
                                                )}
                                            </>
                                        )}

                                        {/* Среднее содержание гемоглобина в эритроците (MCH) */}
                                        {formData["meanHemoglobinContent"] !== undefined && (
                                            <>
                                                {formData["meanHemoglobinContent"] > 33 && (
                                                    <li>
                                                        <strong>Среднее содержание гемоглобина в эритроците повышено (гиперхромия)</strong>: встречается при макроцитарных 
                                                        анемиях (B12-дефицитная, фолиеводефицитная), может быть при сфероцитозе.
                                                    </li>
                                                )}
                                                {formData["meanHemoglobinContent"] < 27 && (
                                                    <li>
                                                        <strong>Среднее содержание гемоглобина в эритроците понижено (гипохромия)</strong>: характерный признак 
                                                        железодефицитной анемии, талассемии или анемии хронических заболеваний.
                                                    </li>
                                                )}
                                            </>
                                        )}

                                        {/* Средняя концентрация гемоглобина в эритроците (MCHC) */}
                                        {formData["meanHemoglobinConcentration"] !== undefined && (
                                            <>
                                                {formData["meanHemoglobinConcentration"] > 360 && (
                                                    <li>
                                                        <strong>Средняя концентрация гемоглобина в эритроците повышена</strong>: может быть при наследственном сфероцитозе, 
                                                        серповидноклеточной анемии, при выраженном обезвоживании. 
                                                        Также встречается при некоторых гемоглобинопатиях.
                                                    </li>
                                                )}
                                                {formData["meanHemoglobinConcentration"] < 320 && (
                                                    <li>
                                                        <strong>Средняя концентрация гемоглобина в эритроците понижена</strong>: характерно для железодефицитной анемии, 
                                                        талассемии. Крайне низкие значения могут быть при гипохромных анемиях.
                                                    </li>
                                                )}
                                            </>
                                        )}

                                        {/* Гематокрит */}
                                        {formData["hematocrit"] !== undefined && (
                                            <>
                                                {formData["hematocrit"] > 48 && (
                                                    <li>
                                                        <strong>Гематокрит повышен</strong>: может указывать на полицитемию, обезвоживание, 
                                                        хроническую гипоксию или быть следствием курения. Также встречается при 
                                                        некоторых опухолевых заболеваниях.
                                                    </li>
                                                )}
                                                {formData["hematocrit"] < 36 && (
                                                    <li>
                                                        <strong>Гематокрит понижен</strong>: характерно для анемий различного генеза, 
                                                        кровопотери, гипергидратации. Может быть при беременности.
                                                    </li>
                                                )}
                                            </>
                                        )}

                                        {/* Ширина распределения эритроцитов по объему (RDW) */}
                                        {formData["rdw"] !== undefined && (
                                            <>
                                                {formData["rdw"] > 14.5 && (
                                                    <li>
                                                        <strong>Ширина распределения эритроцитов по объему повышена (анизоцитоз)</strong>: 
                                                        характерно для железодефицитной анемии, B12-дефицитной анемии, 
                                                        миелодиспластического синдрома. Может быть при гемолитических анемиях.
                                                    </li>
                                                )}
                                                {formData["rdw"] < 11.5 && (
                                                    <li>
                                                        <strong>Ширина распределения эритроцитов по объему понижена</strong>: 
                                                        встречается редко, может указывать на микроцитарные анемии без анизоцитоза 
                                                        или нормоцитарные состояния.
                                                    </li>
                                                )}
                                            </>
                                        )}

                                        {/* Сывороточное железо */}
                                        {formData["serumIron"] !== undefined && (
                                            <>
                                                {formData["serumIron"] > 30.4 && (
                                                    <li>
                                                        <strong>Сывороточное железо повышено</strong>: может быть при гемохроматозе, 
                                                        гемолитических анемиях, талассемии, остром гепатите или при избыточном 
                                                        приеме препаратов железа.
                                                    </li>
                                                )}
                                                {formData["serumIron"] < 9 && (
                                                    <li>
                                                        <strong>Сывороточное железо понижено</strong>: характерно для железодефицитной анемии, 
                                                        анемии хронических заболеваний, при хронических кровопотерях или нарушении 
                                                        всасывания железа.
                                                    </li>
                                                )}
                                            </>
                                        )}

                                        {/* Насыщение трансферрина */}
                                        {formData["transferrinSaturation"] !== undefined && (
                                            <>
                                                {formData["transferrinSaturation"] > 50 && (
                                                    <li>
                                                        <strong>Насыщение трансферрина повышено</strong>: может указывать на гемохроматоз, 
                                                        избыточное поступление железа, гемолитические состояния или некоторые 
                                                        виды анемий (сидеробластные).
                                                    </li>
                                                )}
                                                {formData["transferrinSaturation"] < 15 && (
                                                    <li>
                                                        <strong>Насыщение трансферрина понижено</strong>: характерно для железодефицитной анемии, 
                                                        анемии хронических заболеваний, при воспалительных процессах.
                                                    </li>
                                                )}
                                            </>
                                        )}

                                        {/* Общая железосвязывающая способность (ОЖСС) */}
                                        {formData["totalIronBindingCapacity"] !== undefined && (
                                            <>
                                                {formData["totalIronBindingCapacity"] > 72 && (
                                                    <li>
                                                        <strong>Общая железосвязывающая способность повышена</strong>: характерно для 
                                                        железодефицитных состояний, при беременности, приеме оральных контрацептивов.
                                                    </li>
                                                )}
                                                {formData["totalIronBindingCapacity"] < 45 && (
                                                    <li>
                                                        <strong>Общая железосвязывающая способность понижена</strong>: может быть при 
                                                        гемохроматозе, анемии хронических заболеваний, при хронических инфекциях 
                                                        или злокачественных новообразованиях.
                                                    </li>
                                                )}
                                            </>
                                        )}

                                        {/* Ферритин */}
                                        {formData["ferritin"] !== undefined && (
                                            <>
                                                {formData["ferritin"] > 250 && (
                                                    <li>
                                                        <strong>Ферритин повышен</strong>: может указывать на гемохроматоз, 
                                                        воспалительные процессы, заболевания печени, некоторые инфекции или 
                                                        злокачественные новообразования. Также повышается при избыточном 
                                                        приеме препаратов железа.
                                                    </li>
                                                )}
                                                {formData["ferritin"] < 20 && (
                                                    <li>
                                                        <strong>Ферритин понижен</strong>: основной маркер дефицита железа в организме. 
                                                        Характерно для железодефицитной анемии. Может быть при беременности 
                                                        без анемии.
                                                    </li>
                                                )}
                                            </>
                                        )}

                                        {/* Витамин B9 (фолиевая кислота) */}
                                        {formData["vitaminB9"] !== undefined && (
                                            <>
                                                {formData["vitaminB9"] > 17 && (
                                                    <li>
                                                        <strong>Витамин B9 (фолиевая кислота) повышен</strong>: редко имеет клиническое значение. 
                                                        Может быть при избыточном приеме препаратов фолиевой кислоты, 
                                                        вегетарианской диете.
                                                    </li>
                                                )}
                                                {formData["vitaminB9"] < 4 && (
                                                    <li>
                                                        <strong>Витамин B9 (фолиевая кислота) понижен</strong>: характерно для фолиеводефицитной анемии, 
                                                        при алкоголизме, мальабсорбции, беременности, приеме некоторых 
                                                        лекарственных препаратов (метотрексат, противосудорожные).
                                                    </li>
                                                )}
                                            </>
                                        )}

                                        {/* Витамин B12 (кобаламин) */}
                                        {formData["vitaminB12"] !== undefined && (
                                            <>
                                                {formData["vitaminB12"] > 914 && (
                                                    <li>
                                                        <strong>Витамин B12 повышен</strong>: редко имеет клиническое значение. 
                                                        Может быть при заболеваниях печени, почек, миелопролиферативных 
                                                        заболеваниях или при избыточном введении препаратов B12.
                                                    </li>
                                                )}
                                                {formData["vitaminB12"] < 200 && (
                                                    <li>
                                                        <strong>Витамин B12 понижен</strong>: характерно для B12-дефицитной анемии, 
                                                        при атрофическом гастрите, болезни Крона, целиакии, веганской диете, 
                                                        гельминтозах, приеме некоторых лекарств.
                                                    </li>
                                                )}
                                            </>
                                        )}
                                    </ul>
                                </>
                            ) : (
                                <p>
                                    <strong>Результат анализа на анемию:</strong>{" "}
                                    {
                                        result.anemia_result.find(([label]) => label === "Здоров")?.[1] < 100
                                            ? "Повышенная вероятность наличия анемии. Не рекомендуется заниматься самолечением. Оформите запись ко врачу для точной интерпретации анализов, постановки диагноза и назначения лечения при необходимости."
                                            : "Признаков анемии не выявлено."
                                    }
                                </p>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default BiochemPage;