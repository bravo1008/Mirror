// src/App.jsx
import React from 'react';
import MagicMirror from './components/MagicMirror';
import MeteorRain from './components/MeteorRain'; // ✅ 引入
import AuroraBackground from './components/AuroraBackground';


function App() {
  return (
    <>
      <AuroraBackground />
       {/*<MeteorRain /> ✅ 放在最前面 */}
      <MagicMirror />
    </>
  );
}

export default App;