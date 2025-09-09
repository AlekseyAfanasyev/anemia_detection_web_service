import React, { useState, useEffect, useCallback } from 'react';
import axios from "axios";
import "../checkup/checkup.css";

const CheckupPage = () => {
    const [formData, setFormData] = useState({
        sex: 0,
        age: 0,
        CRP: '',
        ESR: '',
        WBC: '',
        Monocytes: '',
        Lymphocytes: '',
        Basophils: '',
        Eosinophils: '',
        patient_id: '',
    });

    const [result, setResult] = useState(null);
    const [user, setUser] = useState(JSON.parse(localStorage.getItem("user")));
    const [patients, setPatients] = useState([]);
    const [selectedPatient, setSelectedPatient] = useState(null);

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

    // асинхронная функция для получения списка пациентов
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
            url = `http://localhost:5000/api/checkup`
        }
        else if (user && user.role_id === 1) {
            //url = `http://localhost:5000/api/checkup?user_id=${user.user_id}&patient_id=${selectedPatient}`
            url = `http://localhost:5000/api/checkup?patient_id=${selectedPatient}`
        }
        else url = `http://localhost:5000/api/checkup` // для других ролей (админа) надо будет исправить по необходимости

        try {
            // отправляем данные на сервер
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedFormData),
                credentials: 'include'
            });
            const data = await response.json();
            setResult(data.prediction);

            if (user && user.role_id === 1) {
                getPatientProfile(user.user_id)
            }
        } catch (error) {
            console.error('Ошибка запроса:', error);
        }
    };

    const [isExpanded, setIsExpanded] = useState(false);

    const toggleResults = () => {
        setIsExpanded(!isExpanded);
    };

    // параллакс
    window.addEventListener('scroll', function () {
        const background = document.body; // привязываем центр картинке к body
        let offset = window.scrollY; // оффсет по У относительно открытого окна
        background.style.backgroundPosition = 'center ' + (-offset * 0.4) + 'px'; // перемещаем картинку на оффсет
        // чем дальше множитель от 1 - тем быстрее картинка двигается
    });   

    return (
            <div className="checkup-container">
                <div className="checkup-header">
                    <h2>Общий анализ крови</h2>
                    <div className="checkup-user-info">
                        
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    {user?.role_id === 1 && (
                        <div className="checkup-form-group">
                            <label htmlFor="patient">Пациент:</label>
                            <select id="patient" name="patient" onChange={handlePatientChange} required>
                                <option value="">--Выберите пациента--</option>
                                {patients.map((patient) => (
                                    <option key={patient.user_id} value={patient.user_id}>
                                        {patient.user_id} - {patient.username}
                                    </option>
                                ))}
                            </select>
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

                    {["CRP", "ESR", "WBC", "Monocytes", "Lymphocytes", "Basophils", "Eosinophils"].map((field) => (
                        <div className="checkup-form-group" key={field}>
                            <label htmlFor={field}>{field}:</label>
                            <input
                                type="number"
                                id={field}
                                name={field}
                                step="0.01"
                                value={formData[field]}
                                onChange={handleChange}
                                required
                            />
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
                                    <th>Норма (диапазон)</th>
                                    <th>Вердикт</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[
                                    { name: "CRP", range: [0, 5] },
                                    { name: "ESR", range: [2, 20] },
                                    { name: "WBC", range: [4, 10] },
                                    { name: "Monocytes", range: [2, 10] },
                                    { name: "Lymphocytes", range: [18, 42] },
                                    { name: "Basophils", range: [0, 1] },
                                    { name: "Eosinophils", range: [1, 6] },
                                ].map(({ name, range }) => {
                                    const value = Number.parseFloat(formData[name]);
                                    let verdict = "В норме";
                                    let verdictStyle = { color: 'green' };  // По умолчанию "В норме" зелёное
                                    if (value < range[0]) {
                                        verdict = "Ниже нормы";
                                        verdictStyle = { color: 'red' };  // Если ниже нормы, красный
                                    } else if (value > range[1]) {
                                        verdict = "Выше нормы";
                                        verdictStyle = { color: 'orange' };  // Если выше нормы, оранжевый
                                    }

                                    return (
                                        <tr key={name}>
                                            <td>{name}</td>
                                            <td>{value}</td>
                                            <td>{range[0]} - {range[1]}</td>
                                            <td style={verdictStyle}>{verdict}</td>  {/* Применяем стиль */}
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>

                        <button onClick={toggleResults} disabled={!user} className="checkup-health-status">
                            {(() => {
                                const healthyClass = result.find(([disease]) => disease === "healthy")
                                const healthyProbability = healthyClass ? healthyClass[1] : 0
                                let healthStatus = ""

                                if (healthyProbability > 0.97) {
                                    healthStatus = "Вы здоровы"
                                } else if (healthyProbability > 0.9) {
                                    healthStatus = "Возможно, есть воспаление или анемия"
                                } else if (healthyProbability > 0.8) {
                                    healthStatus = "Скорее всего, есть болячка какая-то"
                                } else if (healthyProbability > 0.7) {
                                    healthStatus = "Надо к врачу"
                                } else {
                                    healthStatus = "Надо точно к врачу"
                                }

                                return (
                                    <h3>
                                        {healthStatus} {user ? "(нажмите, чтобы посмотреть результаты от ММШ)" : ""}
                                    </h3>
                                )
                            })()}
                        </button>

                        {!user && <p className="checkup-warning">Чтобы увидеть историю анализов и подробные результаты, войдите в систему</p>}

                        {user && isExpanded && (
                            <div className="checkup-expanded-results">
                                <h2>Результаты анализа</h2>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Болезнь</th>
                                            <th>Вероятность</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {result.map(([disease, probability]) => (
                                            <tr key={disease}>
                                                <td>{disease}</td>
                                                <td>{(probability * 100).toFixed(2)}%</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {user.role_id === 1 && (
                                    <h2>
                                        Для врача будет подробное описание по самым вероятным болезням, пока что это заглушка,
                                        в которой очень много повторяющегося текста. Для врача будет подробное описание по самым
                                        вероятным болезням, пока что это заглушка, в которой очень много повторяющегося текста.
                                        Для врача будет подробное описание по самым вероятным болезням, пока что это заглушка,
                                        в которой очень много повторяющегося текста. Для врача будет подробное описание по самым
                                        вероятным болезням, пока что это заглушка, в которой очень много повторяющегося текста.
                                        Для врача будет подробное описание по самым вероятным болезням, пока что это заглушка,
                                        в которой очень много повторяющегося текста. Для врача будет подробное описание по самым
                                        вероятным болезням, пока что это заглушка, в которой очень много повторяющегося текста.
                                        Для врача будет подробное описание по самым вероятным болезням, пока что это заглушка,
                                        в которой очень много повторяющегося текста. Для врача будет подробное описание по самым
                                        вероятным болезням, пока что это заглушка, в которой очень много повторяющегося текста.
                                    </h2>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
    );
};

export default CheckupPage;
