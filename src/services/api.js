import axios from 'axios';
// api.js
const PRIMARY_SERVICE_URL = 'https://localhost:18443/route-management-service';
const SECONDARY_SERVICE_URL = 'https://localhost:18444/navigator-service';

const primaryApi = axios.create({
  baseURL: PRIMARY_SERVICE_URL,
  timeout: parseInt(process.env.REACT_APP_API_TIMEOUT) || 15000,
  headers: {
    'Accept': 'application/xml',
    'Content-Type': 'application/xml'
  }
});

const secondaryApi = axios.create({
  baseURL: SECONDARY_SERVICE_URL,
  timeout: parseInt(process.env.REACT_APP_API_TIMEOUT) || 15000,
  headers: {
    'Accept': 'application/xml',
    'Content-Type': 'application/xml'
  }
});

primaryApi.interceptors.response.use(
  response => response,
  error => {
    console.error('Primary API Error:', error);
    return Promise.reject(error);
  }
);

secondaryApi.interceptors.response.use(
  response => response,
  error => {
    console.error('Secondary API Error:', error);
    return Promise.reject(error);
  }
);
const handleApiError = (error, defaultMessage) => {
  console.error('API Error:', error);
  if (error.response) {
    // Сервер ответил с ошибкой
    const status = error.response.status;
    let message = defaultMessage;
    
    if (error.response.data) {
      try {
        // Если это XML
        if (typeof error.response.data === 'string' && error.response.data.includes('<?xml')) {
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(error.response.data, "text/xml");
          const errorElement = xmlDoc.getElementsByTagName('error')[0] || 
                             xmlDoc.getElementsByTagName('message')[0] ||
                             xmlDoc.getElementsByTagName('faultstring')[0];
          if (errorElement) {
            message = errorElement.textContent;
          } else {
            // Покажем весь XML для отладки
            message = error.response.data.substring(0, 500);
          }
        } else {
          // Если не XML, используем как есть
          message = error.response.data.toString().substring(0, 500);
        }
      } catch (e) {
        console.error('Error parsing error response:', e);
        message = error.response.data.toString().substring(0, 500);
      }
    }
    
    return new Error(`${message} (Статус: ${status})`);
  } else if (error.request) {
    return new Error('Сервер не отвечает. Проверьте:\n1. SSH туннель активен\n2. Сервисы запущены на helios');
  } else {
    return new Error(defaultMessage);
  }
};

