import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        display: ["'Google Sans'", "system-ui", "sans-serif"],
        body: ["'Google Sans Text'", "'Google Sans'", "system-ui", "sans-serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        tertiary: {
          DEFAULT: "hsl(var(--tertiary))",
          foreground: "hsl(var(--tertiary-foreground))",
        },
        surface: {
          DEFAULT: "hsl(var(--surface))",
          variant: "hsl(var(--surface-variant))",
        },
        "on-surface-variant": "hsl(var(--on-surface-variant))",
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        xl: "var(--radius-xl)",
        lg: "var(--radius)",
        md: "var(--radius-sm)",
        sm: "calc(var(--radius-sm) - 2px)",
      },
      transitionTimingFunction: {
        // Industry-standard easing curves
        "emphasized": "cubic-bezier(0.2, 0, 0, 1)",          // M3 emphasized
        "emphasized-decel": "cubic-bezier(0.05, 0.7, 0.1, 1)",
        "emphasized-accel": "cubic-bezier(0.3, 0, 0.8, 0.15)",
        "standard": "cubic-bezier(0.2, 0, 0, 1)",
        "spring": "cubic-bezier(0.34, 1.56, 0.64, 1)",       // gentle overshoot
        "ios": "cubic-bezier(0.32, 0.72, 0, 1)",             // Apple system
      },
      transitionDuration: {
        "250": "250ms",
        "350": "350ms",
        "400": "400ms",
        "600": "600ms",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0", opacity: "0" },
          to: { height: "var(--radix-accordion-content-height)", opacity: "1" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)", opacity: "1" },
          to: { height: "0", opacity: "0" },
        },
        "slide-up": {
          from: { transform: "translateY(100%)" },
          to: { transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-out": {
          "0%": { opacity: "1", transform: "translateY(0)" },
          "100%": { opacity: "0", transform: "translateY(8px)" },
        },
        "scale-in": {
          "0%": { transform: "scale(0.96)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "scale-out": {
          "0%": { transform: "scale(1)", opacity: "1" },
          "100%": { transform: "scale(0.96)", opacity: "0" },
        },
        "slide-in-right": {
          "0%": { transform: "translateX(8px)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        "shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "ripple": {
          "0%": { transform: "scale(0)", opacity: "0.5" },
          "100%": { transform: "scale(4)", opacity: "0" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 280ms cubic-bezier(0.2, 0, 0, 1)",
        "accordion-up": "accordion-up 240ms cubic-bezier(0.2, 0, 0, 1)",
        "slide-up": "slide-up 500ms cubic-bezier(0.05, 0.7, 0.1, 1)",
        "fade-in": "fade-in 320ms cubic-bezier(0.2, 0, 0, 1)",
        "fade-out": "fade-out 220ms cubic-bezier(0.3, 0, 0.8, 0.15)",
        "scale-in": "scale-in 240ms cubic-bezier(0.2, 0, 0, 1)",
        "scale-out": "scale-out 180ms cubic-bezier(0.3, 0, 0.8, 0.15)",
        "slide-in-right": "slide-in-right 320ms cubic-bezier(0.2, 0, 0, 1)",
        "shimmer": "shimmer 2s linear infinite",
        "ripple": "ripple 600ms cubic-bezier(0.2, 0, 0, 1)",
        "pulse-soft": "pulse-soft 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "enter": "fade-in 320ms cubic-bezier(0.2, 0, 0, 1), scale-in 240ms cubic-bezier(0.2, 0, 0, 1)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
