import React, { useState } from 'react';
import DataTable from './components/DataTable';
import ItemForm from './components/ItemForm';
import ServiceStatus from './components/ServiceStatus';
import './App.css';
import RoutesAnalytics from './components/RoutesAnalytics';

function App() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleItemCreated = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Система управления маршрутами</h1>
        <p>Веб-клиент для работы с REST API сервисами</p>
      </header>

      <main className="App-main">
        <ServiceStatus />
        <section className="analytics-section">
        <RoutesAnalytics />
      </section>
        <section className="form-section">
          <ItemForm onItemCreated={handleItemCreated} />
        </section>

        <section className="table-section">
          <DataTable key={refreshTrigger} />
        </section>
      </main>

      <footer className="App-footer">
        <p>Лабораторная работа #1 - Веб-сервисы и клиентское приложение</p>
      </footer>
    </div>
  );
}

export default App;