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
// RouteEditForm.js - улучшенная функция loadRouteData
const loadRouteData = async () => {
  try {
    console.log('Загрузка маршрута с ID:', routeId);
    
    const route = await primaryService.getRouteById(routeId);
    
    console.log('Найденный маршрут для редактирования:', route);
    
    if (route) {
      // Убедимся, что все вложенные объекты существуют
      setFormData({
        name: route.name || '',
        coordinates: route.coordinates || { x: 0, y: 0 },
        from: route.from || { x: 0, y: 0, name: '', id: null },
        to: route.to || { x: 0, y: 0, name: '', id: null },
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

  // ВАЛИДАЦИЯ КООРДИНАТ - целые числа
  if (!Number.isInteger(formData.coordinates?.x) || !Number.isInteger(formData.coordinates?.y)) {
    setError('Координаты маршрута должны быть целыми числами');
    setLoading(false);
    return;
  }

  if (!Number.isInteger(formData.from?.x) || !Number.isInteger(formData.from?.y)) {
    setError('Координаты начальной точки должны быть целыми числами');
    setLoading(false);
    return;
  }

  if (!Number.isInteger(formData.to?.x) || !Number.isInteger(formData.to?.y)) {
    setError('Координаты конечной точки должны быть целыми числами');
    setLoading(false);
    return;
  }

  // ВАЛИДАЦИЯ ДИСТАНЦИИ - дробное число > 1
  if (formData.distance <= 1) {
    setError('Дистанция должна быть больше 1');
    setLoading(false);
    return;
  }

  if (!formData.name.trim()) {
    setError('Название маршрута обязательно');
    setLoading(false);
    return;
  }

  if (!formData.from?.name?.trim()) {
    setError('Название точки отправления обязательно');
    setLoading(false);
    return;
  }

  if (!formData.to?.name?.trim()) {
    setError('Название точки назначения обязательно');
    setLoading(false);
    return;
  }

  try {
    console.log('📝 Данные для обновления:', formData);
    
    // Отправляем только измененные данные
    const updateData = {
      name: formData.name,
      coordinates: formData.coordinates,
      from: formData.from,
      to: formData.to,
      distance: formData.distance
    };
    
    await primaryService.updateRoute(routeId, updateData);
    setSuccess('Маршрут успешно обновлен!');
    setTimeout(() => {
      onRouteUpdated();
    }, 1500);
  } catch (err) {
    console.error('❌ Ошибка обновления:', err);
    setError(err.message);
  } finally {
    setLoading(false);
  }
};
const handleChange = (e) => {
  const { name, value } = e.target;
  
  console.log('📝 Изменение поля:', name, 'значение:', value);
  
  // ОБРАБОТКА КООРДИНАТ - только целые числа
  if ((name.includes('.x') || name.includes('.y')) && !name.includes('name')) {
    // Разрешаем только цифры и минус для координат
    const numericValue = value.replace(/[^\d-]/g, '');
    const finalValue = numericValue === '' ? '' : parseInt(numericValue) || 0;
    
    if (name.startsWith('coordinates.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        coordinates: { 
          ...prev.coordinates, 
          [field]: finalValue
        }
      }));
    } else if (name.startsWith('from.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        from: { 
          ...prev.from, 
          [field]: finalValue
        }
      }));
    } else if (name.startsWith('to.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        to: { 
          ...prev.to, 
          [field]: finalValue
        }
      }));
    }
  } 
  // ДИСТАНЦИЯ - дробное число (разрешаем точку)
  else if (name === 'distance') {
    // Разрешаем цифры, точку и минус
    const numericValue = value.replace(/[^\d.-]/g, '');
    // Убираем лишние точки (оставляем только первую)
    const cleanValue = numericValue.replace(/(\..*)\./g, '$1');
    
    setFormData(prev => ({
      ...prev,
      [name]: cleanValue === '' ? '' : parseFloat(cleanValue) || 0
    }));
  } else {
    // ТЕКСТОВЫЕ ПОЛЯ (name, from.name, to.name) - без ограничений
    if (name.startsWith('from.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        from: { 
          ...prev.from, 
          [field]: value
        }
      }));
    } else if (name.startsWith('to.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        to: { 
          ...prev.to, 
          [field]: value
        }
      }));
    } else {
      // Поле name маршрута
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
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