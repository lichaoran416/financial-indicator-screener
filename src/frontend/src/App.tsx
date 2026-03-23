import { Router, Route } from '@solidjs/router';
import { lazy, ParentComponent } from 'solid-js';

const ScreeningPage = lazy(() => import('./pages/ScreeningPage'));
const CompanyDetailPage = lazy(() => import('./pages/CompanyDetailPage'));
const HistoryPage = lazy(() => import('./pages/HistoryPage'));

function Header() {
  return (
    <header style={{ padding: '1rem', "background-color": '#f5f5f5' }}>
      <nav style={{ display: 'flex', gap: '1rem' }}>
        <a href="/">Screening</a>
        <a href="/history">History</a>
      </nav>
    </header>
  );
}

const Layout: ParentComponent = (props) => {
  return (
    <div>
      <Header />
      <main style={{ padding: '1rem' }}>
        {props.children}
      </main>
    </div>
  );
};

export default function App() {
  return (
    <Router root={Layout}>
      <Route path="/" component={ScreeningPage} />
      <Route path="/company/:code" component={CompanyDetailPage} />
      <Route path="/history" component={HistoryPage} />
    </Router>
  );
}
