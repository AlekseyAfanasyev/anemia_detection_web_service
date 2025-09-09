import React, { useState, useEffect } from 'react';
import "../profile/profile.css";

const History = () => {
    const [user, setUser] = useState(() => {
        return JSON.parse(localStorage.getItem("user")) || null;
    });
    const [patients, setPatients] = useState([]);
    const [selectedPatientId, setSelectedPatientId] = useState('');
    const [history, setHistory] = useState([]);
    const [sortOrder, setSortOrder] = useState('desc');
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
    }, []);

    useEffect(() => {
        if (user?.role_id === 1) {
            fetchPatients();
        }
        fetchHistory();
    }, [user?.role_id]);

    const fetchPatients = async () => {
        try {
            const response = await fetch(`http://localhost:5000/api/patients`, {
                method: 'GET',
                credentials: 'include'
            });
            if (!response.ok) throw new Error('Ошибка получения списка пациентов');

            const data = await response.json();
            setPatients(data);
        } catch (error) {
            console.error('Ошибка при загрузке списка пациентов:', error);
        }
    };

    const handlePatientSelect = (patientId) => {
        setSelectedPatientId(patientId);
        fetchHistory(patientId);
    };

    const fetchHistory = async (selectedPatientId) => {
        try {
            const url = selectedPatientId
                ? `http://localhost:5000/api/history?patient_id=${selectedPatientId}`
                : `http://localhost:5000/api/history`;

            const response = await fetch(url, {
                method: 'GET',
                credentials: 'include'
            });
            if (!response.ok) throw new Error("Ошибка получения истории");

            const data = await response.json();
            setHistory(data);

        } catch (error) {
            console.error("Ошибка при загрузке истории:", error);
        }
    };

    const filteredHistory = history.filter(item => {
        if (filter === 'all') return true;
        if (filter === 'checked_by_doc' && item.checked_by_doc) return true;
        if (filter === 'self_entered' && !item.checked_by_doc) return true;
        return false;
    });

    const sortedHistory = [...filteredHistory].sort((a, b) => {
        return sortOrder === 'asc' ? new Date(a.date) - new Date(b.date) : new Date(b.date) - new Date(a.date);
    });

    const getVerdictStyle = (verdict) => {
        if (verdict === "В норме") {
            return { color: 'green' };
        } else if (verdict === "Отклонение") {
            return { color: 'red' };
        } else if (verdict === "Повышен") {
            return { color: 'orange' };
        }
        return {}; // default style if needed
    };

    return (
        <div className="profile-container">
            <h2>
                История анализов
                <select onChange={(e) => setSortOrder(e.target.value)} value={sortOrder}>
                    <option value="desc">По убыванию</option>
                    <option value="asc">По возрастанию</option>
                </select>
                {user?.role_id === 0 && (
                    <select onChange={(e) => setFilter(e.target.value)} value={filter}>
                        <option value="all">Все</option>
                        <option value="self_entered">Введены самостоятельно</option>
                        <option value="checked_by_doc">Введены врачом</option>
                    </select>
                )}
            </h2>

            {user?.role_id === 1 && (
                <div className="pick-patient">
                    <label htmlFor="patient_id">Выберите ID пациента:</label>
                    <select id="patient_id" value={selectedPatientId} onChange={(e) => handlePatientSelect(e.target.value)}>
                        <option value="">Все</option>
                        {patients.map((patient) => (
                            <option key={patient.user_id} value={patient.user_id}>
                                {patient.user_id} - {patient.username}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {sortedHistory.length > 0 ? (
                <ul>
                    {sortedHistory.map((item, index) => (
                        <li key={index}>
                            {user?.role_id === 1 && <h3>Результаты пациента с ID: {item.patient_id} за {item.date}:</h3>}
                            {user?.role_id === 0 && 
                                <div>
                                    <h3>Результаты исследований за {item.date}:</h3>
                                    {item.checked_by_doc && <h4>[ Введено врачом ]</h4>}
                                </div>
                            }
                            <div className="profile-results">
                                <table border="1">
                                    <thead>
                                        <tr>
                                            <th>Показатель</th>
                                            <th>Введенное значение</th>
                                            <th>Норма</th>
                                            <th>Вердикт</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {item.analysis.map((row, idx) => (
                                            <tr key={idx}>
                                                <td>{row.indicator}</td>
                                                <td>{row.value}</td>
                                                <td>{row.normal_range}</td>
                                                <td style={getVerdictStyle(row.verdict)}>{row.verdict}</td> {/* Применяем стиль к вердикту */}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </li>
                    ))}
                </ul>
            ) : (
                <p>Загружаем историю чекапов...</p>
            )}
        </div>
    );
};

export default History;