import React, { useState, Component } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import { ThemeProvider, useTheme } from './context/ThemeContext';

// React Icons
import {
  FiHome, FiFileText, FiPlusCircle, FiLayers, FiMessageSquare,
  FiBarChart2, FiSettings, FiList, FiTarget, FiBook,
  FiMenu, FiX, FiSun, FiMoon, FiHelpCircle
} from 'react-icons/fi';

// Pages
import Dashboard from './pages/Dashboard';
import ItemRequests from './pages/ItemRequests';
import ItemCreate from './pages/ItemCreate';
import ItemSets from './pages/ItemSets';
import Prompts from './pages/Prompts';
import Charts from './pages/Charts';
import Config from './pages/Config';
import Logs from './pages/Logs';
import Quality from './pages/Quality';
import Library from './pages/Library';

/**
 * Error Boundary 컴포넌트
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center" style={{ minHeight: '100vh', padding: '40px', background: 'var(--background)' }}>
          <div className="card" style={{ maxWidth: '600px', textAlign: 'center' }}>
            <h2 className="text-danger mb-4">오류가 발생했습니다</h2>
            <p className="text-secondary mb-4" style={{ lineHeight: '1.6' }}>
              애플리케이션에서 예상치 못한 오류가 발생했습니다.
              페이지를 새로고침하거나, 문제가 지속되면 관리자에게 문의하세요.
            </p>
            {this.state.error && (
              <details className="alert alert-error mb-4" style={{ textAlign: 'left' }}>
                <summary style={{ cursor: 'pointer', fontWeight: '600' }}>
                  오류 상세 정보
                </summary>
                <pre style={{ marginTop: '12px', fontSize: '0.85rem', overflow: 'auto', whiteSpace: 'pre-wrap' }}>
                  {this.state.error.toString()}
                  {this.state.errorInfo && this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
            <button className="btn btn-primary" onClick={this.handleReload}>
              페이지 새로고침
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * Navigation items
 */
const navItems = [
  { path: '/', icon: FiHome, label: '대시보드', end: true },
  { path: '/items', icon: FiFileText, label: '문항 요청' },
  { path: '/items/create', icon: FiPlusCircle, label: '새 문항 생성' },
  { path: '/sets', icon: FiLayers, label: '세트 문항' },
  { path: '/prompts', icon: FiMessageSquare, label: '프롬프트 관리' },
  { path: '/charts', icon: FiBarChart2, label: '차트 데이터' },
  { path: '/config', icon: FiSettings, label: '설정' },
  { path: '/logs', icon: FiList, label: '로그' },
  { path: '/quality', icon: FiTarget, label: '품질 대시보드' },
  { path: '/library', icon: FiBook, label: '라이브러리' },
];

/**
 * Theme Toggle Button
 */
function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
    >
      {theme === 'dark' ? <FiSun /> : <FiMoon />}
    </button>
  );
}

/**
 * Sidebar Component
 */
function Sidebar({ isOpen, onClose }) {
  const [showUserGuide, setShowUserGuide] = useState(false);

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={`sidebar-overlay ${isOpen ? 'show' : ''}`}
        onClick={onClose}
      />

      {/* Sidebar */}
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h1>
            <FiFileText className="nav-icon" />
            수능문항생성시스템
          </h1>
          <p style={{ fontSize: '0.7em', opacity: 0.7, margin: 0 }}>
            CSAT Item Generator
          </p>
        </div>

        <nav>
          <ul className="sidebar-nav">
            {navItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  end={item.end}
                  className={({ isActive }) => isActive ? 'active' : ''}
                  onClick={onClose}
                >
                  <item.icon className="nav-icon" />
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Bottom section */}
        <div style={{ marginTop: 'auto', padding: '16px', borderTop: '1px solid var(--border-color)' }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-secondary">테마</span>
            <ThemeToggle />
          </div>

          <button
            onClick={() => setShowUserGuide(true)}
            className="btn btn-primary w-full"
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none'
            }}
          >
            <FiHelpCircle />
            사용자 설명서
          </button>
        </div>
      </aside>

      {/* User Guide Modal */}
      {showUserGuide && <UserGuideModal onClose={() => setShowUserGuide(false)} />}
    </>
  );
}

/**
 * User Guide Modal
 */