// Функция для проверки доступности сервиса
const checkServiceAvailability = async (api, serviceName) => {
  try {
    const response = await api.get('/application.wadl', {
      timeout: 3000,
      validateStatus: null
    });
    console.log(`${serviceName} статус:`, response.status);
    return response.status === 200;
  } catch (error) {
    console.log(`${serviceName} недоступен:`, error.message);
    return false;
  }
};
const parseRoutesFromXML = (xmlString) => {
  try {
    console.log('📄 RAW XML RESPONSE:', xmlString);
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, "text/xml");
     console.log('XML Structure:', {
      totalElements: xmlDoc.getElementsByTagName('totalElements')[0]?.textContent,
      routeCount: xmlDoc.getElementsByTagName('route').length
    });
    const parseError = xmlDoc.getElementsByTagName('parsererror');
    if (parseError.length > 0) {
      console.error('Ошибка парсинга XML:', parseError[0].textContent);
      return { routes: [], pagination: {} };
    }
    
    // Пагинация
    const totalElements = parseInt(xmlDoc.getElementsByTagName('totalElements')[0]?.textContent) || 0;
    const totalPages = parseInt(xmlDoc.getElementsByTagName('totalPages')[0]?.textContent) || 1;
    const currentPage = parseInt(xmlDoc.getElementsByTagName('currentPage')[0]?.textContent) || 0;
    const pageSize = parseInt(xmlDoc.getElementsByTagName('pageSize')[0]?.textContent) || 10;
    
    // Ищем route элементы
    let routeElements = xmlDoc.getElementsByTagName('route');
    
    const routes = [];
    
    for (let i = 0; i < routeElements.length; i++) {
      const route = routeElements[i];
      
      const getText = (tagName) => {
        const elements = route.getElementsByTagName(tagName);
        const text = elements.length > 0 ? elements[0].textContent || '' : '';
        return text;
      };
      
      const getNumber = (tagName) => {
        const text = getText(tagName);
        return text ? parseFloat(text) : 0;
      };

const getLocationData = (locationTagName) => {
  const locationElement = route.getElementsByTagName(locationTagName)[0];
  if (!locationElement) return { name: '', x: 0, y: 0, id: null };
  
  return {
    name: locationElement.getElementsByTagName('name')[0]?.textContent || '',
    x: parseFloat(locationElement.getElementsByTagName('x')[0]?.textContent) || 0,
    y: parseFloat(locationElement.getElementsByTagName('y')[0]?.textContent) || 0,
    id: parseInt(locationElement.getElementsByTagName('id')[0]?.textContent) || null
  };
};   
      const creationDateText = getText('creationDate');
      let creationDate = null;
      if (creationDateText) {
        try {
          creationDate = new Date(creationDateText).toISOString();
        } catch (e) {
          console.warn('Не удалось распарсить дату:', creationDateText);
        }
      }
      
      const routeData = {
        id: parseInt(getText('id')) || 0,
        name: getText('name'),
        distance: getNumber('distance'),
        coordinates: {
          x: getNumber('coordinates.x') || 0,
          y: getNumber('coordinates.y') || 0
        },
       from: getLocationData('fromLocation'),
to: getLocationData('toLocation'),
        creationDate: creationDate // Сохраняем как ISO строку
      };
      
      routes.push(routeData);
    }
    
    return {
      routes: routes,
      pagination: { totalElements, totalPages, currentPage, pageSize }
    };
    
  } catch (error) {
    console.error('Ошибка парсинга XML:', error);
    return { routes: [], pagination: {} };
  }
};
// Вспомогательная функция для парсинга одного маршрута
const parseSingleRouteFromXML = (routeElement) => {
  const getText = (tagName) => {
    const elements = routeElement.getElementsByTagName(tagName);
    return elements.length > 0 ? elements[0].textContent || '' : '';
  };
  
  const getNumber = (tagName) => {
    const text = getText(tagName);
    return text ? parseFloat(text) : 0;
  };
  
  const getLocationData = (locationTagName) => {
    const locationElement = routeElement.getElementsByTagName(locationTagName)[0];
    if (!locationElement) return { name: '', x: 0, y: 0, id: null };
    
    return {
      name: locationElement.getElementsByTagName('name')[0]?.textContent || '',
      x: parseFloat(locationElement.getElementsByTagName('x')[0]?.textContent) || 0,
      y: parseFloat(locationElement.getElementsByTagName('y')[0]?.textContent) || 0,
      id: parseInt(locationElement.getElementsByTagName('id')[0]?.textContent) || null
    };
  };
  
  // Парсинг даты
  const creationDateText = getText('creationDate');
  let creationDate = null;
  if (creationDateText) {
    try {
      creationDate = new Date(creationDateText).toISOString();
    } catch (e) {
      console.warn('Не удалось распарсить дату:', creationDateText);
    }
  }
  
  return {
    id: parseInt(getText('id')) || 0,
    name: getText('name'),
    distance: getNumber('distance'),
    coordinates: {
      x: getNumber('coordinates.x') || 0,
      y: getNumber('coordinates.y') || 0
    },
    from: getLocationData('fromLocation'),
to: getLocationData('toLocation'),
    creationDate: creationDate
  };
};
const createRouteViaPrimaryService = async (idFrom, idTo, distance) => {
  try {
    
    // Получаем информацию о локациях
    const allRoutes = await primaryService.getRoutes({ size: 1000 });
    const fromLocation = allRoutes.routes.find(r => r.from?.id === parseInt(idFrom))?.from;
    const toLocation = allRoutes.routes.find(r => r.to?.id === parseInt(idTo))?.to;
    
    if (!fromLocation || !toLocation) {
      throw new Error('Не удалось найти информацию о локациях');
    }
    
    // Создаем маршрут через основной сервис
    const routeData = {
      name: `Маршрут ${fromLocation.name} - ${toLocation.name}`,
      coordinates: {
        x: (fromLocation.x + toLocation.x) / 2,
        y: (fromLocation.y + toLocation.y) / 2
      },
      from: {
        name: fromLocation.name,
        x: fromLocation.x,
        y: fromLocation.y
      },
      to: {
        name: toLocation.name,
        x: toLocation.x,
        y: toLocation.y
      },
      distance: parseFloat(distance)
    };
    
    const result = await primaryService.createRoute(routeData);
    
    return { 
      success: true, 
      message: `Маршрут "${routeData.name}" создан через основной сервис (навигатор недоступен)`,
      route: routeData
    };
    
  } catch (error) {
    throw new Error(`Не удалось создать маршрут: ${error.message}`);
  }
};
export const primaryService = {
  checkStatus: async () => {
    return await checkServiceAvailability(primaryApi, 'Primary Service');
  },
getRouteById: async (id) => {
  try {
    const searchId = parseInt(id);
    
    if (isNaN(searchId)) {
      return null;
    }
    
    // Получаем все маршруты и ищем нужный
    const allRoutes = await primaryService.getRoutes({ size: 1000 });
    
    const route = allRoutes.routes.find(route => route.id === searchId);
    
    return route || null;
    
  } catch (error) {
    console.error('Ошибка поиска маршрута:', error);
    throw handleApiError(error, 'Не удалось найти маршрут');
  }
},
updateRoute: async (id, routeData) => {
  try {
    // ТОЛЬКО ИЗМЕНЯЕМЫЕ ПОЛЯ - как в рабочем скрипте
    const xmlData = `<?xml version="1.0" encoding="UTF-8"?>
<RouteUpdateRequest>
  <name>${routeData.name}</name>
  <distance>${routeData.distance}</distance>
</RouteUpdateRequest>`;

    const response = await primaryApi.put(`/routes/${id}`, xmlData, {
      validateStatus: null,
      headers: {
        'Content-Type': 'application/xml'
      }
    });
    
    if (response.status === 200) {
      return { success: true, message: 'Маршрут обновлен' };
    } else {
      throw new Error(`Ошибка обновления: статус ${response.status}`);
    }
  } catch (error) {
    throw handleApiError(error, 'Не удалось обновить маршрут');
  }
},
getDistanceSum: async () => {
  try {
    const response = await primaryApi.get('/routes/distance/sum', {
      validateStatus: null
    });
    
    
    if (typeof response.data === 'string' && response.data.includes('<?xml')) {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(response.data, "text/xml");
      
      // ПРАВИЛЬНЫЕ ТЕГИ ИЗ SWAGGER
      const totalSum = xmlDoc.getElementsByTagName('totalSum')[0]?.textContent || '0';
      const routeCount = xmlDoc.getElementsByTagName('routeCount')[0]?.textContent || '0';
      const averageDistance = xmlDoc.getElementsByTagName('averageDistance')[0]?.textContent || '0';
      const minDistance = xmlDoc.getElementsByTagName('minDistance')[0]?.textContent || '0';
      const maxDistance = xmlDoc.getElementsByTagName('maxDistance')[0]?.textContent || '0';
      
      const result = {
        totalSum: parseFloat(totalSum) || 0,
        routeCount: parseInt(routeCount) || 0,
        averageDistance: parseFloat(averageDistance) || 0,
        minDistance: parseFloat(minDistance) || 0,
        maxDistance: parseFloat(maxDistance) || 0
      };
      
      return result;
    }
    
    return response.data || { totalSum: 0, routeCount: 0, averageDistance: 0 };
  } catch (error) {
    throw handleApiError(error, 'Не удалось получить сумму дистанций');
  }
},
getDistanceGroup: async () => {
  try {
    const response = await primaryApi.get('/routes/distance/group', {
      validateStatus: null
    });
    
    
    if (typeof response.data === 'string' && response.data.includes('<?xml')) {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(response.data, "text/xml");
      
      const groups = [];
      const groupElements = xmlDoc.getElementsByTagName('group');
      
      for (let i = 0; i < groupElements.length; i++) {
        const group = groupElements[i];
        const distance = group.getElementsByTagName('distance')[0]?.textContent;
        const count = group.getElementsByTagName('count')[0]?.textContent;
        const percentage = group.getElementsByTagName('percentage')[0]?.textContent;
        
        if (distance && count) {
          groups.push({
            distance: parseFloat(distance) || 0,
            count: parseInt(count) || 0,
            percentage: parseFloat(percentage) || 0
          });
        }
      }
      
      const totalGroups = parseInt(xmlDoc.getElementsByTagName('totalGroups')[0]?.textContent) || 0;
      const totalRoutes = parseInt(xmlDoc.getElementsByTagName('totalRoutes')[0]?.textContent) || 0;
      
      const result = {
        groups: groups,
        totalGroups: totalGroups,
        totalRoutes: totalRoutes
      };
      
      return result;
    }
    
    return response.data;
  } catch (error) {
    throw handleApiError(error, 'Не удалось получить группировку по дистанции');
  }
},
getRoutesGreaterThan: async (minDistance) => {
  try {
    const response = await primaryApi.get('/routes/distance/greater-than', {
      params: { minDistance: minDistance },
      validateStatus: null
    });
    
    let result;
    if (typeof response.data === 'string' && response.data.includes('<?xml')) {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(response.data, "text/xml");
      
      // Парсим маршруты используя существующую функцию
      const routeElements = xmlDoc.getElementsByTagName('route');
      const routes = [];
      
      for (let i = 0; i < routeElements.length; i++) {
        const route = routeElements[i];
        
        const getText = (tagName) => {
          const elements = route.getElementsByTagName(tagName);
          return elements.length > 0 ? elements[0].textContent || '' : '';
        };
        
        const getNumber = (tagName) => {
          const text = getText(tagName);
          return text ? parseFloat(text) : 0;
        };
        
        const getLocationData = (locationTagName) => {
          const locationElement = route.getElementsByTagName(locationTagName)[0];
          if (!locationElement) return { name: '', x: 0, y: 0, id: null };
          
          return {
            name: locationElement.getElementsByTagName('name')[0]?.textContent || '',
            x: parseFloat(locationElement.getElementsByTagName('x')[0]?.textContent) || 0,
            y: parseFloat(locationElement.getElementsByTagName('y')[0]?.textContent) || 0,
            id: parseInt(locationElement.getElementsByTagName('id')[0]?.textContent) || null
          };
        };
        
        const routeData = {
          id: parseInt(getText('id')) || 0,
          name: getText('name'),
          distance: getNumber('distance'),
          coordinates: {
            x: getNumber('coordinates.x') || 0,
            y: getNumber('coordinates.y') || 0
          },
          creationDate: getText('creationDate'),
          from: getLocationData('fromLocation'),
to: getLocationData('toLocation')
        };
        
        routes.push(routeData);
      }
      
      // Парсим дополнительную информацию
      const count = parseInt(xmlDoc.getElementsByTagName('count')[0]?.textContent) || routes.length;
      const minDist = parseFloat(xmlDoc.getElementsByTagName('minDistance')[0]?.textContent) || minDistance;
      const maxDist = parseFloat(xmlDoc.getElementsByTagName('maxDistance')[0]?.textContent) || 0;
      const avgDist = parseFloat(xmlDoc.getElementsByTagName('averageDistance')[0]?.textContent) || 0;
      
      result = {
        routes: routes,
        count: count,
        minDistance: minDist,
        maxDistance: maxDist,
        averageDistance: avgDist
      };
    } else {
      result = response.data;
    }
    
    return result;
    
  } catch (error) {
    throw handleApiError(error, 'Не удалось найти маршруты');
  }
},
createRouteBetweenExisting: async (idFrom, idTo, distance) => {
  try {
    
    const response = await primaryApi.post(`/routes/add/${idFrom}/${idTo}/${distance}`, null, {
      validateStatus: null
    });
  
    
    if (response.status === 200 || response.status === 201) {
      return { success: true, message: 'Маршрут создан между существующими локациями' };
    } else {
      throw new Error(`Ошибка: статус ${response.status}`);
    }
  } catch (error) {
    throw handleApiError(error, 'Не удалось создать маршрут между локациями');
  }
},// В api.js - исправьте функцию getRoutes
getRoutes: async (filters = {}) => {
  try {
    const params = new URLSearchParams();
    
    // Базовая пагинация
    params.append('page', filters.page || 0);
    params.append('size', filters.size || 10);
    
 Object.keys(filters).forEach(key => {
      // Пропускаем служебные параметры
      if (key === 'page' || key === 'size' || key === 'sort') return;
      
      const value = filters[key];
      if (value !== undefined && value !== null && value !== '') {
        // Для параметров с точками (filter.creationDate.gte) используем как есть
        if (key.includes('.')) {
          params.append(key, value);
        } else {
          // Для простых параметров
          params.append(key, value);
        }
      }
    });
    // СОРТИРОВКА
    if (filters.sort) {
      if (Array.isArray(filters.sort)) {
        filters.sort.forEach(sort => params.append('sort', sort));
      } else {
        params.append('sort', filters.sort);
      }
    }
    
    console.log('🔍 Параметры запроса к API:', Object.fromEntries(params));
    
    const response = await primaryApi.get('/routes', { 
      params,
      timeout: 10000
    });
    
    const result = parseRoutesFromXML(response.data);
    
    // Детальная отладочная информация
    console.log('📊 Детальный анализ результата:', {
      totalElements: result.pagination?.totalElements,
      routesCount: result.routes?.length,
      hasFilterName: !!filters['filterName'],
      filterNameValue: filters['filterName'],
      allRouteNames: result.routes?.map(r => r.name)
    });
    
    return result;
    
  } catch (error) {
    throw handleApiError(error, 'Не удалось загрузить маршруты');
  }
},
createRoute: async (routeData) => {
  try {
    console.log('🔍 routeData для создания:', routeData);
    
    // Проверяем каждое поле на null/undefined
    const fieldsToCheck = [
      'name', 'coordinates.x', 'coordinates.y', 
      'from.name', 'from.x', 'from.y',
      'to.name', 'to.x', 'to.y', 'distance'
    ];
    
    fieldsToCheck.forEach(field => {
      const value = field.split('.').reduce((obj, key) => obj?.[key], routeData);
      console.log(`${field}:`, value, 'is null?', value === null, 'is undefined?', value === undefined);
    });
    const xmlData = `<?xml version="1.0" encoding="UTF-8"?><RouteCreateRequest><name>${routeData.name}</name><coordinates><x>${Math.floor(routeData.coordinates?.x || 0)}</x><y>${Math.floor(routeData.coordinates?.y || 0)}</y></coordinates><fromLocation><name>${routeData.from?.name}</name><x>${Math.floor(routeData.from?.x || 0)}</x><y>${Math.floor(routeData.from?.y || 0)}</y></fromLocation><toLocation><name>${routeData.to?.name}</name><x>${Math.floor(routeData.to?.x || 0)}</x><y>${Math.floor(routeData.to?.y || 0)}</y></toLocation><distance>${routeData.distance}</distance></RouteCreateRequest>`;
    console.log('Отправляемый XML для создания:', xmlData);
    
    const response = await primaryApi.post('/routes', xmlData, {
      validateStatus: null,
      headers: {
        'Content-Type': 'application/xml'
      }
    });
  
    if (response.status === 201 || response.status === 200) {
      return { 
        success: true, 
        message: 'Маршрут создан успешно',
        data: response.data
      };
    } else {
      // ДЕТАЛЬНЫЙ ПАРСИНГ ОШИБКИ
      let errorMessage = `Ошибка создания маршрута (статус ${response.status})`;
      
      if (typeof response.data === 'string') {
        try {
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(response.data, "text/xml");
          
          const message = xmlDoc.getElementsByTagName('message')[0]?.textContent;
          const details = xmlDoc.getElementsByTagName('detail');
          
          if (message) errorMessage = message;
          
          // Собираем все детали ошибки
          const detailMessages = [];
          for (let i = 0; i < details.length; i++) {
            detailMessages.push(details[i].textContent);
          }
          if (detailMessages.length > 0) {
            errorMessage += ': ' + detailMessages.join(', ');
          }
        } catch (e) {
          console.error('Ошибка парсинга ошибки:', e);
          // Если не XML, покажем как есть
          if (response.data.length < 500) {
            errorMessage = response.data;
          }
        }
      }
      
      throw new Error(errorMessage);
    }
  } catch (error) {
    throw handleApiError(error, 'Не удалось создать маршрут');
  }
},
checkExistingRoutes: async () => {
  try {
    const routes = await primaryService.getRoutes({ size: 5 });
    return routes;
  } catch (error) {
    console.error('Ошибка получения маршрутов:', error);
    return [];
  }
},
getRouteById: async (id) => {
  try {
    const searchId = parseInt(id);
    if (isNaN(searchId)) {
      return null;
    }
    
    // Получаем все маршруты
    const allRoutes = await primaryService.getRoutes({ size: 1000 });
    
    // Детальный поиск
    const route = allRoutes.routes.find(route => {
      const match = route.id === searchId;
      return match;
    });

    return route || null;
    
  } catch (error) {
    console.error('Ошибка поиска маршрута:', error);
    throw handleApiError(error, 'Не удалось найти маршрут');
  }
},
  deleteRoute: async (id) => {
    try {
      const response = await primaryApi.delete(`/routes/${id}`, {
        validateStatus: null
      });
      
      if (response.status === 200 || response.status === 204) {
        return { success: true, message: 'Маршрут удален' };
      } else {
        throw new Error(`Ошибка удаления: статус ${response.status}`);
      }
    } catch (error) {
      throw handleApiError(error, 'Не удалось удалить маршрут');
    }
  }
};

