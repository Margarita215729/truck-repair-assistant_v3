import Community from './pages/Community';
import Diagnostics from './pages/Diagnostics';
import PartsCatalog from './pages/PartsCatalog';
import Profile from './pages/Profile';
import Reports from './pages/Reports';
import ServiceFinder from './pages/ServiceFinder';
import __Layout from './Layout.jsx';

export const PAGES = {
  "Community": Community,
  "Diagnostics": Diagnostics,
  "PartsCatalog": PartsCatalog,
  "Profile": Profile,
  "Reports": Reports,
  "ServiceFinder": ServiceFinder,
};

export const pagesConfig = {
  mainPage: "Diagnostics",
  Pages: PAGES,
  Layout: __Layout,
};
