import React, { useState, useEffect } from 'react';
import { secondaryService, primaryService } from '../services/api';
import './ItemForm.css';

const AddRouteBetween = ({ onRouteAdded, onCancel }) => {
  const [formData, setFormData] = useState({
    idFrom: '',
    idTo: '',
    distance: ''
  });
  const [fromLocations, setFromLocations] = useState([]); // Только точки отправления
  const [toLocations, setToLocations] = useState([]);     // Только точки назначения
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadLocations();
  }, []);

  const loadLocations = async () => {
    try {
      const routes = await primaryService.getRoutes({ size: 100 });
      const fromMap = new Map();
      const toMap = new Map();
      
      // Разделяем локации на точки отправления и назначения
      routes.routes.forEach(route => {
        // From locations - только точки отправления
        if (route.from?.id && route.from?.name) {
          fromMap.set(route.from.id, {
            id: route.from.id,
            name: route.from.name,
            x: route.from.x,
            y: route.from.y,
            type: 'from'
          });
        }
        // To locations - только точки назначения
        if (route.to?.id && route.to?.name) {
          toMap.set(route.to.id, {
            id: route.to.id,
            name: route.to.name,
            x: route.to.x,
            y: route.to.y,
            type: 'to'
          });
        }
      });
      
      setFromLocations(Array.from(fromMap.values()));
      setToLocations(Array.from(toMap.values()));
      
      console.log('From локации (отправления):', Array.from(fromMap.values()));
      console.log('To локации (назначения):', Array.from(toMap.values()));
      
    } catch (err) {
      console.error('Ошибка загрузки локаций:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (!formData.idFrom || !formData.idTo || !formData.distance) {
      setError('Все поля обязательны для заполнения');
      setLoading(false);
      return;
    }

    if (formData.distance <= 0) {
      setError('Дистанция должна быть больше 0');
      setLoading(false);
      return;
    }
    
    try {
      // Используем улучшенную функцию
      const result = await secondaryService.addRouteBetween(
        formData.idFrom,
        formData.idTo,
        formData.distance
      );
      
      setSuccess(result.message || 'Маршрут успешно добавлен между локациями!');
      
      // Сбрасываем форму
      setFormData({
        idFrom: '',
        idTo: '',
        distance: ''
      });
      
      // Обновляем данные через секунду
      setTimeout(() => {
        onRouteAdded();
      }, 1500);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'distance' ? (value === '' ? '' : parseFloat(value) || 0) : value
    }));
  };

  return (
    <div className="item-form-container">
      <h3>Добавить маршрут между существующими локациями</h3>
      
      {error && <div className="error-message">Ошибка: {error}</div>}
      {success && <div className="success-message">{success}</div>}
      
      <form onSubmit={handleSubmit} className="item-form">
        <div className="form-group">
          <label>Начальная локация (точка отправления):</label>
          <select
            name="idFrom"
            value={formData.idFrom}
            onChange={handleChange}
            required
            className="form-select"
          >
            <option value="">Выберите точку отправления</option>
            {fromLocations.map(location => (
              <option key={`from_${location.id}`} value={location.id}>
                {location.name} (ID: {location.id}) - ({location.x}, {location.y})
              </option>
            ))}
          </select>
          <small className="form-hint">
            Доступно {fromLocations.length} точек отправления
          </small>
        </div>

        <div className="form-group">
          <label>Конечная локация (точка назначения):</label>
          <select
            name="idTo"
            value={formData.idTo}
            onChange={handleChange}
            required
            className="form-select"
          >
            <option value="">Выберите точку назначения</option>
            {toLocations.map(location => (
              <option key={`to_${location.id}`} value={location.id}>
                {location.name} (ID: {location.id}) - ({location.x}, {location.y})
              </option>
            ))}
          </select>
          <small className="form-hint">
            Доступно {toLocations.length} точек назначения
          </small>
        </div>

        <div className="form-group">
          <label>Дистанция:</label>
          <input
            type="number"
            step="0.1"
            name="distance"
            value={formData.distance}
            onChange={handleChange}
            required
            placeholder="Дистанция маршрута"
            min="0.1"
          />
        </div>

        <div className="form-actions">
          <button type="submit" disabled={loading} className="submit-btn">
            {loading ? 'Добавление...' : 'Добавить маршрут'}
          </button>
          <button type="button" onClick={onCancel} className="btn btn-secondary">
            Отмена
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddRouteBetween;