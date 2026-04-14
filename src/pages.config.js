import Community from './pages/Community';
import Diagnostics from './pages/Diagnostics';
import PartsCatalog from './pages/PartsCatalog';
import PoliciesPage from './pages/PoliciesPage';
import Profile from './pages/Profile';
import Reports from './pages/Reports';
import ServiceFinder from './pages/ServiceFinder';
import AdminDashboard from './pages/AdminDashboard';
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
