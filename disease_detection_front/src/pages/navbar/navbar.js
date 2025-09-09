import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../navbar/navbar.css";
import axios from "axios";

const Navbar = () => {
    const [user, setUser] = useState(() => JSON.parse(localStorage.getItem("user")));
    const navigate = useNavigate();

    useEffect(() => {
        const handleStorageChange = () => {
            const currentUser = JSON.parse(localStorage.getItem("user"));
            if (currentUser) {
                setUser(currentUser);
            }
        };

        const handleUserUpdate = (event) => {
            if (event.detail?.user) {
                setUser(event.detail.user);
            } else {
                const currentUser = JSON.parse(localStorage.getItem("user"));
                if (currentUser) {
                    setUser(currentUser);
                }
            }
        };

        window.addEventListener("storage", handleStorageChange);
        window.addEventListener("userUpdated", handleUserUpdate);

        return () => {
            window.removeEventListener("storage", handleStorageChange);
            window.removeEventListener("userUpdated", handleUserUpdate);
        };
    }, []);

    const handleLogout = async () => {
        try {
            const response = await axios.post("http://localhost:5000/api/logout", {}, { withCredentials: true });

            if (response.status === 200) {
                localStorage.removeItem("user");
                navigate("/login");
                window.location.reload();
            } else {
                alert("Ошибка выхода! Статус: " + response.status);
            }
        } catch (error) {
            alert("Ошибка выхода!", error);
        }
    };

    if (user?.role_id === 2) {
        return null;
    }

    const hasBiochemAccess = user?.biochem_access_anemia || user?.biochem_access_inflam;

    return (
        <nav className="navbar">
            <ul className="navbar-menu navbar-left">
                <li><Link className="navbar-link" to="/new_checkup">Общий анализ крови</Link></li>
                {user && (
                    <>    
                        {hasBiochemAccess && (
                            <li>
                                <Link className="navbar-link" to="/biochem">Биохимия</Link>
                            </li>
                        )}

                        <li>
                            <Link className="navbar-link" to="/new_history">История анализов</Link>
                        </li>
                    </>
                )}
            </ul>
            <ul className="navbar-menu navbar-right">
                {user ? (
                    <>
                        <li className="navbar-user-section">
                            <Link className="navbar-user-link" to="/profile">
                                {user?.photo_url ? (
                                    <img 
                                        src={`http://localhost:5000${user.photo_url}?${Date.now()}`} 
                                        alt="Фото профиля" 
                                        className="navbar-user-photo"
                                    />
                                ) : (
                                    <div className="navbar-user-photo-placeholder"></div>
                                )}
                                <span className="navbar-username">{user?.username}</span>
                            </Link>
                        </li>
                        <li className="navbar-logout-section">
                            <button className="navbar-button navbar-link" onClick={handleLogout}>Выход</button>
                        </li>
                    </>
                ) : (
                    <li><Link className="navbar-link" to="/login">Вход/регистрация</Link></li>
                )}
            </ul>
        </nav>
    );
};

export default Navbar;