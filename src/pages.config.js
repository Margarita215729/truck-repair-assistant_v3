import { lazy } from 'react';

const Community = lazy(() => import('./pages/Community'));
const Diagnostics = lazy(() => import('./pages/Diagnostics'));
const PartsCatalog = lazy(() => import('./pages/PartsCatalog'));
const PoliciesPage = lazy(() => import('./pages/PoliciesPage'));
const Profile = lazy(() => import('./pages/Profile'));
const Reports = lazy(() => import('./pages/Reports'));
const ServiceFinder = lazy(() => import('./pages/ServiceFinder'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
import __Layout from './Layout.jsx';

export const PAGES = {
  "Community": Community,
  "Diagnostics": Diagnostics,
  "PartsCatalog": PartsCatalog,
  "Policies": PoliciesPage,
  "Profile": Profile,
  "Reports": Reports,
  "ServiceFinder": ServiceFinder,
  "Admin": AdminDashboard,
};

export const pagesConfig = {
  mainPage: "Diagnostics",
  Pages: PAGES,
  Layout: __Layout,
};
