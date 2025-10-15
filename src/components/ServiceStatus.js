import React, { useState, useEffect } from 'react';

const ServiceStatus = () => {
  const [services, setServices] = useState({
    primary: { status: 'checking', message: '' },
    secondary: { status: 'checking', message: '' }
  });
  const [lastChecked, setLastChecked] = useState(null);

  const checkService = async (url, name) => {
    try {
      const response = await fetch(url, { 
        method: 'GET',
        mode: 'no-cors'
      });
      return { status: 'online', message: '' }; // УБИРАЕМ "Сервис доступен"
    } catch (error) {
      return { status: 'offline', message: `Ошибка подключения` };
    }
  };

  const checkAllServices = async () => {
    const primaryResult = await checkService(
      'http://localhost:18080/route-management-service/application.wadl',
      'primary'
    );
    const secondaryResult = await checkService(
      'http://localhost:18081/navigator-service/application.wadl', 
      'secondary'
    );

    setServices({
      primary: primaryResult,
      secondary: secondaryResult
    });
    setLastChecked(new Date());
  };

  useEffect(() => {
    checkAllServices();
    const interval = setInterval(checkAllServices, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status) => {
    return status === 'online' ? '#4caf50' : status === 'offline' ? '#f44336' : '#ff9800';
  };

  const getStatusText = (status) => {
    return status === 'online' ? 'Доступен' : status === 'offline' ? 'Недоступен' : 'Проверка...';
  };

  return (
    <div className="service-status">
      <h3>Диагностика сервисов</h3>
      
      <div className="status-indicators">
        {Object.entries(services).map(([key, service]) => (
          <div key={key} className="status-item">
            <div className="status-header">
              <span 
                className="status-dot"
                style={{ backgroundColor: getStatusColor(service.status) }}
              ></span>
              <strong>
                {key === 'primary' ? 'Route Management Service' : 'Navigator Service'} 
                (порт {key === 'primary' ? '18080' : '18081'})
              </strong>
            </div>
            <div className="status-details">
              <div>Статус: {getStatusText(service.status)}</div>
              {service.message && <div className="status-message">{service.message}</div>}
            </div>
          </div>
        ))}
      </div>

      {lastChecked && (
        <div className="last-checked">
          Последняя проверка: {lastChecked.toLocaleTimeString('ru-RU')}
        </div>
      )}

      <button onClick={checkAllServices} className="btn btn-primary">
        Проверить снова
      </button>
    </div>
  );
};

export default ServiceStatus;