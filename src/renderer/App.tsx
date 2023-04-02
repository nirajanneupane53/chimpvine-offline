import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import React from 'react';

import Home from './screens/Home/Home';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

import Subject from './screens/subject/Subject';
import Content from './screens/content/Content';

function Main() {
  return (
    <div className="container">
      <div className="text-center my-5">
        <img
          src={require('../../assets/images/logo.png')}
          alt="Logo"
          width="50%"
        />
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
        <Route path="/subject/:subID/:contentID" element={<Content />} />
      </Routes>
    </Router>
  );
}