export const secondaryService = {
  checkStatus: async () => {
    return await checkServiceAvailability(secondaryApi, 'Secondary Service');
  },
addRouteBetween: async (idFrom, idTo, distance) => {
  try {
    // ПРАВИЛЬНЫЙ URL согласно логам сервера: /navigator-service/navigator/route/add/{idFrom}/{idTo}/{distance}
    const correctEndpoint = `/navigator/route/add/${idFrom}/${idTo}/${distance}`;
    console.log('Используем endpoint для создания:', correctEndpoint);
    
    const response = await secondaryApi.post(correctEndpoint, null, {
      validateStatus: function (status) {
        return status >= 200 && status < 600; // Принимаем все статусы
      },
      headers: {
        'Content-Type': 'application/xml'
      }
    });
    
    if (response.status === 201 || response.status === 200) {
      // Парсим успешный ответ
      if (typeof response.data === 'string' && response.data.includes('<?xml')) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(response.data, "text/xml");
        
        const message = xmlDoc.getElementsByTagName('message')[0]?.textContent || 'Маршрут успешно создан';
        const createdBy = xmlDoc.getElementsByTagName('createdBy')[0]?.textContent || 'navigator-service';
        
        // Парсим созданный маршрут
        const routeElement = xmlDoc.getElementsByTagName('route')[0];
        const route = routeElement ? parseSingleRouteFromXML(routeElement) : null;
        
        return { 
          success: true, 
          message: message,
          createdBy: createdBy,
          route: route
        };
      }
      return { success: true, message: 'Маршрут успешно создан' };
    } else if (response.status === 404) {
      throw new Error('Одна или обе локации не найдены в системе');
    } else if (response.status === 400) {
      throw new Error('Некорректные параметры запроса (дистанция должна быть > 1 или ID совпадают)');
    } else if (response.status === 409) {
      throw new Error('Маршрут между указанными локациями уже существует');
    } else {
      throw new Error(`Ошибка сервера: статус ${response.status}`);
    }
  } catch (error) {
    console.error('Ошибка в addRouteBetween:', error);
    if (error.code === 'ERR_NETWORK' || error.message.includes('CORS')) {
      // Fallback: создаем через основной сервис если навигатор недоступен
      return await createRouteViaPrimaryService(idFrom, idTo, distance);
    }
    throw handleApiError(error, 'Не удалось добавить маршрут в навигатор');
  }
},
findRoutesBetween: async (idFrom, idTo, orderBy = 'distance') => {
  try {
    console.log('🔄 Поиск маршрутов между локациями:', { idFrom, idTo, orderBy });
    
    // ПРАВИЛЬНЫЙ ENDPOINT согласно логам сервера
    const correctEndpoint = `/navigator/routes/${idFrom}/${idTo}/${orderBy}`;
    console.log('Используем endpoint:', correctEndpoint);
    
    const response = await secondaryApi.get(correctEndpoint, {
      validateStatus: null,
      headers: {
        'Accept': 'application/xml'
      }
    });
    
    
    let result;
    
    if (response.status === 200) {
      // Успешный ответ
      if (typeof response.data === 'string' && response.data.includes('<?xml')) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(response.data, "text/xml");
        
        // Проверим на ошибки парсинга
        const parseError = xmlDoc.getElementsByTagName('parsererror');
        if (parseError.length > 0) {
          console.error('❌ Ошибка парсинга XML:', parseError[0].textContent);
          throw new Error('Ошибка парсинга XML ответа от навигатора');
        }
        
        console.log('📊 XML структура:', {
          root: xmlDoc.documentElement.tagName,
          routes: xmlDoc.getElementsByTagName('route').length
        });
        
        // Парсим маршруты
        const routeElements = xmlDoc.getElementsByTagName('route');
        const routes = [];
        
        for (let i = 0; i < routeElements.length; i++) {
          const routeData = parseSingleRouteFromXML(routeElements[i]);
          console.log(`Маршрут ${i}:`, routeData);
          if (routeData) routes.push(routeData);
        }
        
        result = {
          routes: routes,
          fromLocationId: parseInt(idFrom),
          toLocationId: parseInt(idTo),
          sortedBy: orderBy,
          totalFound: routes.length,
          totalElements: routes.length,
          searchTimestamp: new Date().toISOString()
        };
      } else {
        result = response.data;
      }
    } else if (response.status === 404) {
      // Маршруты не найдены - это нормальная ситуация
      console.log('ℹ️ Маршруты между локациями не найдены (404)');
      result = {
        routes: [],
        fromLocationId: parseInt(idFrom),
        toLocationId: parseInt(idTo),
        sortedBy: orderBy,
        totalFound: 0,
        totalElements: 0,
        searchTimestamp: new Date().toISOString()
      };
    } else {
      // Другие ошибки
      let errorMessage = `Ошибка сервера: статус ${response.status}`;
      
      if (typeof response.data === 'string' && response.data.includes('<?xml')) {
        try {
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(response.data, "text/xml");
          const message = xmlDoc.getElementsByTagName('message')[0]?.textContent;
          if (message) errorMessage = message;
          
          // Детали ошибки
          const details = xmlDoc.getElementsByTagName('detail');
          const detailMessages = [];
          for (let i = 0; i < details.length; i++) {
            detailMessages.push(details[i].textContent);
          }
          if (detailMessages.length > 0) {
            errorMessage += ': ' + detailMessages.join(', ');
          }
        } catch (e) {
          console.error('Ошибка парсинга ошибки:', e);
        }
      }
      
      throw new Error(errorMessage);
    }
    
    console.log('✅ Финальный результат поиска:', result);
    return result;
    
  } catch (error) {
    console.error('❌ Ошибка в findRoutesBetween:', error);
    
    if (error.code === 'ERR_NETWORK' || error.message.includes('CORS')) {
      throw new Error('Навигатор недоступен. Проверьте подключение к сервису на порту 18081');
    }
    
    throw handleApiError(error, 'Не удалось найти маршруты между точками');
  }
}
}