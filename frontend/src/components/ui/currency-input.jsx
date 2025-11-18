import React, {useState, useEffect} from "react";
import {Input} from "./input";

/**
 * CurrencyInput Component
 * Format: Rp 1.000.000 (Indonesian Rupiah with dots)
 * Backend receives raw number: 1000000
 */
export const CurrencyInput = ({value, onChange, placeholder, required, min, ...props}) => {
    const [displayValue, setDisplayValue] = useState("");

    // Format number to Indonesian Rupiah display (with dots)
    const formatCurrency = num => {
        if (!num && num !== 0) return "";
        const number = typeof num === "string" ? parseFloat(num) : num;
        return number.toLocaleString("id-ID");
    };

    // Parse display value back to raw number
    const parseCurrency = str => {
        if (!str) return "";
        // Remove all non-digit characters except decimal
        const cleaned = str.replace(/[^0-9]/g, "");
        return cleaned ? parseInt(cleaned, 10) : "";
    };

    // Initialize display value when prop value changes
    useEffect(() => {
        if (value !== undefined && value !== null && value !== "") {
            setDisplayValue(formatCurrency(value));
        } else {
            setDisplayValue("");
        }
    }, [value]);

    const handleChange = e => {
        const inputValue = e.target.value;

        // Allow empty input
        if (inputValue === "") {
            setDisplayValue("");
            onChange("");
            return;
        }

        // Parse to number
        const rawValue = parseCurrency(inputValue);

        // Update display with formatted value
        if (rawValue !== "") {
            setDisplayValue(formatCurrency(rawValue));
            // Send raw number to parent
            onChange(rawValue);
        }
    };

    const handleBlur = () => {
        // Ensure proper formatting on blur
        if (displayValue) {
            const rawValue = parseCurrency(displayValue);
            if (rawValue !== "") {
                setDisplayValue(formatCurrency(rawValue));
            }
        }
    };

    return (
        <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-600 font-semibold">Rp</span>
            <Input
                {...props}
                type="text"
                value={displayValue}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder={placeholder || "0"}
                required={required}
                className="pl-10"
                autoComplete="off"
            />
        </div>
    );
};

/**
 * Helper function to format currency for display only (read-only)
 */
export const formatRupiah = value => {
    if (!value && value !== 0) return "Rp 0";
    const number = typeof value === "string" ? parseFloat(value) : value;
    return `Rp ${number.toLocaleString("id-ID")}`;
};

export default CurrencyInput;
