import React, { useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import "../register/register.css";

function Register() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [age, setAge] = useState("");
    const [sex, setSex] = useState(0);
    const [polis, setPolis] = useState('');
    const [polisError, setPolisError] = useState('');

    const [surname, setSurname] = useState("");
    const [name, setName] = useState("");
    const [otchestvo, setOtchestvo] = useState("");

    const navigate = useNavigate();

    const handlePolisChange = (e) => {
        const value = e.target.value;
        setPolis(value);

        if (!/^\d*$/.test(value)) {
            setPolisError('В полисе должны быть только цифры');
        } else if (value.length !== 16) {
            setPolisError('В полисе должно быть 16 цифр');
        } else {
            setPolisError('');
        }
    };

    const handleRegister = async () => {
        if (!surname.trim()) {
            alert("Пожалуйста, введите фамилию");
            return;
        }
        if (!name.trim()) {
            alert("Пожалуйста, введите имя");
            return;
        }

        if (!/^\d{16}$/.test(polis)) {
            setPolisError(
                /^\d*$/.test(polis)
                    ? 'В полисе должно быть 16 цифр'
                    : 'В полисе должны быть только цифры'
            );
            return;
        }

        try {
            const response = await axios.post("http://localhost:5000/api/register", {
                username,
                password,
                age,
                sex,
                polis,
                surname,
                name,
                otchestvo
            }, {
                withCredentials: true
            });

            const userData = {
                user_id: response.data.user_id,
                username,
                age,
                sex,
                role_id: 0,
                polis,
                surname,
                name,
                otchestvo,
                biochem_access_inflam: false,
                biochem_access_anemia: false
            };

            localStorage.setItem("user", JSON.stringify(userData));
            window.dispatchEvent(new Event("storage"));
            navigate("/new_checkup");

        } catch (error) {
            if (error.response?.data?.message) {
                alert(error.response.data.message);
            } else {
                alert("Ошибка регистрации!");
            }
        }
    };

    return (
        <div className="reg-container">
            <Link className="back-to-auth-link" to="/login">❮ Авторизация</Link>
            <h2>Регистрация</h2>

            <input type="text" placeholder="Логин" onChange={(e) => setUsername(e.target.value)} />
            <input type="password" placeholder="Пароль" onChange={(e) => setPassword(e.target.value)} />

            <input type="text" placeholder="Фамилия" value={surname} onChange={(e) => setSurname(e.target.value)} />
            <input type="text" placeholder="Имя" value={name} onChange={(e) => setName(e.target.value)} />
            <input type="text" placeholder="Отчество (необязательно)" value={otchestvo} onChange={(e) => setOtchestvo(e.target.value)} />

            <input
                type="text"
                placeholder="Полис ОМС"
                value={polis}
                maxLength={16}
                onChange={handlePolisChange}
            />
            {polisError && <div className="polis-error">{polisError}</div>}

            <input
                type="number"
                placeholder="Возраст"
                min={18}
                max={60}
                onChange={(e) => {
                    let value = Number.parseInt(e.target.value, 10);
                    if (value < 18) value = 18;
                    if (value > 60) value = 60;
                    setAge(value);
                }}
            />

            <div className="reg-select-group">
                <label htmlFor="sex">Пол:</label>
                <select id="sex" onChange={(e) => setSex(Number.parseInt(e.target.value))}>
                    <option value="0">Мужской</option>
                    <option value="1">Женский</option>
                </select>
            </div>

            <button onClick={handleRegister}>Зарегистрироваться</button>
        </div>
    );
}

export default Register;
