import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { Layout } from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { RouteError } from './pages/RouteError';

// Home is in the main bundle; every other page is a separate chunk loaded on
// first visit. The router keeps the current page on screen while it loads.
const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        // Errors and unknown URLs render inside the layout, with the header and footer.
        errorElement: <RouteError />,
        children: [
          { index: true, element: <HomePage /> },
          { path: 'leaderboard', lazy: () => import('./pages/LeaderboardPage').then((m) => ({ Component: m.LeaderboardPage })) },
          { path: 'countries', lazy: () => import('./pages/CountriesPage').then((m) => ({ Component: m.CountriesPage })) },
          { path: 'profile/:wcaId', lazy: () => import('./pages/ProfilePage').then((m) => ({ Component: m.ProfilePage })) },
          { path: 'compare', lazy: () => import('./pages/ComparePage').then((m) => ({ Component: m.ComparePage })) },
          { path: 'about', lazy: () => import('./pages/AboutPage').then((m) => ({ Component: m.AboutPage })) },
          { path: 'legal', lazy: () => import('./pages/LegalPage').then((m) => ({ Component: m.LegalPage })) },
          { path: 'search', lazy: () => import('./pages/SearchPage').then((m) => ({ Component: m.SearchPage })) },
          {
            path: '*',
            loader: () => {
              throw new Response('Not found', { status: 404 });
            },
          },
        ],
      },
    ],
  },
]);

function App() {
  return (
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
  );
}

export default App;
