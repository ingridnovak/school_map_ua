import { useState } from 'react';
import './App.css';
import DiscoveringUkraine from './components/DiscoveringUkraine';
import YourAdventures from './components/YourAdventures';
import PhotoGallery from './components/PhotoGallery';
import AboutSection from './components/AboutSection';

function App() {
  const [activeTab, setActiveTab] = useState('discovering');

  return (
    <div className="App">
      <div className="tabs-container">
        <button
          className={`tab-button ${activeTab === 'discovering' ? 'active' : ''}`}
          onClick={() => setActiveTab('discovering')}
        >
          Discovering Ukraine
        </button>
        <button
          className={`tab-button ${activeTab === 'adventures' ? 'active' : ''}`}
          onClick={() => setActiveTab('adventures')}
        >
          Your Adventures
        </button>
      </div>

      {activeTab === 'discovering' ? <DiscoveringUkraine /> : <YourAdventures />}

      <PhotoGallery />

      <AboutSection />
    </div>
  );
}

export default App;
