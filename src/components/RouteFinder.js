import React, { useState, useEffect } from 'react';
import { secondaryService, primaryService } from '../services/api';
import './RouteFinder.css';

const RouteFinder = () => {
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [fromLocations, setFromLocations] = useState([]);
  const [toLocations, setToLocations] = useState([]);
  const [showAllFrom, setShowAllFrom] = useState(false);
  const [showAllTo, setShowAllTo] = useState(false);
  const [searchFrom, setSearchFrom] = useState('');
  const [searchTo, setSearchTo] = useState('');
  // Новое состояние для сортировки
  const [sortBy, setSortBy] = useState('distance');

  useEffect(() => {
    loadExistingLocations();
  }, []);

  const loadExistingLocations = async () => {
    try {
      const routes = await primaryService.getRoutes({ size: 100 });
      const fromMap = new Map();
      const toMap = new Map();
      
      routes.routes.forEach(route => {
        // From locations
        if (route.from?.name) {
          const locationId = route.from.id || route.id;
          const key = `from_${locationId}`;
          fromMap.set(key, {
            name: route.from.name,
            id: locationId,
            x: route.from.x,
            y: route.from.y,
            originalData: route.from
          });
        }
        
        // To locations
        if (route.to?.name) {
          const locationId = route.to.id || route.id;
          const key = `to_${locationId}`;
          toMap.set(key, {
            name: route.to.name,
            id: locationId,
            x: route.to.x,
            y: route.to.y,
            originalData: route.to
          });
        }
      });
      
      setFromLocations(Array.from(fromMap.values()));
      setToLocations(Array.from(toMap.values()));
    } catch (err) {
      console.error('Ошибка загрузки локаций:', err);
    }
  };

  const handleFindRoutes = async () => {
    if (!fromId || !toId) {
      setError('Введите ID обеих точек');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      console.log('🔍 Поиск маршрутов между ЛОКАЦИЯМИ:', { 
        fromId, 
        toId,
        sortBy
      });
      
      const foundRoutes = await secondaryService.findRoutesBetween(fromId, toId, sortBy);
      console.log('📋 Результат поиска от навигатора:', foundRoutes);
      
      const fromLocation = fromLocations.find(l => l.id == fromId);
      const toLocation = toLocations.find(l => l.id == toId);
      
      if (foundRoutes.routes && foundRoutes.routes.length === 0) {
        setError(`Маршруты между "${fromLocation?.name || fromId}" и "${toLocation?.name || toId}" не найдены.`);
      }
      
      setResult(foundRoutes);
    } catch (err) {
      console.error('Ошибка поиска:', err);
      
      if (err.message.includes('404')) {
        const fromLocation = fromLocations.find(l => l.id == fromId);
        const toLocation = toLocations.find(l => l.id == toId);
        setError(`Навигатор не нашел маршруты между "${fromLocation?.name || fromId}" и "${toLocation?.name || toId}".`);
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // Новая функция для изменения сортировки
  const handleSortChange = (newSortBy) => {
    setSortBy(newSortBy);
    
    // Если уже есть результаты, перезапрашиваем с новой сортировкой
    if (result && fromId && toId) {
      handleFindRoutes();
    }
  };

  const handleClear = () => {
    setFromId('');
    setToId('');
    setResult(null);
    setError('');
    setSortBy('distance');
  };

  // Фильтруем локации по поиску
  const filteredFrom = fromLocations.filter(location =>
    location.name.toLowerCase().includes(searchFrom.toLowerCase())
  );
  const filteredTo = toLocations.filter(location =>
    location.name.toLowerCase().includes(searchTo.toLowerCase())
  );

  // Локации для отображения
  const displayFrom = showAllFrom ? filteredFrom : filteredFrom.slice(0, 8);
  const displayTo = showAllTo ? filteredTo : filteredTo.slice(0, 8);

  return (
    <div className="route-finder">
      <h3>Найти маршруты между точками</h3>
      
      <div className="input-group">
        <label>ID начальной точки:</label>
        <input
          type="number"
          value={fromId}
          onChange={(e) => setFromId(e.target.value)}
          placeholder="Введите ID из списка слева"
          min="1"
        />
      </div>
      
      <div className="input-group">
        <label>ID конечной точки:</label>
        <input
          type="number"
          value={toId}
          onChange={(e) => setToId(e.target.value)}
          placeholder="Введите ID из списка справа"
          min="1"
        />
      </div>

      {/* Блок выбора сортировки */}
      <div className="input-group">
        <label>Сортировка результатов:</label>
        <select 
          value={sortBy} 
          onChange={(e) => handleSortChange(e.target.value)}
          className="sort-select"
        >
          <option value="distance">По дистанции (возрастание)</option>
          <option value="name">По названию (А-Я)</option>
          <option value="creationDate">По дате создания (старые сначала)</option>
        </select>
      </div>

      <div className="finder-actions">
        <button 
          onClick={handleFindRoutes} 
          disabled={loading}
          className="btn btn-primary"
        >
          {loading ? 'Поиск...' : 'Найти маршруты'}
        </button>
        <button onClick={handleClear} className="btn btn-secondary">
          Очистить
        </button>
      </div>

      {/* Две колонки с локациями */}
      <div className="locations-columns">
        {/* Колонка "Откуда" */}
        <div className="locations-column">
          <div className="column-header">
            <h4>Можно отправиться из ({fromLocations.length}):</h4>
            <button 
              onClick={() => setShowAllFrom(!showAllFrom)}
              className="btn btn-sm btn-outline"
            >
              {showAllFrom ? 'Скрыть' : 'Показать все'}
            </button>
          </div>

          <div className="locations-search">
            <input
              type="text"
              placeholder="Поиск точки отправления..."
              value={searchFrom}
              onChange={(e) => setSearchFrom(e.target.value)}
              className="search-input"
            />
          </div>
          
          <div className={`locations-grid ${showAllFrom ? 'show-all' : ''}`}>
            {displayFrom.map((location, index) => (
              <div 
                key={`from_${location.id}_${index}`} 
                className="location-item from-location"
                onClick={() => setFromId(location.id)}
              >
                <div className="location-info">
                  <div className="location-name">{location.name}</div>
                  <div className="location-coords">({location.x}, {location.y})</div>
                </div>
                <span className="location-id">ID: {location.id}</span>
              </div>
            ))}
          </div>

          {!showAllFrom && filteredFrom.length > 8 && (
            <p className="locations-more">
              ... и еще {filteredFrom.length - 8} точек отправления
            </p>
          )}

          {filteredFrom.length === 0 && searchFrom && (
            <p className="locations-empty">Точки отправления не найдены</p>
          )}
        </div>

        {/* Колонка "Куда" */}
        <div className="locations-column">
          <div className="column-header">
            <h4>Можно прибыть в ({toLocations.length}):</h4>
            <button 
              onClick={() => setShowAllTo(!showAllTo)}
              className="btn btn-sm btn-outline"
            >
              {showAllTo ? 'Скрыть' : 'Показать все'}
            </button>
          </div>

          <div className="locations-search">
            <input
              type="text"
              placeholder="Поиск точки назначения..."
              value={searchTo}
              onChange={(e) => setSearchTo(e.target.value)}
              className="search-input"
            />
          </div>
          
          <div className={`locations-grid ${showAllTo ? 'show-all' : ''}`}>
            {displayTo.map((location, index) => (
              <div 
                key={`to_${location.id}_${index}`} 
                className="location-item to-location"
                onClick={() => setToId(location.id)}
              >
                <div className="location-info">
                  <div className="location-name">{location.name}</div>
                  <div className="location-coords">({location.x}, {location.y})</div>
                </div>
                <span className="location-id">ID: {location.id}</span>
              </div>
            ))}
          </div>

          {!showAllTo && filteredTo.length > 8 && (
            <p className="locations-more">
              ... и еще {filteredTo.length - 8} точек назначения
            </p>
          )}

          {filteredTo.length === 0 && searchTo && (
            <p className="locations-empty">Точки назначения не найдены</p>
          )}
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {result && (
        <div className="finder-results">
          <div className="results-header">
            <h4>Результаты поиска:</h4>
            {/* Индикатор текущей сортировки */}
            <div className="sort-indicator">
              Сортировка: 
              <span className="sort-value">
                {sortBy === 'distance' && ' по дистанции'}
                {sortBy === 'name' && ' по названию'}
                {sortBy === 'creationDate' && ' по дате создания'}
              </span>
            </div>
          </div>
          
          {result.routes && result.routes.length > 0 ? (
            <div className="routes-list">
              {result.routes.map(route => (
                <div key={route.id} className="route-card">
                  <h5>Маршрут #{route.id}: {route.name}</h5>
                  <p><strong>Дистанция:</strong> {route.distance}</p>
                  {route.creationDate && (
                    <p><strong>Дата создания:</strong> {new Date(route.creationDate).toLocaleDateString()}</p>
                  )}
                  <p><strong>От:</strong> {route.from?.name || 'Не указано'} ({route.from?.x}, {route.from?.y})</p>
                  <p><strong>К:</strong> {route.to?.name || 'Не указано'} ({route.to?.x}, {route.to?.y})</p>
                </div>
              ))}
            </div>
          ) : (
            <p>Маршруты между указанными точками не найдены</p>
          )}
        </div>
      )}
    </div>
  );
};

export default RouteFinder;