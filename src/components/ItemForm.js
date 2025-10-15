import React, { useState } from 'react';
import { primaryService } from '../services/api';
import './ItemForm.css';

const ItemForm = ({ onItemCreated }) => {
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

  const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);
  setError('');
  setSuccess('');

  // УСИЛЕННАЯ ВАЛИДАЦИЯ согласно требованиям API
  if (formData.distance <= 1) { // Дистанция должна быть > 1
    setError('Дистанция должна быть больше 1');
    setLoading(false);
    return;
  }

  if (!formData.name || !formData.name.trim()) {
    setError('Название маршрута обязательно');
    setLoading(false);
    return;
  }

  if (!formData.from.name || !formData.from.name.trim()) {
    setError('Название начальной точки обязательно');
    setLoading(false);
    return;
  }

  if (!formData.to.name || !formData.to.name.trim()) {
    setError('Название конечной точки обязательно');
    setLoading(false);
    return;
  }

  // Проверка числовых полей
  if (isNaN(formData.coordinates.x) || isNaN(formData.coordinates.y)) {
    setError('Координаты маршрута должны быть числами');
    setLoading(false);
    return;
  }

  if (isNaN(formData.from.x) || isNaN(formData.from.y)) {
    setError('Координаты начальной точки должны быть числами');
    setLoading(false);
    return;
  }

  if (isNaN(formData.to.x) || isNaN(formData.to.y)) {
    setError('Координаты конечной точки должны быть числами');
    setLoading(false);
    return;
  }

  try {
    console.log('Отправка данных:', formData);
    const result = await primaryService.createRoute(formData);
    console.log('Маршрут создан:', result);
    
    setSuccess('Маршрут успешно создан!');
    onItemCreated();
    
    // Сбрасываем форму
    setFormData({
      name: '',
      coordinates: { x: 0, y: 0 },
      from: { x: 0, y: 0, name: '' },
      to: { x: 0, y: 0, name: '' },
      distance: 0
    });
  } catch (err) {
    console.error('Ошибка создания:', err);
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
        [field]: value === '' ? 0 : parseFloat(value) || 0 
      }
    }));
  } else if (name.startsWith('from.')) {
    const field = name.split('.')[1];
    setFormData(prev => ({
      ...prev,
      from: { 
        ...prev.from, 
        [field]: field === 'name' ? value : (value === '' ? 0 : parseFloat(value) || 0)
      }
    }));
  } else if (name.startsWith('to.')) {
    const field = name.split('.')[1];
    setFormData(prev => ({
      ...prev,
      to: { 
        ...prev.to, 
        [field]: field === 'name' ? value : (value === '' ? 0 : parseFloat(value) || 0)
      }
    }));
  } else {
    setFormData(prev => ({
      ...prev,
      [name]: name === 'distance' ? (value === '' ? 0 : parseFloat(value) || 0) : value
    }));
  }
};
  return (
    <div className="item-form-container">
      <h3>Создать новый маршрут</h3>
      
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

        <button type="submit" disabled={loading} className="submit-btn">
          {loading ? 'Создание...' : 'Создать маршрут'}
        </button>
      </form>
    </div>
  );
};

export default ItemForm;