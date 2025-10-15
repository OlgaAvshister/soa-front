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

  useEffect(() => {
    loadExistingLocations();
  }, []);

const loadExistingLocations = async () => {
  try {
    const routes = await primaryService.getRoutes({ size: 100 });
    const fromMap = new Map();
    const toMap = new Map();
    
    console.log('Все маршруты для отладки:', routes.routes);
    
    routes.routes.forEach(route => {
      console.log('Маршрут:', route.id, 'From:', route.from, 'To:', route.to);
      
      // From locations
      if (route.from?.name) {
        const locationId = route.from.id || route.id; // Используем ID локации или ID маршрута как fallback
        const key = `from_${locationId}`;
        fromMap.set(key, {
          name: route.from.name,
          id: locationId,
          x: route.from.x,
          y: route.from.y,
          originalData: route.from // для отладки
        });
      }
      
      // To locations
      if (route.to?.name) {
        const locationId = route.to.id || route.id; // Используем ID локации или ID маршрута как fallback
        const key = `to_${locationId}`;
        toMap.set(key, {
          name: route.to.name,
          id: locationId,
          x: route.to.x,
          y: route.to.y,
          originalData: route.to // для отладки
        });
      }
    });
    
    console.log('From локации:', Array.from(fromMap.values()));
    console.log('To локации:', Array.from(toMap.values()));
    
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
      fromLocation: fromLocations.find(l => l.id == fromId),
      toLocation: toLocations.find(l => l.id == toId)
    });
    
    // ПРОВЕРИМ СУЩЕСТВОВАНИЕ ЛОКАЦИЙ В ДАННЫХ
    const allRoutes = await primaryService.getRoutes({ size: 100 });
    
    // Ищем маршруты, где from.id совпадает с fromId
    const routesFrom = allRoutes.routes.filter(route => 
      route.from?.id == fromId
    );
    
    // Ищем маршруты, где to.id совпадает с toId  
    const routesTo = allRoutes.routes.filter(route => 
      route.to?.id == toId
    );
    
    // Ищем конкретный маршрут между этими локациями
    const directRoute = allRoutes.routes.find(route => 
      route.from?.id == fromId && route.to?.id == toId
    );
    
    console.log('Отладочная информация о локациях:', {
      fromId,
      toId,
      routesFrom: routesFrom.map(r => ({ id: r.id, from: r.from, to: r.to })),
      routesTo: routesTo.map(r => ({ id: r.id, from: r.from, to: r.to })),
      directRoute: directRoute ? { id: directRoute.id, from: directRoute.from, to: directRoute.to } : null
    });

    const foundRoutes = await secondaryService.findRoutesBetween(fromId, toId, 'distance');
    console.log('📋 Результат поиска от навигатора:', foundRoutes);
    
    const fromLocation = fromLocations.find(l => l.id == fromId);
    const toLocation = toLocations.find(l => l.id == toId);
    
    if (foundRoutes.routes && foundRoutes.routes.length === 0) {
      if (directRoute) {
        setError(`Маршрут между "${fromLocation?.name || fromId}" и "${toLocation?.name || toId}" существует (ID: ${directRoute.id}), но навигатор его не находит. Возможна проблема с сервером навигатора.`);
      } else {
        setError(`Маршруты между "${fromLocation?.name || fromId}" и "${toLocation?.name || toId}" не найдены.`);
      }
    }
    
    setResult(foundRoutes);
  } catch (err) {
    console.error('Ошибка поиска:', err);
    
    // Более информативное сообщение об ошибке
    if (err.message.includes('404')) {
      const fromLocation = fromLocations.find(l => l.id == fromId);
      const toLocation = fromLocations.find(l => l.id == toId);
      setError(`Навигатор не нашел маршруты между "${fromLocation?.name || fromId}" и "${toLocation?.name || toId}". Локации могут не существовать в системе навигатора.`);
    } else {
      setError(err.message);
    }
  } finally {
    setLoading(false);
  }
};
  const handleClear = () => {
    setFromId('');
    setToId('');
    setResult(null);
    setError('');
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
      
      <div className="finder-form">
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
          
          {/* ТОЛЬКО ДЛЯ ОТКУДА */}
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
          
          {/* ТОЛЬКО ДЛЯ КУДА */}
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
          <h4>Результаты поиска:</h4>
          
          {result.routes && result.routes.length > 0 ? (
            <div className="routes-list">
              {result.routes.map(route => (
                <div key={route.id} className="route-card">
                  <h5>Маршрут #{route.id}: {route.name}</h5>
                  <p><strong>Дистанция:</strong> {route.distance}</p>
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