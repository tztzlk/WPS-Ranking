import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { ProfilePage } from './pages/ProfilePage';
import { ComparePage } from './pages/ComparePage';
import { AboutPage } from './pages/AboutPage';
import { SearchPage } from './pages/SearchPage';
import { Layout } from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: <HomePage />
      },
      {
        path: 'leaderboard',
        element: <LeaderboardPage />
      },
      {
        path: 'profile/:wcaId',
        element: <ProfilePage />
      },
      {
        path: 'compare',
        element: <ComparePage />
      },
      {
        path: 'about',
        element: <AboutPage />
      },
      {
        path: 'search',
        element: <SearchPage />
      }
    ]
  }
]);

function App() {
  return (
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
  );
}

export default App;
