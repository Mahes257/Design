import { createRoot } from 'react-dom/client';
import './index.css';
import './styles/layout.css';
import './styles/design-system.css';
import './styles/planning.css';
import './styles/project-create.css';
import './styles/concept.css';
import './styles/mechanical.css';
import './styles/analysis.css';
import './styles/attachments.css';
import './styles/simulation.css';
import './styles/manufacturing.css';
import './styles/bom.css';
import './styles/cad.css';
import './styles/approvals.css';
import './styles/transfers.css';
import './styles/reports.css';
import './styles/settings.css';
import './styles/workflow.css';
import './styles/customer-enquiry.css';
import './styles/enquiry-request.css';
import './styles/quotation-review.css';
import App from './App.jsx';
import { ThemeProvider } from './context/ThemeContext';

// Restore the stored theme before first paint (no flash of the wrong theme).
try {
  if (localStorage.getItem('md-theme') === 'dark') {
    document.documentElement.classList.add('dark');
  }
} catch {
  // storage unavailable — default to the light ERP theme
}

createRoot(document.getElementById('root')).render(
  <ThemeProvider>
    <App />
  </ThemeProvider>,
);
