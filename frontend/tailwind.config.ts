import type { Config } from 'tailwindcss';
import forms from '@tailwindcss/forms';
import containerQueries from '@tailwindcss/container-queries';

export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	darkMode: 'class',
	theme: {
		extend: {
			colors: {
				'on-primary-fixed-variant': '#2f2ebe',
				'error-container': '#ffdad6',
				'on-surface-variant': '#464554',
				surface: '#f7f9fb',
				'surface-container': '#eceef0',
				'primary-fixed-dim': '#c0c1ff',
				'surface-container-low': '#f2f4f6',
				'on-primary-container': '#fffbff',
				outline: '#767586',
				'inverse-on-surface': '#eff1f3',
				'on-tertiary': '#ffffff',
				'surface-bright': '#f7f9fb',
				'secondary-container': '#2170e4',
				'inverse-surface': '#2d3133',
				'surface-container-highest': '#e0e3e5',
				'secondary-fixed': '#d8e2ff',
				'primary-fixed': '#e1e0ff',
				'on-tertiary-fixed-variant': '#3f465c',
				secondary: '#0058be',
				'surface-container-high': '#e6e8ea',
				'inverse-primary': '#c0c1ff',
				'tertiary-container': '#6c748b',
				'surface-variant': '#e0e3e5',
				error: '#ba1a1a',
				'secondary-fixed-dim': '#adc6ff',
				'on-secondary-container': '#fefcff',
				primary: '#4648d4',
				'primary-container': '#6063ee',
				'on-error': '#ffffff',
				'on-error-container': '#93000a',
				'on-primary': '#ffffff',
				'on-secondary-fixed': '#001a42',
				'surface-container-lowest': '#ffffff',
				'surface-tint': '#494bd6',
				'surface-dim': '#d8dadc',
				'outline-variant': '#c7c4d7',
				'tertiary-fixed': '#dae2fd',
				'on-tertiary-container': '#fefcff',
				'on-tertiary-fixed': '#131b2e',
				'tertiary-fixed-dim': '#bec6e0',
				'on-background': '#191c1e',
				'on-primary-fixed': '#07006c',
				'on-surface': '#191c1e',
				background: '#f7f9fb',
				'on-secondary-fixed-variant': '#004395',
				'on-secondary': '#ffffff',
				tertiary: '#545c72'
			},
			borderRadius: {
				DEFAULT: '0.25rem',
				lg: '0.5rem',
				xl: '0.75rem',
				full: '9999px'
			},
			spacing: {
				lg: '40px',
				base: '8px',
				xl: '64px',
				gutter: '24px',
				'margin-desktop': '32px',
				xs: '4px',
				'margin-mobile': '16px',
				sm: '12px',
				md: '24px'
			},
			fontFamily: {
				'headline-md': ['Plus Jakarta Sans', 'sans-serif'],
				'headline-lg': ['Plus Jakarta Sans', 'sans-serif'],
				'label-sm': ['Inter', 'sans-serif'],
				'headline-lg-mobile': ['Plus Jakarta Sans', 'sans-serif'],
				'display-lg': ['Plus Jakarta Sans', 'sans-serif'],
				'body-lg': ['Inter', 'sans-serif'],
				'body-sm': ['Inter', 'sans-serif'],
				'body-md': ['Inter', 'sans-serif'],
				'label-md': ['Inter', 'sans-serif']
			},
			fontSize: {
				'headline-md': ['24px', { lineHeight: '32px', fontWeight: '600' }],
				'headline-lg': ['32px', { lineHeight: '40px', letterSpacing: '-0.01em', fontWeight: '700' }],
				'label-sm': ['12px', { lineHeight: '14px', fontWeight: '500' }],
				'headline-lg-mobile': ['24px', { lineHeight: '32px', fontWeight: '700' }],
				'display-lg': ['48px', { lineHeight: '56px', letterSpacing: '-0.02em', fontWeight: '700' }],
				'body-lg': ['18px', { lineHeight: '28px', fontWeight: '400' }],
				'body-sm': ['14px', { lineHeight: '20px', fontWeight: '400' }],
				'body-md': ['16px', { lineHeight: '24px', fontWeight: '400' }],
				'label-md': ['14px', { lineHeight: '16px', letterSpacing: '0.02em', fontWeight: '600' }]
			}
		}
	},
	plugins: [forms, containerQueries]
} satisfies Config;
