import AnnotatePage from './pages/annotate';
import { Toaster } from 'sonner';

function App() {
  return (
    <div className="min-h-screen bg-slate-50">
      <AnnotatePage />
      <Toaster />
    </div>
  );
}

export default App;
