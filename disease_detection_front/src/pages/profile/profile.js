import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import "../profile/profile.css";

const Profile = () => {
    const [user, setUser] = useState(() => JSON.parse(localStorage.getItem("user")) || null);
    const [formData, setFormData] = useState({});
    const [editMode, setEditMode] = useState(false);
    const [errors, setErrors] = useState({});
    const [selectedFile, setSelectedFile] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [photoUploading, setPhotoUploading] = useState(false);
    const [photoError, setPhotoError] = useState('');

    useEffect(() => {
        const storedUser = JSON.parse(localStorage.getItem("user"));
        if (storedUser) {
            setUser(storedUser);
            setFormData(storedUser);
        }
    }, []);

    const validateField = (name, value) => {
        let error = "";

        if (
            ['username', 'surname', 'name', 'age', 'polis'].includes(name) &&
            !value?.toString().trim()
        ) {
            error = `Пожалуйста, введите ${getFieldLabel(name)}`;
            return error;
        }

        if (name === 'polis') {
            if (!/^\d*$/.test(value)) {
                error = 'В полисе должны быть только цифры';
            } else if (value.length !== 16) {
                error = 'В полисе должно быть ровно 16 цифр';
            }
        }

        if (name === 'age') {
            const num = Number(value);
            if (num < 18 || num > 60) {
                error = 'Возраст должен быть от 18 до 60';
            }
        }

        return error;
    };

    const getFieldLabel = (field) => {
        switch (field) {
            case 'username': return 'логин';
            case 'surname': return 'фамилию';
            case 'name': return 'имя';
            case 'age': return 'возраст';
            case 'polis': return 'полис ОМС';
            default: return field;
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        const error = validateField(name, value);
        setErrors((prev) => ({ ...prev, [name]: error }));
    };

    const hasErrorsOrEmptyRequired = () => {
        const requiredFields = ['username', 'surname', 'name', 'age', 'polis'];

        for (const field of requiredFields) {
            if (!formData[field]?.toString().trim()) return true;
            if (errors[field]) return true;
        }

        return false;
    };

    const hasChanges = () => {
        if (!user) return false;
        for (let key in formData) {
            if ((formData[key] ?? '') !== (user[key] ?? '')) {
                return true;
            }
        }
        return false;
    };

    const handleSave = async () => {
        if (hasErrorsOrEmptyRequired()) {
            return;
        }

        const updatedFields = {};
        for (let key in formData) {
            if (formData[key] !== user[key]) {
                updatedFields[key] = formData[key];
            }
        }

        if (Object.keys(updatedFields).length === 0) {
            setEditMode(false);
            return;
        }

        updatedFields.user_id = user.user_id;

        try {
            await axios.post("http://localhost:5000/api/change_user_data", updatedFields, {
                withCredentials: true
            });
            const newUser = { ...user, ...updatedFields };
            setUser(newUser);
            setFormData(newUser);
            localStorage.setItem("user", JSON.stringify(newUser));
            window.dispatchEvent(new CustomEvent('userUpdated', { detail: { user: newUser } }));
            setEditMode(false);
        } catch (error) {
            alert("Ошибка при сохранении данных пользователя");
        }
    };

    const handleCancel = () => {
        setFormData(user);
        setErrors({});
        setEditMode(false);
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        setPhotoError('');
        
        if (file) {
            if (!file.type.match(/^image\/(jpeg|jpg|png)$/)) {
                setPhotoError('Допустимы только файлы JPG, JPEG или PNG');
                return;
            }
            
            if (file.size > 5 * 1024 * 1024) {
                setPhotoError('Размер файла не должен превышать 5MB');
                return;
            }
            
            setSelectedFile(file);
            
            const reader = new FileReader();
            reader.onload = (e) => {
                setPhotoPreview(e.target.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handlePhotoUpload = async () => {
        if (!selectedFile) return;
        
        setPhotoUploading(true);
        setPhotoError('');
        
        const formData = new FormData();
        formData.append('photo', selectedFile);
        
        try {
            const response = await axios.post('http://localhost:5000/api/upload_photo', formData, {
                withCredentials: true,
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            
            const updatedUser = { ...user, photo_url: response.data.photo_url };
            setUser(updatedUser);
            setFormData(updatedUser);
            localStorage.setItem("user", JSON.stringify(updatedUser));
            window.dispatchEvent(new CustomEvent('userUpdated', { detail: { user: updatedUser } }));
            
            setSelectedFile(null);
            setPhotoPreview(null);
            
            alert('Фото успешно загружено!');
        } catch (error) {
            setPhotoError(error.response?.data?.error || 'Ошибка при загрузке фото');
        } finally {
            setPhotoUploading(false);
        }
    };

    const handlePhotoDelete = async () => {
        if (!user.photo_url) return;
        
        if (!window.confirm('Вы уверены, что хотите удалить фото?')) return;
        
        try {
            await axios.delete('http://localhost:5000/api/delete_photo', {
                withCredentials: true
            });
            
            const updatedUser = { ...user, photo_url: null };
            setUser(updatedUser);
            setFormData(updatedUser);
            localStorage.setItem("user", JSON.stringify(updatedUser));
            window.dispatchEvent(new CustomEvent('userUpdated', { detail: { user: updatedUser } }));
            
            alert('Фото успешно удалено!');
        } catch (error) {
            alert(error.response?.data?.error || 'Ошибка при удалении фото');
        }
    };

    const handlePhotoCancelSelect = () => {
        setSelectedFile(null);
        setPhotoPreview(null);
        setPhotoError('');
    };

    return (
        <div className="profile-container">
            <h1>Личный кабинет</h1>

            <div className="photo-section">
                <h3>Фотография профиля</h3>
                
                <div className="photo-container">
                    {!photoPreview && (
                        <div className="current-photo">
                            {user?.photo_url ? (
                                <img 
                                    src={`http://localhost:5000${user.photo_url}?${Date.now()}`} 
                                    alt="Фото профиля" 
                                    className="profile-photo"
                                />
                            ) : (
                                <div className="photo-placeholder">
                                    <span>Фото не загружено</span>
                                </div>
                            )}
                            
                            {user?.photo_url && (
                                <button 
                                    onClick={handlePhotoDelete}
                                    className="delete-photo-btn"
                                    type="button"
                                >
                                    Удалить фото
                                </button>
                            )}
                        </div>
                    )}
                    
                    {photoPreview && (
                        <div className="photo-preview">
                            <img 
                                src={photoPreview} 
                                alt="Превью" 
                                className="profile-photo"
                            />
                            <div className="photo-actions">
                                <button 
                                    onClick={handlePhotoUpload}
                                    disabled={photoUploading}
                                    className="upload-photo-btn"
                                    type="button"
                                >
                                    {photoUploading ? 'Загрузка...' : 'Сохранить фото'}
                                </button>
                                <button 
                                    onClick={handlePhotoCancelSelect}
                                    className="cancel-photo-btn"
                                    type="button"
                                >
                                    Отменить
                                </button>
                            </div>
                        </div>
                    )}
                    
                    {!photoPreview && (
                        <div className="photo-upload">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileSelect}
                                className="photo-input"
                                id="photo-input"
                            />
                            <label htmlFor="photo-input" className="photo-input-label">
                                {user?.photo_url ? 'Изменить фото' : 'Загрузить фото'}
                            </label>
                        </div>
                    )}
                    
                    {photoError && (
                        <div className="photo-error">{photoError}</div>
                    )}
                </div>
            </div>

            <p>
                <strong>Имя пользователя: </strong>
                {editMode ? (
                    <>
                        <input
                            type="text"
                            name="username"
                            value={formData.username || ''}
                            onChange={handleChange}
                        />
                        {errors.username && <div className="error-text">{errors.username}</div>}
                    </>
                ) : (
                    user?.username
                )}
            </p>
            <p>
                <strong>Фамилия: </strong>
                {editMode ? (
                    <>
                        <input
                            type="text"
                            name="surname"
                            value={formData.surname || ''}
                            onChange={handleChange}
                        />
                        {errors.surname && <div className="error-text">{errors.surname}</div>}
                    </>
                ) : (
                    user?.surname
                )}
            </p>
            <p>
                <strong>Имя: </strong>
                {editMode ? (
                    <>
                        <input
                            type="text"
                            name="name"
                            value={formData.name || ''}
                            onChange={handleChange}
                        />
                        {errors.name && <div className="error-text">{errors.name}</div>}
                    </>
                ) : (
                    user?.name
                )}
            </p>
            <p>
                <strong>Отчество: </strong>
                {editMode ? (
                    <input
                        type="text"
                        name="otchestvo"
                        value={formData.otchestvo || ''}
                        onChange={handleChange}
                    />
                ) : (
                    user?.otchestvo || "не указано"
                )}
            </p>
            <p>
                <strong>Возраст: </strong>
                {editMode ? (
                    <>
                        <input
                            type="number"
                            name="age"
                            value={formData.age || ''}
                            onChange={handleChange}
                            min={18}
                            max={60}
                        />
                        {errors.age && <div className="error-text">{errors.age}</div>}
                    </>
                ) : (
                    user?.age
                )}
            </p>
            <p>
                <strong>Пол: </strong>
                {editMode ? (
                    <select name="sex" value={formData.sex} onChange={handleChange}>
                        <option value={0}>Мужской</option>
                        <option value={1}>Женский</option>
                    </select>
                ) : (
                    user?.sex ? "Женский" : "Мужской"
                )}
            </p>
            <p>
                <strong>Роль: </strong> {user?.role_id ? "Врач" : "Пациент"}
            </p>
            {user?.role_id === 0 && (
                <p>
                    <strong>Полис ОМС: </strong>
                    {editMode ? (
                        <>
                            <input
                                type="text"
                                name="polis"
                                value={formData.polis || ''}
                                maxLength={16}
                                onChange={handleChange}
                            />
                            {errors.polis && <div className="error-text">{errors.polis}</div>}
                        </>
                    ) : (
                        user?.polis
                    )}
                </p>
            )}

            <div className="profile-buttons-row">
                <Link to="/new_history">
                    <button>История анализов</button>
                </Link>

                {editMode && hasChanges() && (
                    <button
                        onClick={handleCancel}
                        className="cancel-button"
                    >
                        Отменить изменения
                    </button>
                )}

                {editMode ? (
                    <button
                        onClick={handleSave}
                        disabled={hasErrorsOrEmptyRequired()}
                        className={`save-button ${hasErrorsOrEmptyRequired() ? 'disabled' : 'active'}`}
                    >
                        Сохранить изменения
                    </button>
                ) : (
                    <button onClick={() => setEditMode(true)}>Изменить данные</button>
                )}
            </div>
        </div>
    );
};

export default Profile;