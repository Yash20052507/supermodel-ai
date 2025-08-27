import React from 'react';

const Switch: React.FC<{ isChecked: boolean, onToggle: () => void, disabled?: boolean }> = ({ isChecked, onToggle, disabled }) => {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={isChecked}
            onClick={onToggle}
            disabled={disabled}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:ring-offset-slate-800 ${
              isChecked ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
            <span
                aria-hidden="true"
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    isChecked ? 'translate-x-5' : 'translate-x-0'
                }`}
            />
        </button>
    );
};

export default Switch;
