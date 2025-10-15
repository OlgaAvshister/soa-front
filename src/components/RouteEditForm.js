import React, { useState, useEffect } from 'react';
import { primaryService } from '../services/api';
import './ItemForm.css';

const RouteEditForm = ({ routeId, onRouteUpdated, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    coordinates: { x: 0, y: 0 },
    from: { x: 0, y: 0, name: '' },
    to: { x: 0, y: 0, name: '' },
    distance: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (routeId) {
      loadRouteData();
    }
  }, [routeId]);

  const loadRouteData = async () => {
  try {
    console.log('Загрузка маршрута с ID:', routeId);
    
    // Используем правильный метод для получения маршрута по ID
    const route = await primaryService.getRouteById(routeId);
    
    console.log('Найденный маршрут:', route);
    
    if (route) {
      setFormData({
        name: route.name || '',
        coordinates: route.coordinates || { x: 0, y: 0 },
        from: route.from || { x: 0, y: 0, name: '' },
        to: route.to || { x: 0, y: 0, name: '' },
        distance: route.distance || 0
      });
    } else {
      setError(`Маршрут #${routeId} не найден`);
    }
  } catch (err) {
    console.error('Ошибка загрузки маршрута:', err);
    setError('Не удалось загрузить данные маршрута: ' + err.message);
  }
};

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Валидация
    if (formData.distance <= 0) {
      setError('Дистанция должна быть больше 0');
      setLoading(false);
      return;
    }

    if (!formData.name.trim()) {
      setError('Название маршрута обязательно');
      setLoading(false);
      return;
    }

    try {
      await primaryService.updateRoute(routeId, formData);
      setSuccess('Маршрут успешно обновлен!');
      setTimeout(() => {
        onRouteUpdated();
      }, 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name.startsWith('coordinates.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        coordinates: { 
          ...prev.coordinates, 
          [field]: value === '' ? '' : parseFloat(value) || 0 
        }
      }));
    } else if (name.startsWith('from.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        from: { 
          ...prev.from, 
          [field]: field === 'name' ? value : (value === '' ? '' : parseFloat(value) || 0)
        }
      }));
    } else if (name.startsWith('to.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        to: { 
          ...prev.to, 
          [field]: field === 'name' ? value : (value === '' ? '' : parseFloat(value) || 0)
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: name === 'distance' ? (value === '' ? '' : parseFloat(value) || 0) : value
      }));
    }
  };

  return (
    <div className="item-form-container">
      <h3>Редактировать маршрут #{routeId}</h3>
      
      {error && <div className="error-message">Ошибка: {error}</div>}
      {success && <div className="success-message">{success}</div>}
      
      <form onSubmit={handleSubmit} className="item-form">
        <div className="form-group">
          <label>Название маршрута</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            placeholder="Введите название маршрута"
          />
        </div>

        <div className="form-section">
          <h4>Координаты маршрута:</h4>
          <div className="form-row">
            <div className="form-group">
              <label>X</label>
              <input
                type="number"
                step="0.1"
                name="coordinates.x"
                value={formData.coordinates.x || ''}
                onChange={handleChange}
                placeholder="0"
              />
            </div>
            <div className="form-group">
              <label>Y</label>
              <input
                type="number"
                step="0.1"
                name="coordinates.y"
                value={formData.coordinates.y || ''}
                onChange={handleChange}
                placeholder="0"
              />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h4>Точка отправления:</h4>
          <div className="form-row">
            <div className="form-group">
              <label>Название</label>
              <input
                type="text"
                name="from.name"
                value={formData.from.name}
                onChange={handleChange}
                required
                placeholder="Название точки отправления"
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>X</label>
              <input
                type="number"
                step="0.1"
                name="from.x"
                value={formData.from.x || ''}
                onChange={handleChange}
                placeholder="0"
              />
            </div>
            <div className="form-group">
              <label>Y</label>
              <input
                type="number"
                step="0.1"
                name="from.y"
                value={formData.from.y || ''}
                onChange={handleChange}
                placeholder="0"
              />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h4>Точка назначения:</h4>
          <div className="form-row">
            <div className="form-group">
              <label>Название</label>
              <input
                type="text"
                name="to.name"
                value={formData.to.name}
                onChange={handleChange}
                required
                placeholder="Название точки назначения"
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>X</label>
              <input
                type="number"
                step="0.1"
                name="to.x"
                value={formData.to.x || ''}
                onChange={handleChange}
                placeholder="0"
              />
            </div>
            <div className="form-group">
              <label>Y</label>
              <input
                type="number"
                step="0.1"
                name="to.y"
                value={formData.to.y || ''}
                onChange={handleChange}
                placeholder="0"
              />
            </div>
          </div>
        </div>

        <div className="form-group">
          <label>Дистанция</label>
          <input
            type="number"
            step="0.1"
            name="distance"
            value={formData.distance}
            onChange={handleChange}
            required
            placeholder="0"
            min="0.1"
          />
        </div>

        <div className="form-actions">
          <button type="submit" disabled={loading} className="submit-btn">
            {loading ? 'Обновление...' : 'Обновить маршрут'}
          </button>
          <button type="button" onClick={onCancel} className="btn btn-secondary">
            Отмена
          </button>
        </div>
      </form>
    </div>
  );
};

export default RouteEditForm;