import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "../admin/admin.css";

// для быстрой фильтрации по ролям
const ROLE_NAMES = {
    0: "Пациент",
    1: "Врач",
    2: "Админ"
};

// для быстрой фильтрации по полу
const SEX_NAMES = {
    0: "Мужской",
    1: "Женский"
};

const STATUS_NAMES = {
    0: "Удален",
    1: "Активен"
};

const AdminPanel = () => {
    const [users, setUsers] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedRoles, setSelectedRoles] = useState([]);
    const [selectedSex, setSelectedSex] = useState([]);
    const [selectedStatus, setSelectedStatus] = useState([]);
    const [page, setPage] = useState(1);
    const [perPage] = useState(20);
    const [totalPages, setTotalPages] = useState(1);
    const [stats, setStats] = useState({ total: 0, patients: 0, doctors: 0, admins: 0 });
    const navigate = useNavigate();

    const fetchUsers = useCallback(async () => {
        try {
            const url = new URL("http://localhost:5000/api/users");
            url.searchParams.append("page", page);
            url.searchParams.append("per_page", perPage);
            url.searchParams.append("search", searchQuery);

            const response = await fetch(url, { method: "GET", credentials: "include" });
            if (!response.ok) throw new Error("Ошибка получения пользователей");

            const data = await response.json();
            setUsers(data.users);
            setTotalPages(data.pages);
        } catch (error) {
            console.error("Ошибка загрузки пользователей:", error);
        }
    }, [page, perPage, searchQuery]);

    const fetchStats = useCallback(async () => {
        try {
            const response = await fetch("http://localhost:5000/api/users_count", { credentials: "include" });
            if (!response.ok) throw new Error("Ошибка загрузки статистики");

            const data = await response.json();
            if (data.result && data.result.length >= 3) {
                setStats({
                    total: data.result.reduce((sum, row) => sum + row.cnt, 0),
                    patients: data.result[0].cnt,
                    doctors: data.result[1].cnt,
                    admins: data.result[2].cnt,
                });
            }
        } catch (error) {
            console.error("Ошибка загрузки статистики:", error);
        }
    }, []);

    const changeUserRole = async (userId) => {
        try {
            const response = await fetch("http://localhost:5000/api/change_role", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user_id: userId }),
            });

            if (!response.ok) throw new Error("Ошибка изменения роли");
            fetchUsers(); // Обновляем список после изменения
        } catch (error) {
            console.error("Ошибка изменения роли:", error);
        }
    };

    const deleteUser = async (userId) => {
        try {
            const response = await fetch("http://localhost:5000/api/delete_user", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user_id: userId }),
            });

            if (!response.ok) throw new Error("Ошибка изменения роли");
            fetchUsers(); // Обновляем список после изменения
        } catch (error) {
            console.error("Ошибка изменения роли:", error);
        }
    };

    useEffect(() => {
        fetchUsers();
        fetchStats();
    }, [fetchUsers, fetchStats]);

    const toggleRoleFilter = (roleId) => {
        setSelectedRoles((prev) =>
            prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]
        );
        setPage(1);
    };

    const toggleSexFilter = (sexId) => {
        setSelectedSex((prev) =>
            prev.includes(sexId) ? prev.filter((id) => id !== sexId) : [...prev, sexId]
        );
        setPage(1);
    };

    const toggleStatusFilter = (statusId) => {
        setSelectedStatus((prev) =>
            prev.includes(statusId) ? prev.filter((id) => id !== statusId) : [...prev, statusId]
        );
        setPage(1);
    };

    const filteredUsers = users.filter(user => {
        // Фильтрация по ролям
        const isRoleMatch = selectedRoles.length === 0 || selectedRoles.includes(user.role_id);

        // Фильтрация по полу
        const isSexMatch = selectedSex.length === 0 || selectedSex.includes(user.sex ? 1 : 0);

        // Фильтрация по статусу
        const isStatusMatch = selectedStatus.length === 0 || selectedStatus.includes(user.is_active ? 1 : 0);

        return isRoleMatch && isSexMatch && isStatusMatch;
    });

    return (
        <div className="admin-container">
            <h1>Админская панель</h1>
            <button onClick={() => navigate("/login")} className="admin-exit-button">Выйти</button>

            <div className="admin-stats-container">
                <table className="stats-table">
                    <thead>
                        <tr>
                            <th></th>
                            <th>Пациенты</th>
                            <th>Врачи</th>
                            <th>Админы</th>
                            <th>Всего</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className="stats-label">Количество</td>
                            <td>{stats.patients}</td>
                            <td>{stats.doctors}</td>
                            <td>{stats.admins}</td>
                            <td className="stats-total">{stats.total}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            
            <div className="search-filter-container">
                <div className="filter-container">
                    <h2>Поиск по пользователю</h2>
                    <div className="search-box">
                        <input 
                            type="text" 
                            placeholder="Введите имя пользователя или ФИО" 
                            value={searchQuery} 
                            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }} 
                        />
                    </div>
                </div>
                <div className="filter-container">
                    <h2>Роль</h2>
                    <div className="filter-boxes">
                        {Object.entries(ROLE_NAMES).map(([id, name]) => (
                            <label key={id}>
                                <input
                                    type="checkbox"
                                    checked={selectedRoles.includes(Number(id))}
                                    onChange={() => toggleRoleFilter(Number(id))}
                                />
                                {name}
                            </label>
                        ))}
                    </div>
                </div>
                <div className="filter-container">
                    <h2>Пол</h2>
                    <div className="filter-boxes">
                        {Object.entries(SEX_NAMES).map(([id, name]) => (
                            <label key={id}>
                                <input
                                    type="checkbox"
                                    checked={selectedSex.includes(Number(id))}
                                    onChange={() => toggleSexFilter(Number(id))}
                                />
                                {name}
                            </label>
                        ))}
                    </div>
                </div>
                <div className="filter-container">
                    <h2>Статус</h2>
                    <div className="filter-boxes">
                        {Object.entries(STATUS_NAMES).map(([id, name]) => (
                            <label key={id}>
                                <input
                                    type="checkbox"
                                    checked={selectedStatus.includes(Number(id))}
                                    onChange={() => toggleStatusFilter(Number(id))}
                                />
                                {name}
                            </label>
                        ))}
                    </div>
                </div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Имя пользователя</th>
                        <th>ФИО</th>
                        <th>Полис ОМС</th>
                        <th>Возраст</th>
                        <th>Пол</th>
                        <th>Роль</th>
                        <th>Действие</th>
                        <th>Статус</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredUsers.map((user) => (
                        <tr key={user.user_id}>
                            <td>{user.user_id}</td>
                            <td>{user.username}</td>
                            <td>{user.fio}</td>
                            <td>{user.polis}</td>
                            <td>{user.age}</td>
                            <td>{user.sex ? "Женский" : "Мужской"}</td>
                            <td>{ROLE_NAMES[user.role_id]}</td>
                            <td>
                                <div className="button-group">
                                    
                                    <button onClick={() => changeUserRole(user.user_id)}>Изменить роль</button>
                                    <button onClick={() => deleteUser(user.user_id)}>{user.is_active ? 'Удалить' : 'Восстановить'}</button>
                                </div>
                            </td>
                            <td>{user.is_active ? "Активен" : "Удален"}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="admin-pagination">
                <button onClick={() => setPage(page - 1)} disabled={page <= 1}>Предыдущая</button>
                <span>Страница {page} из {totalPages}</span>
                <button onClick={() => setPage(page + 1)} disabled={page >= totalPages}>Следующая</button>
            </div>
        </div>
    );
};

export default AdminPanel;
