import React from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import ItemRequests from './pages/ItemRequests';
import ItemCreate from './pages/ItemCreate';
import ItemSets from './pages/ItemSets';
import Prompts from './pages/Prompts';
import Charts from './pages/Charts';
import Config from './pages/Config';
import Logs from './pages/Logs';

function App() {
  return (
    <Router>
      <div className="app-container">
        <aside className="sidebar">
          <div className="sidebar-header">
            <h1>📝 수능문항생성-검증-개선 시스템</h1>
            <p style={{fontSize: '0.7em', opacity: 0.7, margin: 0}}>(origin: google appscript-mj)</p>
          </div>
          <nav>
            <ul className="sidebar-nav">
              <li>
                <NavLink to="/" end className={({ isActive }) => isActive ? 'active' : ''}>
                  📊 대시보드
                </NavLink>
              </li>
              <li>
                <NavLink to="/items" className={({ isActive }) => isActive ? 'active' : ''}>
                  📋 문항 요청
                </NavLink>
              </li>
              <li>
                <NavLink to="/items/create" className={({ isActive }) => isActive ? 'active' : ''}>
                  ➕ 새 문항 생성
                </NavLink>
              </li>
              <li>
                <NavLink to="/sets" className={({ isActive }) => isActive ? 'active' : ''}>
                  📚 세트 문항
                </NavLink>
              </li>
              <li>
                <NavLink to="/prompts" className={({ isActive }) => isActive ? 'active' : ''}>
                  💬 프롬프트 관리
                </NavLink>
              </li>
              <li>
                <NavLink to="/charts" className={({ isActive }) => isActive ? 'active' : ''}>
                  📈 차트 데이터
                </NavLink>
              </li>
              <li>
                <NavLink to="/config" className={({ isActive }) => isActive ? 'active' : ''}>
                  ⚙️ 설정
                </NavLink>
              </li>
              <li>
                <NavLink to="/logs" className={({ isActive }) => isActive ? 'active' : ''}>
                  📜 로그
                </NavLink>
              </li>
            </ul>
          </nav>
        </aside>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/items" element={<ItemRequests />} />
            <Route path="/items/create" element={<ItemCreate />} />
            <Route path="/sets" element={<ItemSets />} />
            <Route path="/prompts" element={<Prompts />} />
            <Route path="/charts" element={<Charts />} />
            <Route path="/config" element={<Config />} />
            <Route path="/logs" element={<Logs />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
