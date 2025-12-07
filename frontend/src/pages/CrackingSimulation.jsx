// src/pages/CrackingSimulation.jsx
import { useState } from 'react';
import { simulateCracking } from '../utils/crackingSimulator';

const CrackingSimulation = () => {
  const [results, setResults] = useState(null);
  
  const runSimulation = async (hash, attackType) => {
    const result = await simulateCracking(hash, attackType);
    setResults(result);
  };
  
  return (
    <div>
      <h2>Password Cracking Simulation</h2>
      <div className="attack-options">
        <button onClick={() => runSimulation(hash, 'dictionary')}>
          Dictionary Attack
        </button>
        <button onClick={() => runSimulation(hash, 'bruteforce')}>
          Brute Force (6 chars)
        </button>
        <button onClick={() => runSimulation(hash, 'hybrid')}>
          Hybrid Attack
        </button>
      </div>
      
      {results && (
        <div className="results">
          <h3>Results</h3>
          <p>Attack Type: {results.attackType}</p>
          <p>Time Taken: {results.timeTaken}ms</p>
          <p>Attempts: {results.attempts}</p>
          <p>Success: {results.success ? 'Yes' : 'No'}</p>
        </div>
      )}
    </div>
  );
};