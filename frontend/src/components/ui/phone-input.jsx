import React, {useState, useEffect} from "react";
import {Input} from "./input";

/**
 * PhoneInput Component - WhatsApp Format
 * Display Format: 0812-3456-7890 (with dashes for readability)
 * Backend Format: 628123456789 (raw number without dashes)
 *
 * Features:
 * - Auto-format dengan dash separator
 * - Auto-convert 08xx ke 628xx untuk WhatsApp
 * - Real-time formatting
 * - Paste support
 */
export const PhoneInput = ({value, onChange, placeholder, required, disabled, className, ...props}) => {
    const [displayValue, setDisplayValue] = useState("");

    // Format phone number with dashes: 0812-3456-7890
    const formatPhone = num => {
        if (!num) return "";

        // Remove all non-digits
        const digits = num.replace(/\D/g, "");

        // Handle 628xxx format (convert to 08xxx for display)
        let displayDigits = digits;
        if (digits.startsWith("62")) {
            displayDigits = "0" + digits.substring(2);
        }

        // Format: 0812-3456-7890
        if (displayDigits.length <= 4) {
            return displayDigits;
        } else if (displayDigits.length <= 8) {
            return `${displayDigits.slice(0, 4)}-${displayDigits.slice(4)}`;
        } else {
            return `${displayDigits.slice(0, 4)}-${displayDigits.slice(4, 8)}-${displayDigits.slice(8, 12)}`;
        }
    };

    // Parse display value back to WhatsApp format (628xxx)
    const parsePhone = str => {
        if (!str) return "";

        // Remove all non-digits
        const digits = str.replace(/\D/g, "");

        if (!digits) return "";

        // Convert 08xxx to 628xxx (WhatsApp format)
        if (digits.startsWith("0")) {
            return "62" + digits.substring(1);
        }

        // If already 628xxx, return as is
        if (digits.startsWith("62")) {
            return digits;
        }

        // If starts with 8, add 62 prefix
        if (digits.startsWith("8")) {
            return "62" + digits;
        }

        return digits;
    };

    // Initialize display value when prop value changes
    useEffect(() => {
        if (value) {
            setDisplayValue(formatPhone(value));
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

        // Parse to WhatsApp format
        const rawValue = parsePhone(inputValue);

        // Update display with formatted value
        if (rawValue) {
            const formatted = formatPhone(rawValue);
            setDisplayValue(formatted);
            // Send raw WhatsApp format to parent (628xxx)
            onChange(rawValue);
        }
    };

    const handleBlur = () => {
        // Ensure proper formatting on blur
        if (displayValue) {
            const rawValue = parsePhone(displayValue);
            if (rawValue) {
                setDisplayValue(formatPhone(rawValue));
            }
        }
    };

    const handleKeyDown = e => {
        // Allow: backspace, delete, tab, escape, enter
        if (
            [8, 9, 27, 13, 46].indexOf(e.keyCode) !== -1 ||
            // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
            (e.keyCode === 65 && e.ctrlKey === true) ||
            (e.keyCode === 67 && e.ctrlKey === true) ||
            (e.keyCode === 86 && e.ctrlKey === true) ||
            (e.keyCode === 88 && e.ctrlKey === true) ||
            // Allow: home, end, left, right
            (e.keyCode >= 35 && e.keyCode <= 39)
        ) {
            return;
        }
        // Ensure that it is a number and stop the keypress if not
        if ((e.shiftKey || e.keyCode < 48 || e.keyCode > 57) && (e.keyCode < 96 || e.keyCode > 105)) {
            e.preventDefault();
        }
    };

    return (
        <div className="relative">
            <Input
                {...props}
                type="text"
                value={displayValue}
                onChange={handleChange}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                placeholder={placeholder || "0812-3456-7890"}
                required={required}
                disabled={disabled}
                className={className}
                autoComplete="tel"
                inputMode="numeric"
                maxLength={16} // 0812-3456-7890 = 16 chars with dashes
            />
            <div className="mt-1 text-xs text-slate-500">Format WhatsApp: 08xx akan otomatis dikonversi ke 628xx</div>
        </div>
    );
};

/**
 * Helper function to format phone for display (read-only)
 */
export const formatPhoneDisplay = value => {
    if (!value) return "-";

    const digits = value.replace(/\D/g, "");
    let displayDigits = digits;

    if (digits.startsWith("62")) {
        displayDigits = "0" + digits.substring(2);
    }

    if (displayDigits.length <= 4) {
        return displayDigits;
    } else if (displayDigits.length <= 8) {
        return `${displayDigits.slice(0, 4)}-${displayDigits.slice(4)}`;
    } else {
        return `${displayDigits.slice(0, 4)}-${displayDigits.slice(4, 8)}-${displayDigits.slice(8, 12)}`;
    }
};

export default PhoneInput;
