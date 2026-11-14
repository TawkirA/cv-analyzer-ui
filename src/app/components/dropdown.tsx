"use client"

import { useState } from "react";

interface DropdownProps {
    options: string[],
    defaultVal: string,
    onChange?: (value: string) => void
}

export default function Dropdown({ defaultVal, options, onChange }: DropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedOption, setSelectedOption] = useState(defaultVal);

    // const options = options;

    const handleSelect = (option: string) => {
        setSelectedOption(option);
        onChange?.(option);
        setIsOpen(false);
    }

    return (
        <div className="relative inline-block text-left">
           <button
            className="w-60 inline-flex shrink-0 justify-center items-center gap-x-1.5 rounded-md bg-white !px-3 !py-1 text-md font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 transition"
            onClick={() => setIsOpen(!isOpen)}
           >
                {/* Dynamic Text reflecting the state */}
                <span className={selectedOption === "Select an Option" ? "text-gray-400" : "text-gray-900"}>
                    {selectedOption}
                </span>
                {/* Down Arrow Icon */}
                <svg className="-mr-1 h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                </svg>
           </button> 

            {/* drop down items */}

            {isOpen && (
                <div className="absolute right-0 z-50 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none divide-y divide-gray-100">
                    <div className="py-1">
                        {options.map((option: string) => (
                            <button
                                key={option}
                                onClick={() => handleSelect(option)}
                                className={`block w-full text-left px-4 py-2.5 text-sm transition ${
                                    selectedOption === option
                                    ? "bg-blue-50 text-blue-600 font-semibold"
                                    : "text-gray-700 hover:bg-gray-100"
                                }`}
                            >
                                {option}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
