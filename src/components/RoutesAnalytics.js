import React, { useState } from 'react';
import { primaryService } from '../services/api';
import './ItemForm.css';

const RoutesAnalytics = () => {
  const [analytics, setAnalytics] = useState({
    distanceSum: null,
    distanceGroup: null,
    greaterThanRoutes: null
  });
  const [minDistance, setMinDistance] = useState(100);
  const [loading, setLoading] = useState('');
  const [error, setError] = useState('');

  const handleGetDistanceSum = async () => {
    setLoading('sum');
    setError('');
    try {
      const result = await primaryService.getDistanceSum();
      setAnalytics(prev => ({ ...prev, distanceSum: result }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading('');
    }
  };

  const handleGetDistanceGroup = async () => {
    setLoading('group');
    setError('');
    try {
      const result = await primaryService.getDistanceGroup();
      setAnalytics(prev => ({ ...prev, distanceGroup: result }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading('');
    }
  };

  const handleGetGreaterThan = async () => {
    setLoading('greater');
    setError('');
    try {
      const result = await primaryService.getRoutesGreaterThan(minDistance);
      setAnalytics(prev => ({ ...prev, greaterThanRoutes: result }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading('');
    }
  };

  const formatNumber = (num) => {
    if (typeof num === 'number') {
      return num.toFixed(2);
    }
    return num || '0';
  };

  return (
    <div className="item-form-container">
      <h3>Аналитика маршрутов</h3>
      
      {error && <div className="error-message">{error}</div>}

      <div className="analytics-section">
        {/* Сумма дистанций */}
        <div className="analytics-item">
          <h4>Сумма дистанций</h4>
          <button 
            onClick={handleGetDistanceSum}
            disabled={loading === 'sum'}
            className="btn btn-primary btn-small"
          >
            {loading === 'sum' ? 'Загрузка...' : 'Рассчитать'}
          </button>
          {analytics.distanceSum && (
            <div className="success-message">
              <strong>Результат:</strong><br />
              Общая сумма: {formatNumber(analytics.distanceSum.totalSum)}<br />
              Количество маршрутов: {analytics.distanceSum.routeCount || 0}<br />
              Средняя дистанция: {formatNumber(analytics.distanceSum.averageDistance)}<br />
              Минимальная: {formatNumber(analytics.distanceSum.minDistance)}<br />
              Максимальная: {formatNumber(analytics.distanceSum.maxDistance)}
            </div>
          )}
        </div>

        {/* Группировка по дистанции */}
        <div className="analytics-item">
          <h4>Группировка по дистанции</h4>
          <button 
            onClick={handleGetDistanceGroup}
            disabled={loading === 'group'}
            className="btn btn-primary btn-small"
          >
            {loading === 'group' ? 'Загрузка...' : 'Получить'}
          </button>
          {analytics.distanceGroup && (
            <div className="success-message">
              <strong>Результат:</strong><br />
              Всего групп: {analytics.distanceGroup.totalGroups || 0}<br />
              Всего маршрутов: {analytics.distanceGroup.totalRoutes || 0}<br />
              <br />
              <strong>Группы:</strong>
              {analytics.distanceGroup.groups && analytics.distanceGroup.groups.map((group, index) => (
                <div key={index} style={{ marginTop: '5px', fontSize: '14px' }}>
                  Дистанция: {formatNumber(group.distance)} - {group.count} маршрутов ({formatNumber(group.percentage)}%)
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Маршруты с дистанцией больше */}
        <div className="analytics-item">
          <h4>Маршруты с дистанцией больше</h4>
          <div className="analytics-input-row">
            <input
              type="number"
              value={minDistance}
              onChange={(e) => setMinDistance(e.target.value)}
              placeholder="Минимальная дистанция"
              className="analytics-input"
              min="1"
              step="0.1"
            />
            <button 
              onClick={handleGetGreaterThan}
              disabled={loading === 'greater'}
              className="btn btn-primary btn-small"
            >
              {loading === 'greater' ? 'Поиск...' : 'Найти'}
            </button>
          </div>
          {analytics.greaterThanRoutes && (
            <div className="success-message">
              <strong>Результат:</strong><br />
              Найдено: {analytics.greaterThanRoutes.count || analytics.greaterThanRoutes.routes?.length || 0} маршрутов<br />
              Минимальная дистанция: {formatNumber(analytics.greaterThanRoutes.minDistance)}<br />
              Максимальная дистанция: {formatNumber(analytics.greaterThanRoutes.maxDistance)}<br />
              Средняя дистанция: {formatNumber(analytics.greaterThanRoutes.averageDistance)}<br />
              <br />
              <strong>Маршруты:</strong>
              {analytics.greaterThanRoutes.routes && analytics.greaterThanRoutes.routes.map(route => (
                <div key={route.id} className="route-item">
                  #{route.id}: {route.name} - {formatNumber(route.distance)}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RoutesAnalytics;