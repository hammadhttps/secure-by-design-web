import { useState, useEffect } from 'react';
import { checkPasswordStrength } from '../utils/security';

const PasswordStrengthMeter = ({ password }) => {
  const [strength, setStrength] = useState({ score: 0, strength: 'Weak', feedback: [] });

  useEffect(() => {
    if (password) {
      setStrength(checkPasswordStrength(password));
    } else {
      setStrength({ score: 0, strength: 'Weak', feedback: [] });
    }
  }, [password]);

  const getColor = () => {
    switch (strength.strength) {
      case 'Weak': return 'bg-red-500';
      case 'Medium': return 'bg-yellow-500';
      case 'Strong': return 'bg-green-500';
      default: return 'bg-gray-300';
    }
  };

  const getWidth = () => {
    return `${(strength.score / 5) * 100}%`;
  };

  return (
    <div className="mt-2">
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className={`h-full ${getColor()} transition-all duration-300`}
          style={{ width: getWidth() }}
        />
      </div>
      <div className="mt-1 text-sm text-gray-600">
        <span>Strength: </span>
        <span className={`font-semibold ${
          strength.strength === 'Weak' ? 'text-red-600' :
          strength.strength === 'Medium' ? 'text-yellow-600' :
          'text-green-600'
        }`}>
          {strength.strength}
        </span>
        {strength.feedback.length > 0 && (
          <ul className="mt-1 text-xs text-gray-500 list-disc list-inside">
            {strength.feedback.slice(0, 2).map((tip, index) => (
              <li key={index}>{tip}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default PasswordStrengthMeter;