function UserGuideModal({ onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header" style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white'
        }}>
          <h3><FiBook style={{ marginRight: '8px' }} /> 수능 문항 생성기 사용자 설명서</h3>
          <button className="modal-close" onClick={onClose} style={{ color: 'white' }}>
            <FiX />
          </button>
        </div>

        <div className="modal-body">
          {/* 시스템 개요 */}
          <section className="mb-5">
            <h4 className="text-info mb-3" style={{ borderBottom: '2px solid var(--info-color)', paddingBottom: '8px' }}>
              <FiTarget style={{ marginRight: '8px' }} />
              시스템 개요
            </h4>
            <p style={{ lineHeight: '1.8' }}>
              이 시스템은 <strong>수능 영어 문항을 자동으로 생성</strong>하고,
              <strong>3겹 검증 시스템</strong>으로 품질을 관리하며,
              <strong>프롬프트 최적화</strong>를 통해 지속적으로 품질을 개선하는 통합 플랫폼입니다.
            </p>
            <div className="stats-grid mt-4">
              <div className="stat-card">
                <div className="stat-icon primary"><FiMessageSquare /></div>
                <div className="stat-content">
                  <div className="font-semibold">프롬프트 관리</div>
                  <div className="text-sm text-secondary">입력, 편집, 버전 관리</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon success"><FiPlusCircle /></div>
                <div className="stat-content">
                  <div className="font-semibold">문항 생성</div>
                  <div className="text-sm text-secondary">AI 기반 자동 생성</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon warning"><FiBarChart2 /></div>
                <div className="stat-content">
                  <div className="font-semibold">품질 검증</div>
                  <div className="text-sm text-secondary">3겹 메트릭스 평가</div>
                </div>
              </div>
            </div>
          </section>

          {/* 프롬프트 키 규칙 */}
          <section className="mb-5">
            <h4 className="text-success mb-3" style={{ borderBottom: '2px solid var(--success-color)', paddingBottom: '8px' }}>
              <FiFileText style={{ marginRight: '8px' }} />
              프롬프트 키 규칙
            </h4>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>키 패턴</th>
                    <th>용도</th>
                    <th>예시</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td>MASTER_PROMPT</td><td>마스터 시스템 프롬프트</td><td>전체 문항 생성 지침</td></tr>
                  <tr><td>LC16, LC17</td><td>듣기 문항 프롬프트</td><td>듣기 세트 생성</td></tr>
                  <tr><td>RC18 ~ RC45</td><td>독해 문항 프롬프트</td><td>RC29 어법 문항</td></tr>
                  <tr><td>P1 ~ P45</td><td>지문 생성 프롬프트</td><td>P31 빈칸 지문</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* 등급 기준 */}
          <section className="mb-5">
            <h4 className="text-danger mb-3" style={{ borderBottom: '2px solid var(--error-color)', paddingBottom: '8px' }}>
              <FiTarget style={{ marginRight: '8px' }} />
              품질 등급 기준
            </h4>
            <div className="flex gap-2 flex-wrap">
              <span className="badge badge-success badge-lg">A: 90-100 (APPROVE)</span>
              <span className="badge badge-success badge-lg">B: 80-89 (APPROVE)</span>
              <span className="badge badge-warning badge-lg">C: 70-79 (REVIEW)</span>
              <span className="badge badge-warning badge-lg">D: 60-69 (REVIEW)</span>
              <span className="badge badge-danger badge-lg">F: 60 미만 (REJECT)</span>
            </div>
          </section>

          <div className="text-center text-secondary text-sm" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
            <p>자세한 내용은 <strong>docs/user-guide.md</strong> 파일을 참조하세요.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Main App Component
 */
function AppContent() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <Router>
      <div className="app-container">
        {/* Mobile menu toggle */}
        <button
          className="mobile-menu-toggle"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label={sidebarOpen ? '메뉴 닫기' : '메뉴 열기'}
        >
          {sidebarOpen ? <FiX /> : <FiMenu />}
        </button>

        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

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
            <Route path="/quality" element={<Quality />} />
            <Route path="/library" element={<Library />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

/**
 * App with providers
 */
function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

/**
 * ErrorBoundary로 감싼 App 컴포넌트
 */
function AppWithErrorBoundary() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}

export default AppWithErrorBoundary;
