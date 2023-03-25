import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';

import Home from './screens/Home/Home';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import logo from '../../assets/images/logo.png';
import Subject from './screens/subject/Subject';

function Main() {
  return (
    <div className="container">
      <div className="text-center my-5">
        <img src={logo} alt="Logo" width="50%" />
      </div>

      <Home />
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Main />} />
        <Route path="/subject/:subID" element={<Subject />} />
      </Routes>
    </Router>
  );
}
