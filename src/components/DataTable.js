import React, { useState, useEffect } from 'react';
import { primaryService, secondaryService } from '../services/api';
import './DataTable.css';
import RouteFinder from './RouteFinder';
import RouteEditForm from './RouteEditForm';
import AddRouteBetween from './AddRouteBetween';

const DataTable = () => {
  const [data, setData] = useState([]);
  const [sortFields, setSortFields] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    name: '',
    minDistance: '',
    maxDistance: '',
    exactDistance: '',
    fromName: '',
    toName: '',
    coordinatesX: '',
    coordinatesY: '',
    fromX: '',
    fromY: '',
    toX: '',
    toY: '',
    id: '',
    creationDateFrom: '',
    creationDateTo: ''
  });
  const [filterTimeout, setFilterTimeout] = useState(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [sortConfig, setSortConfig] = useState({
    field: 'id',
    direction: 'asc'
  });
  const [pagination, setPagination] = useState({
    page: 0,
    size: 10,
    totalElements: 0,
    totalPages: 1
  });
  const [editingRouteId, setEditingRouteId] = useState(null);
  const [showAddRouteBetween, setShowAddRouteBetween] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const addNotification = (message, type = 'info') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    
    setTimeout(() => {
      setNotifications(prev => prev.filter(notif => notif.id !== id));
    }, 5000);
  };

  const applySorting = () => {
    if (sortFields.length > 0) {
      const sortParams = sortFields.map(sort => `${sort.field},${sort.direction}`);
      loadData({ ...filters, sort: sortParams }, 0, pagination.size);
      addNotification(`✅ Применена сортировка по ${sortFields.length} полям`, 'success');
    }
  };

  const removeSortField = (index) => {
    const newSortFields = sortFields.filter((_, i) => i !== index);
    setSortFields(newSortFields);
    
    if (newSortFields.length === 0) {
      loadData(filters, pagination.page, pagination.size);
    }
  };

  const addSortField = () => {
    setSortFields(prev => [...prev, { field: 'id', direction: 'asc' }]);
  };

  const handleSortChange = (index, type, value) => {
    const newSortFields = [...sortFields];
    newSortFields[index][type] = value;
    setSortFields(newSortFields);
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (currentFilters = filters, currentPage = pagination.page, currentSize = pagination.size) => {
    setLoading(true);
    setError('');
    
    try {
      const apiFilters = {
        page: currentPage,
        size: currentSize
      };
      
      const filterMapping = {
        name: 'filterName',
        id: 'filter.id',
        minDistance: 'filter.distance.min',
        maxDistance: 'filter.distance.max', 
        exactDistance: 'filter.distance.equals',
        fromName: 'filter.fromName',
        toName: 'filter.toName',
        coordinatesX: 'filter.coordinatesX',
        coordinatesY: 'filter.coordinatesY',
        fromX: 'filter.fromX',
        fromY: 'filter.fromY',
        toX: 'filter.toX',
        toY: 'filter.toY',
        creationDateFrom: 'filter.creationDate.from',
        creationDateTo: 'filter.creationDate.to'
      };
      
      const activeFilters = [];
      Object.keys(currentFilters).forEach(key => {
        if (currentFilters[key] && currentFilters[key] !== '') {
          const apiKey = filterMapping[key] || key;
          apiFilters[apiKey] = currentFilters[key];
          activeFilters.push(`${key}: ${currentFilters[key]}`);
        }
      });
      
      if (sortFields.length > 0) {
        const sortParams = sortFields.map(sort => `${sort.field},${sort.direction}`);
        apiFilters.sort = sortParams;
      }
      
      console.log('Загрузка с параметрами:', apiFilters);
      
      const result = await primaryService.getRoutes(apiFilters);
      
      if (result && Array.isArray(result.routes)) {
        setData(result.routes);
        setPagination({
          page: result.pagination.currentPage,
          size: result.pagination.pageSize,
          totalElements: result.pagination.totalElements,
          totalPages: result.pagination.totalPages
        });
      } else {
        setData([]);
        setPagination({
          page: 0,
          size: currentSize,
          totalElements: 0,
          totalPages: 1
        });
      }
      
    } catch (err) {
      console.error('❌ Ошибка загрузки:', err);
      setError(err.message);
      setData([]);
      addNotification(`❌ Ошибка загрузки: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const validateFilters = (filters) => {
    const errors = [];
    
    if (filters.creationDateFrom && filters.creationDateTo) {
      const from = new Date(filters.creationDateFrom);
      const to = new Date(filters.creationDateTo);
      
      if (from > to) {
        errors.push('Дата "от" не может быть позже даты "до"');
      }
    }
    
    if (filters.minDistance && filters.maxDistance) {
      const min = parseFloat(filters.minDistance);
      const max = parseFloat(filters.maxDistance);
      if (min > max) {
        errors.push('Минимальная дистанция не может быть больше максимальной');
      }
    }
    return errors;
  };

  const handleFilterChange = (field, value) => {
    const newFilters = {
      ...filters,
      [field]: value
    };
    
    setFilters(newFilters);
    
    if (filterTimeout) {
      clearTimeout(filterTimeout);
    }
    
    if (field === 'creationDateFrom' || field === 'creationDateTo') {
      const errors = validateFilters(newFilters);
      if (errors.length > 0) {
        alert(`❌ Ошибка в фильтрах:\n\n${errors.join('\n')}\n\nПожалуйста, исправьте даты.`);
        errors.forEach(error => addNotification(`❌ ${error}`, 'warning'));
        return;
      }
      
      if (newFilters.creationDateFrom && newFilters.creationDateTo) {
        const timeout = setTimeout(() => {
          loadData(newFilters, 0, pagination.size);
        }, 300);
        setFilterTimeout(timeout);
        return;
      }
      
      return;
    }
    
    const timeout = setTimeout(() => {
      const errors = validateFilters(newFilters);
      if (errors.length > 0) {
        if (errors.some(error => error.includes('дистанция') || error.includes('дата'))) {
          alert(`❌ Ошибка в фильтрах:\n\n${errors.join('\n')}\n\nПожалуйста, исправьте значения.`);
        }
        errors.forEach(error => addNotification(`❌ ${error}`, 'warning'));
        return;
      }
      loadData(newFilters, 0, pagination.size);
    }, field === 'name' ? 600 : 300);
    
    setFilterTimeout(timeout);
  };

  const handleClearFilters = () => {
    const clearedFilters = {
      name: '',
      minDistance: '',
      maxDistance: '',
      exactDistance: '',
      fromName: '',
      toName: '',
      coordinatesX: '',
      coordinatesY: '',
      fromX: '',
      fromY: '',
      toX: '',
      toY: '',
      id: '',
      creationDateFrom: '',
      creationDateTo: ''
    };
    setFilters(clearedFilters);
    setShowAdvancedFilters(false);
    addNotification('🧹 Все фильтры очищены', 'info');
    loadData(clearedFilters, 0, pagination.size);
  };

  const handleNextPage = () => {
    loadData(filters, pagination.page + 1, pagination.size);
  };

  const handlePrevPage = () => {
    if (pagination.page > 0) {
      loadData(filters, pagination.page - 1, pagination.size);
    }
  };

  const handlePageSizeChange = (newSize) => {
    setPagination(prev => ({
      ...prev,
      size: newSize,
      page: 0
    }));
    loadData(filters, 0, newSize);
  };

  const handleViewDetails = async (id) => {
    try {
      setLoading(true);
      const route = await primaryService.getRouteById(id);
      
      if (route) {
        alert(
          `Детали маршрута #${id}:\n\n` +
          `Название: ${route.name}\n` +
          `Дистанция: ${route.distance}\n` +
          `Координаты: (${route.coordinates?.x}, ${route.coordinates?.y})\n` +
          `От: ${route.from?.name} (${route.from?.x}, ${route.from?.y})\n` +
          `К: ${route.to?.name} (${route.to?.x}, ${route.to?.y})`
        );
      } else {
        alert('Маршрут не найден');
      }
    } catch (err) {
      setError('Не удалось загрузить детали маршрута: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFindRoutesBetween = async () => {
    const fromId = prompt('Введите ID начальной точки:');
    const toId = prompt('Введите ID конечной точки:');
    
    if (fromId && toId) {
      try {
        setLoading(true);
        const result = await secondaryService.findRoutesBetween(fromId, toId, 'distance');
        
        if (result.routes && result.routes.length > 0) {
          alert(`Найдено маршрутов: ${result.totalElements}\n\n` +
                result.routes.map(route => 
                  `Маршрут #${route.id}: ${route.name} (дистанция: ${route.distance})`
                ).join('\n'));
        } else {
          alert('Маршруты между указанными точками не найдены');
        }
      } catch (err) {
        setError('Не удалось найти маршруты: ' + err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSearchById = async () => {
    const id = prompt('Введите ID маршрута для поиска:');
    if (id && id.trim()) {
      try {
        setLoading(true);
        setError('');
        
        const route = await primaryService.getRouteById(id.trim());
        
        if (route) {
          alert(
            `✅ Найден маршрут #${id}:\n\n` +
            `Название: ${route.name}\n` +
            `Дистанция: ${route.distance}\n` +
            `Координаты: (${route.coordinates?.x}, ${route.coordinates?.y})\n` +
            `От: ${route.from?.name} (${route.from?.x}, ${route.from?.y})\n` +
            `К: ${route.to?.name} (${route.to?.x}, ${route.to?.y})`
          );
        } else {
          const availableIds = data.map(r => r.id).filter(Boolean);
          alert(
            `❌ Маршрут с ID ${id} не найден\n\n` +
            `Доступные ID: ${availableIds.join(', ')}\n` +
            `Проверьте правильность ID и попробуйте снова.`
          );
        }
      } catch (err) {
        setError('Не удалось найти маршрут: ' + err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Вы уверены, что хотите удалить этот маршрут?')) {
      try {
        await primaryService.deleteRoute(id);
        loadData(filters, pagination.page, pagination.size);
      } catch (err) {
        setError(err.message);
      }
    }
  };

  const handleRouteUpdated = () => {
    setEditingRouteId(null);
    loadData();
  };

  const handleRouteAdded = () => {
    setShowAddRouteBetween(false);
    loadData();
  };

  const renderTableRows = () => {
    if (loading) {
      return (
        <tr>
          <td colSpan="6" className="loading-data">
            <div className="loading-spinner">Загрузка...</div>
          </td>
        </tr>
      );
    }

    if (data.length === 0) {
      return (
        <tr>
          <td colSpan="6" className="no-data">
            {Object.values(filters).some(value => value && value !== '') 
              ? 'Маршруты по заданным фильтрам не найдены' 
              : 'Нет маршрутов для отображения'
            }
          </td>
        </tr>
      );
    }
   
    return data.map(route => (
      <tr key={route.id} className="route-row">
        <td className="route-id">{route.id}</td>
        <td className="route-name">
          <div className="route-name-cell">
            <strong>{route.name}</strong>
            {route.creationDate && (
              <small className="creation-date">
                Создан: {new Date(route.creationDate).toLocaleDateString('ru-RU')}
              </small>
            )}
          </div>
        </td>
        <td className="route-distance">{route.distance}</td>
        <td className="route-from">
          {route.from?.name || 'Не указано'}
          {route.from?.id && <small> (ID: {route.from.id})</small>}
        </td>
        <td className="route-to">
          {route.to?.name || 'Не указано'}
          {route.to?.id && <small> (ID: {route.to.id})</small>}
        </td>
        <td className="route-actions">
          <div className="action-buttons">
            <button 
              className="btn btn-info btn-sm"
              onClick={() => handleViewDetails(route.id)}
            >
              Подробнее
            </button>
            <button 
              className="btn btn-warning btn-sm"
              onClick={() => setEditingRouteId(route.id)}
            >
              Редактировать
            </button>
            <button 
              className="btn btn-danger btn-sm"
              onClick={() => handleDelete(route.id)}
            >
              Удалить
            </button>
          </div>
        </td>
      </tr>
    ));
  };

  const NotificationContainer = () => (
    <div className="notifications-container">
      {notifications.map(notification => (
        <div 
          key={notification.id} 
          className={`notification notification-${notification.type}`}
        >
          {notification.message}
          <button 
            onClick={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}
            className="notification-close"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );

  return (
    <div className="data-table-container">
      <h2>Управление маршрутами</h2>
      <NotificationContainer />
      
      <div className="filter-status">
        {Object.values(filters).some(value => value && value !== '') && (
          <div className="active-filters">
            <span className="filter-badge">Фильтры активны</span>
            <button 
              onClick={handleClearFilters}
              className="btn btn-sm btn-outline"
            >
              Сбросить все
            </button>
          </div>
        )}
      </div>

      <div className="results-info">
        {loading ? (
          <span>Загрузка...</span>
        ) : (
          <span>
            Показано: <strong>{data.length}</strong> из <strong>{pagination.totalElements}</strong> маршрутов
            {Object.values(filters).some(value => value && value !== '') && ' (отфильтровано)'}
          </span>
        )}
      </div>

      {showAddRouteBetween && (
        <AddRouteBetween 
          onRouteAdded={handleRouteAdded}
          onCancel={() => setShowAddRouteBetween(false)}
        />
      )}
      
      {editingRouteId && (
        <RouteEditForm 
          routeId={editingRouteId}
          onRouteUpdated={handleRouteUpdated}
          onCancel={() => setEditingRouteId(null)}
        />
      )}
      
      <div className="controls">
        <button onClick={() => loadData()} className="btn btn-primary" disabled={loading}>
          {loading ? 'Загрузка...' : 'Обновить данные'}
        </button>
        <button onClick={handleClearFilters} className="btn btn-warning">
          Сбросить фильтры
        </button>
        <button onClick={handleSearchById} className="btn btn-info">
          Найти маршрут по ID
        </button>
        <button 
          onClick={() => setShowAddRouteBetween(true)} 
          className="btn btn-success"
        >
          Добавить маршрут между локациями
        </button>
      </div>

      <RouteFinder />

      <div className="filters">
        <div className="filter-group">
          <label>Название:</label>
          <input
            type="text"
            value={filters.name}
            onChange={(e) => handleFilterChange('name', e.target.value)}
            placeholder="Фильтр по названию..."
          />
        </div>
        <div className="filter-group">
          <label>Мин. дистанция:</label>
          <input
            type="number"
            value={filters.minDistance}
            onChange={(e) => handleFilterChange('minDistance', e.target.value)}
            placeholder="От"
            min="0"
            step="0.1"
          />
        </div>
        <div className="filter-group">
          <label>Макс. дистанция:</label>
          <input
            type="number"
            value={filters.maxDistance}
            onChange={(e) => handleFilterChange('maxDistance', e.target.value)}
            placeholder="До"
            min="0"
            step="0.1"
          />
        </div>
      </div>

      <div className="controls" style={{marginTop: '10px'}}>
        <button 
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)} 
          className="btn btn-info"
        >
          {showAdvancedFilters ? '▲ Скрыть расширенные фильтры' : '▼ Расширенные фильтры'}
        </button>
      </div>

      {showAdvancedFilters && (
        <div className="filters advanced-filters">
          <div className="filter-group">
            <label>Точный ID:</label>
            <input
              type="number"
              value={filters.id}
              onChange={(e) => handleFilterChange('id', e.target.value)}
              placeholder="Точный ID маршрута"
              min="1"
            />
          </div>
          
          <div className="filter-group">
            <label>Точная дистанция:</label>
            <input
              type="number"
              value={filters.exactDistance}
              onChange={(e) => handleFilterChange('exactDistance', e.target.value)}
              placeholder="Равно"
              min="1"
              step="0.1"
            />
          </div>
          
          <div className="filter-group">
            <label>Откуда (название):</label>
            <input
              type="text"
              value={filters.fromName}
              onChange={(e) => handleFilterChange('fromName', e.target.value)}
              placeholder="Название начальной точки"
            />
          </div>
          
          <div className="filter-group">
            <label>Куда (название):</label>
            <input
              type="text"
              value={filters.toName}
              onChange={(e) => handleFilterChange('toName', e.target.value)}
              placeholder="Название конечной точки"
            />
          </div>
          
          <div className="filter-group">
            <label>Координата X:</label>
            <input
              type="number"
              value={filters.coordinatesX}
              onChange={(e) => handleFilterChange('coordinatesX', e.target.value)}
              placeholder="X координата маршрута"
              step="0.1"
            />
          </div>
          
          <div className="filter-group">
            <label>Координата Y:</label>
            <input
              type="number"
              value={filters.coordinatesY}
              onChange={(e) => handleFilterChange('coordinatesY', e.target.value)}
              placeholder="Y координата маршрута"
              step="0.1"
            />
          </div>

          <div className="filter-group">
            <label>Координата X (от):</label>
            <input
              type="number"
              value={filters.fromX}
              onChange={(e) => handleFilterChange('fromX', e.target.value)}
              placeholder="X точки отправления"
              step="0.1"
            />
          </div>
          
          <div className="filter-group">
            <label>Координата Y (от):</label>
            <input
              type="number"
              value={filters.fromY}
              onChange={(e) => handleFilterChange('fromY', e.target.value)}
              placeholder="Y точки отправления"
              step="0.1"
            />
          </div>

          <div className="filter-group">
            <label>Координата X (до):</label>
            <input
              type="number"
              value={filters.toX}
              onChange={(e) => handleFilterChange('toX', e.target.value)}
              placeholder="X точки назначения"
              step="0.1"
            />
          </div>
          
          <div className="filter-group">
            <label>Координата Y (до):</label>
            <input
              type="number"
              value={filters.toY}
              onChange={(e) => handleFilterChange('toY', e.target.value)}
              placeholder="Y точки назначения"
              step="0.1"
            />
          </div>

          <div className="filter-group">
            <label>Дата создания от:</label>
            <input
              type="datetime-local"
              value={filters.creationDateFrom}
              onChange={(e) => handleFilterChange('creationDateFrom', e.target.value)}
              title="Фильтр по дате создания (от)"
            />
            <small style={{fontSize: '10px', color: '#666'}}>ГГГГ-ММ-ДД ЧЧ:ММ</small>
          </div>

          <div className="filter-group">
            <label>Дата создания до:</label>
            <input
              type="datetime-local"
              value={filters.creationDateTo}
              onChange={(e) => handleFilterChange('creationDateTo', e.target.value)}
              title="Фильтр по дате создания (до)"
            />
            <small style={{fontSize: '10px', color: '#666'}}>ГГГГ-ММ-ДД ЧЧ:ММ</small>
          </div>
        </div>
      )}

      <div className="sorting-section">
        <h4>Сортировка:</h4>
        <div className="sort-controls">
          <button 
            onClick={addSortField}
            className="btn btn-outline btn-sm"
          >
            + Добавить поле сортировки
          </button>
          
          {sortFields.map((sort, index) => (
            <div key={index} className="sort-item">
              <select
                value={sort.field}
                onChange={(e) => handleSortChange(index, 'field', e.target.value)}
                className="sort-select"
              >
                <option value="id">ID</option>
                <option value="name">Название</option>
                <option value="distance">Дистанция</option>
                <option value="creationDate">Дата создания</option>
                <option value="coordinatesX">Координата X маршрута</option>
                <option value="coordinatesY">Координата Y маршрута</option>
                <option value="fromX">X точки отправления</option>
                <option value="fromY">Y точки отправления</option>
                <option value="fromName">Название точки отправления</option>
                <option value="toX">X точки назначения</option>
                <option value="toY">Y точки назначения</option>
                <option value="toName">Название точки назначения</option>
              </select>
              
              <select
                value={sort.direction}
                onChange={(e) => handleSortChange(index, 'direction', e.target.value)}
                className="sort-direction"
              >
                <option value="asc">По возрастанию</option>
                <option value="desc">По убыванию</option>
              </select>
              
              <button 
                onClick={() => removeSortField(index)}
                className="btn btn-danger btn-sm"
                title="Удалить поле сортировки"
              >
                ×
              </button>
            </div>
          ))}
          
          {sortFields.length > 0 && (
            <button 
              onClick={applySorting}
              className="btn btn-primary btn-sm"
              style={{marginLeft: '10px'}}
            >
              Применить сортировку
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="error-message">Ошибка: {error}</div>
      )}

      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Название</th>
              <th>Дистанция</th>
              <th>Откуда</th>
              <th>Куда</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {renderTableRows()}
          </tbody>
        </table>
      </div>

      <div className="pagination">
        <div className="page-size-selector">
          <label>Строк на странице:</label>
          <select 
            value={pagination.size} 
            onChange={(e) => handlePageSizeChange(parseInt(e.target.value))}
            disabled={loading}
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>
        
        <div className="page-info">
          Страница: {pagination.page + 1} из {pagination.totalPages}
        </div>
        
        <div className="page-navigation">
          <button 
            onClick={handlePrevPage} 
            disabled={pagination.page === 0 || loading}
            className="btn btn-secondary"
          >
            Назад
          </button>
          <span>Всего элементов: {pagination.totalElements}</span>
          <button 
            onClick={handleNextPage} 
            disabled={pagination.page >= pagination.totalPages - 1 || loading}
            className="btn btn-secondary"
          >
            Вперед
          </button>
        </div>
      </div>
    </div>
  );
};

export default DataTable;