import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import SelfTraining from './pages/SelfTraining';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/training" element={<SelfTraining />} />
        {/* Add other routes here */}
      </Routes>
    </Router>
  );
}

export default App; 