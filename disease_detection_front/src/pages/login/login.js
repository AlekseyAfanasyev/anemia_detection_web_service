import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../login/login.css";

function Login() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const navigate = useNavigate();

    const handleLogin = async () => {
        try {
            const response = await axios.post("http://localhost:5000/api/login", {
                username,
                password
            }, {
                withCredentials: true
            });

            if (response.data.message === 'Неактивный пользователь') {
                alert('Данный пользователь является неактивным. Обратитесь к администратору');
                return; 
            }
    
            if (response.data['sex']) {
                response.data['sex'] = true;
            } else {
                response.data['sex'] = false;
            }
    
            localStorage.setItem("user", JSON.stringify(response.data));
    
            window.dispatchEvent(new Event("storage"));
    
            if (response.data.role_id === 2) {
                navigate("/admin"); 
            } else {
                navigate("/new_checkup");
            }
    
        } catch (error) {
            alert("Неверный логин или пароль", error);
        }
    };
    

    return (
            <div className="login-container">
                <h2>Вход</h2>

                <input type="text" placeholder="Логин" onChange={(e) => setUsername(e.target.value)} />
                <input type="password" placeholder="Пароль" onChange={(e) => setPassword(e.target.value)} />

                <button onClick={handleLogin}>Войти</button>
                
                <div className="login-register-link">
                    <a href="/register">Регистрация</a>
                </div>
            </div>
    );
}

export default Login;
